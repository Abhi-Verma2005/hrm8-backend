/**
 * Lead Service
 * Handles lead creation, management, and conversion to companies
 */

import prisma from '../../lib/prisma';
import { LeadStatus, LeadSource, OpportunityType } from '@prisma/client';
import { AttributionService } from './AttributionService';
import { CompanyService } from '../company/CompanyService';
import { AuthService } from '../auth/AuthService';

export class LeadService {
  /**
   * Create a new lead
   */
  static async createLead(data: {
    companyName: string;
    email: string;
    country: string;
    website?: string;
    phone?: string;
    leadSource?: LeadSource;
    referredBy?: string; // Sales Agent ID
    createdBy?: string;
  }) {
    // Check for existing lead with same email
    const existingLead = await prisma.lead.findFirst({
      where: { email: data.email }
    });

    if (existingLead) {
      throw new Error(`Lead with email ${data.email} already exists`);
    }

    // Check if email is already registered as a company admin (optional but good practice)
    // For now, we focus on Lead duplication

    return await prisma.lead.create({
      data: {
        company_name: data.companyName,
        email: data.email,
        country: data.country,
        website: data.website,
        phone: data.phone,
        lead_source: data.leadSource || LeadSource.MANUAL_ENTRY,
        referred_by: data.referredBy,
        created_by: data.createdBy,
        status: LeadStatus.NEW,
        // Auto-assign if referred by an agent?
        assigned_consultant_id: data.referredBy, 
        assigned_at: data.referredBy ? new Date() : null,
      },
    });
  }

  /**
   * Get all leads for the logged-in agent
   */
  static async getLeadsByAgent(consultantId: string) {
    return await prisma.lead.findMany({
      where: {
        OR: [
          { referred_by: consultantId },
          { created_by: consultantId },
          { assigned_consultant_id: consultantId }
        ]
      },
      orderBy: { created_at: 'desc' },
      include: {
        consultant: {
          select: { id: true, first_name: true, last_name: true, email: true }
        },
        creator: {
          select: { id: true, first_name: true, last_name: true, email: true }
        },
        referrer: {
          select: { id: true, first_name: true, last_name: true, email: true }
        }
      }
    });
  }

  /**
   * Get all leads for a specific region (Manager/Licensee view)
   */
  static async getLeadsByRegion(regionId: string) {
    return await prisma.lead.findMany({
      where: {
        OR: [
          { region_id: regionId },
          { consultant: { region_id: regionId } }
        ]
      },
      orderBy: { created_at: 'desc' },
      include: {
        consultant: {
          select: { id: true, first_name: true, last_name: true, email: true }
        },
        creator: {
          select: { id: true, first_name: true, last_name: true, email: true }
        },
        referrer: {
          select: { id: true, first_name: true, last_name: true, email: true }
        }
      }
    });
  }

  /**
   * Get region details (helper for controller checks)
   */
  static async getRegionById(regionId: string) {
    return await prisma.region.findUnique({
      where: { id: regionId }
    });
  }

  /**
   * Reassign a lead to a new consultant
   */
  static async reassignLead(leadId: string, newConsultantId: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    if (lead.status === LeadStatus.CONVERTED) {
      throw new Error('Cannot reassign a converted lead');
    }

    return await prisma.lead.update({
      where: { id: leadId },
      data: {
        assigned_consultant_id: newConsultantId,
        assigned_at: new Date(),
      },
      include: {
        consultant: {
          select: { id: true, first_name: true, last_name: true }
        }
      }
    });
  }

  /**
   * Convert Lead to Company
   */
  static async convertLeadToCompany(
    leadId: string, 
    conversionData: {
      adminFirstName: string;
      adminLastName: string;
      password: string; // Temporary password for admin
      acceptTerms: boolean;
      email?: string; // Allow overriding email
      domain?: string; // Allow specifying domain explicitly
    }
  ) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new Error('Lead not found');
    }

    if (lead.converted_to_company_id) {
      throw new Error('Lead already converted');
    }

    // Prepare Registration Data
    // Use provided overrides or fallback to lead data
    const emailToUse = conversionData.email || lead.email;
    
    // Domain Handling
    // If domain is provided, we might want to ensure the website reflects it or just rely on CompanyService to extract it from email/website
    // CompanyService.registerCompany usually extracts domain from email if not enterprise flow.
    // However, if we want to enforce a specific domain (e.g. from the UI input), we should pass it or ensure website matches.
    // Let's assume registerCompany takes website/domain into account.
    // Ideally, we update the registration request to be explicit.
    
    const registrationRequest = {
      companyName: lead.company_name,
      // If domain is provided (e.g. "acme.com"), prepend https:// to make it a valid URL for the website field
      companyWebsite: conversionData.domain ? `https://${conversionData.domain}` : (lead.website || ''), 
      adminFirstName: conversionData.adminFirstName,
      adminLastName: conversionData.adminLastName,
      adminEmail: emailToUse,
      password: conversionData.password,
      countryOrRegion: lead.country,
      acceptTerms: conversionData.acceptTerms,
    };

    // Note: registerCompany throws if domain exists.
    const { company } = await CompanyService.registerCompany(
      registrationRequest,
      {
        skipDomainValidation: true,
        skipEmailVerification: true
      }
    );

    // Register company admin
    // Since we are skipping email verification for this flow, we activate the user immediately
    await AuthService.registerCompanyAdmin(
      company.id,
      emailToUse,
      `${conversionData.adminFirstName} ${conversionData.adminLastName}`,
      conversionData.password,
      true // activate immediately
    );

    // Update Lead
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: LeadStatus.CONVERTED,
        converted_to_company_id: company.id,
        converted_at: new Date(),
      },
    });

    // Assign Attribution if Lead had a referrer
    if (lead.referred_by) {
      console.log(`Attempting to assign agent ${lead.referred_by} to company ${company.id}`);
      const result = await AttributionService.assignAgentToCompany(company.id, lead.referred_by);
      if (!result.success) {
        console.error(`Failed to assign attribution: ${result.error}`);
      } else {
        console.log(`Successfully assigned agent ${lead.referred_by} to company ${company.id}`);
        
        // Also create an initial Opportunity for this company and agent
        // This ensures it shows up in the pipeline immediately
        await prisma.opportunity.create({
          data: {
            company_id: company.id,
            sales_agent_id: lead.referred_by,
            name: `${registrationRequest.companyName} - Initial Deal`,
            stage: 'NEW', // Default stage
            amount: 0, // Agent can update later
            probability: 10,
            // lead_source: 'outbound', // REMOVED: Field does not exist in OpportunityCreateInput
            type: OpportunityType.SUBSCRIPTION, // Default to Subscription
            expected_close_date: new Date(new Date().setMonth(new Date().getMonth() + 1)), // +1 month default
          }
        });
        console.log(`Created initial opportunity for company ${company.id}`);
      }
    } else {
      console.log('No referrer found for lead, skipping attribution');
    }

    return company;
  }
}
