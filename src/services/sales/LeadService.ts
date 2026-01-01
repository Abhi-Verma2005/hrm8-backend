/**
 * Lead Service
 * Handles lead creation, management, and conversion to companies
 */

import prisma from '../../lib/prisma';
import { LeadStatus, LeadSource } from '@prisma/client';
import { AttributionService } from './AttributionService';
import { CompanyService } from '../company/CompanyService';

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
   * Convert Lead to Company
   */
  static async convertLeadToCompany(
    leadId: string, 
    conversionData: {
      adminFirstName: string;
      adminLastName: string;
      password: string; // Temporary password for admin
      acceptTerms: boolean;
    }
  ) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new Error('Lead not found');
    }

    if (lead.converted_to_company_id) {
      throw new Error('Lead already converted');
    }

    // Register Company
    // We use CompanyService.registerCompany but we need to adapt the input
    // Or we call CompanyModel directly if registerCompany is too specific to public signup
    
    // Let's check CompanyService.registerCompany signature
    // It takes CompanyRegistrationRequest
    
    const registrationRequest = {
      companyName: lead.company_name,
      companyWebsite: lead.website || '', // Website required?
      adminFirstName: conversionData.adminFirstName,
      adminLastName: conversionData.adminLastName,
      adminEmail: lead.email,
      password: conversionData.password,
      countryOrRegion: lead.country,
      acceptTerms: conversionData.acceptTerms,
    };

    // Note: registerCompany throws if domain exists.
    const { company } = await CompanyService.registerCompany(registrationRequest);

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
      }
    } else {
      console.log('No referrer found for lead, skipping attribution');
    }

    return company;
  }

  /**
   * Get Leads for an Agent
   */
  static async getLeadsByAgent(agentId: string) {
    return await prisma.lead.findMany({
      where: {
        OR: [
          { assigned_consultant_id: agentId },
          { referred_by: agentId }
        ]
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
