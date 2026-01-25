/**
 * Lead Service
 * Handles lead creation, management, and conversion to companies
 */

import prisma from '../../lib/prisma';
import { LeadStatus, LeadSource, OpportunityType } from '@prisma/client';
import { CompanyService } from '../company/CompanyService';
import { AuthService } from '../auth/AuthService';
import { UniversalNotificationService } from '../notification/UniversalNotificationService';
import { emailService } from '../email/EmailService';
import { UniversalNotificationType } from '@prisma/client';

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

    const lead = await prisma.lead.create({
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

    // Notify assigned consultant
    if (assignedConsultantId) {
      const consultant = await prisma.consultant.findUnique({
        where: { id: assignedConsultantId },
        select: { email: true, first_name: true }
      });

      if (consultant) {
        await UniversalNotificationService.createNotification({
          recipientType: 'CONSULTANT',
          recipientId: assignedConsultantId as string,
          type: UniversalNotificationType.NEW_LEAD,
          title: 'New Lead Assigned',
          message: `You have been assigned a new lead: ${data.companyName}`,
          leadId: lead.id,
          actionUrl: '/consultant/leads'
        });

        await emailService.sendNewLeadAssignmentEmail(
          consultant.email,
          data.companyName,
          data.companyName // Using company name as lead name for now
        );
      }
    }

    return lead;
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

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        assigned_consultant_id: newConsultantId,
        assigned_at: new Date(),
      },
      include: {
        consultant: {
          select: { id: true, first_name: true, last_name: true, email: true }
        }
      }
    });

    // Notify new consultant
    if (updatedLead.consultant) {
      await UniversalNotificationService.createNotification({
        recipientType: 'CONSULTANT',
        recipientId: newConsultantId,
        type: UniversalNotificationType.NEW_LEAD,
        title: 'Lead Reassigned to You',
        message: `Lead ${updatedLead.company_name} has been reassigned to you.`,
        leadId: leadId,
        actionUrl: '/consultant/leads'
      });

      await emailService.sendNewLeadAssignmentEmail(
        updatedLead.consultant.email,
        updatedLead.company_name,
        updatedLead.company_name
      );
    }

    return updatedLead;
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
        : (lead.website ||
          (() => {
            const emailDomain = emailToUse.split('@')[1].toLowerCase();
            const GENERIC_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'protonmail.com', 'ymail.com', 'live.com'];

            if (GENERIC_DOMAINS.includes(emailDomain)) {
              // Generate a unique internal domain for generic email providers
              // Format: companyname-[random].internal
              const sanitizedName = lead.company_name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
              const uniqueSuffix = Math.random().toString(36).substring(2, 8);
              return `https://${sanitizedName}-${uniqueSuffix}.internal`;
            }

            return `https://${emailDomain}`;
          })()
        ),
      adminFirstName: conversionData.adminFirstName,
      adminLastName: conversionData.adminLastName,
      adminEmail: emailToUse,
      password: conversionData.password,
      countryOrRegion: lead.country,
      acceptTerms: conversionData.acceptTerms,
    };

    // Note: registerCompany throws if domain exists.

    // Resolve Sales Agent & Region for Attribution
    // Priority: Assigned Consultant (active sales agent) -> Referrer (source)
    let salesAgentId = lead.assigned_consultant_id || lead.referred_by;
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
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: LeadStatus.CONVERTED,
        converted_to_company_id: company.id,
        converted_at: new Date(),
      },
    });

    // Notify Agent about Conversion
    if (salesAgentId) {
      const agent = await prisma.consultant.findUnique({
        where: { id: salesAgentId },
        select: { email: true }
      });

      if (agent) {
        await UniversalNotificationService.createNotification({
          recipientType: 'CONSULTANT',
          recipientId: salesAgentId,
          type: UniversalNotificationType.LEAD_CONVERTED,
          title: 'Lead Converted!',
          message: `Great job! Your lead ${updatedLead.company_name} has been converted to a company.`,
          companyId: company.id,
          leadId: leadId
        });

        await emailService.sendLeadConvertedEmail(agent.email, updatedLead.company_name);
      }
    }

    // Assign Attribution
    if (salesAgentId) {
      console.log(`Successfully assigned agent ${salesAgentId} to company ${company.id} during creation (Region: ${regionId})`);

      // We don't need to call update company region anymore as it's done in registerCompany
      // But we keeping the Opportunity creation

      // Also create an initial Opportunity for this company and agent
      // This ensures it shows up in the pipeline immediately
      await prisma.opportunity.create({
        data: {
          company_id: company.id,
          sales_agent_id: salesAgentId, // Use resolved agent ID
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
      console.log('No sales agent found for lead, skipping attribution');
    }

    return company;
  }
}
