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
    notes?: string;
  }) {
    // Check for existing lead with same email
    const existingLead = await prisma.lead.findFirst({
      where: { email: data.email }
    });

    if (existingLead) {
      throw new Error(`Lead with email ${data.email} already exists`);
    }

    // Resolve Region from Referrer (Sales Agent)
    let regionId: string | null = null;
    let assignedConsultantId = data.referredBy;

    if (data.referredBy) {
      const referrer = await prisma.consultant.findUnique({
        where: { id: data.referredBy },
        select: { id: true, region_id: true }
      });
      if (referrer?.region_id) {
        regionId = referrer.region_id;
      }
    }

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
        notes: data.notes,
        status: LeadStatus.NEW,
        region_id: regionId, // Strict inheritance
        assigned_consultant_id: assignedConsultantId,
        assigned_at: assignedConsultantId ? new Date() : null,
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
        },
        conversion_requests: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    });
  }

  /**
   * Get all leads for a specific region (Manager/Licensee view)
   */
  static async getLeadsByRegion(regionId?: string, regionIds?: string[]) {
    const where: any = {};
    if (regionId) {
      where.OR = [
        { region_id: regionId },
        { consultant: { region_id: regionId } }
      ];
    } else if (regionIds) {
      where.OR = [
        { region_id: { in: regionIds } },
        { consultant: { region_id: { in: regionIds } } }
      ];
    }

    return await prisma.lead.findMany({
      where,
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
      // If no website/domain, use email domain to avoid empty domain conflicts
      companyWebsite: conversionData.domain
        ? `https://${conversionData.domain}`
        : (lead.website || `https://${emailToUse.split('@')[1]}`),
      adminFirstName: conversionData.adminFirstName,
      adminLastName: conversionData.adminLastName,
      adminEmail: emailToUse,
      password: conversionData.password,
      countryOrRegion: lead.country,
      acceptTerms: conversionData.acceptTerms,
    };

    // Note: registerCompany throws if domain exists.

    // Resolve Sales Agent & Region for Attribution
    let salesAgentId = lead.referred_by;
    let regionId = lead.region_id; // Use lead's region if available (set during creation)

    if (salesAgentId && !regionId) {
      // Fallback: Fetch agent if lead didn't have region_id set
      const agent = await prisma.consultant.findUnique({
        where: { id: salesAgentId },
        select: { region_id: true }
      });
      if (agent?.region_id) regionId = agent.region_id;
    }

    const { company } = await CompanyService.registerCompany(
      registrationRequest,
      {
        skipDomainValidation: true,
        skipEmailVerification: true,
        regionId: regionId || undefined,
        salesAgentId: salesAgentId || undefined
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
      console.log(`Successfully assigned agent ${lead.referred_by} to company ${company.id} during creation (Region: ${regionId})`);

      // We don't need to call update company region anymore as it's done in registerCompany
      // But we keeping the Opportunity creation

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
    } else {
      console.log('No referrer found for lead, skipping attribution');
    }

    return company;
  }
}
