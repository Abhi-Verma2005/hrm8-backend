/**
 * Company Model
 * Represents a company workspace in the HRM8 system
 */

import { Company, CompanyVerificationStatus, VerificationMethod, JobAssignmentMode } from '../types';
import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

export class CompanyAlreadyExistsError extends Error {
  constructor(domain: string) {
    super(`A company with the domain "${domain}" already exists.`);
    this.name = 'CompanyAlreadyExistsError';
  }
}

export class CompanyModel {
  /**
   * Create a new company
   */
  static async create(
    companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Company> {
    try {
      const company = await prisma.company.create({
        data: {
          name: companyData.name,
          website: companyData.website,
          domain: companyData.domain,
          country_or_region: companyData.countryOrRegion,
          accepted_terms: companyData.acceptedTerms,
          verification_status: companyData.verificationStatus,
          verification_method: companyData.verificationMethod,
          verified_at: companyData.verificationData?.verifiedAt,
          verified_by: companyData.verificationData?.verifiedBy,
          gst_number: companyData.verificationData?.gstNumber,
          registration_number: companyData.verificationData?.registrationNumber,
          linked_in_url: companyData.verificationData?.linkedInUrl,
          region_id: companyData.regionId,
          referred_by: companyData.referredBy,
        },
      });

      return this.mapPrismaToCompany(company);
    } catch (error) {
      // Check if it's a unique constraint violation on domain
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        error.meta?.target &&
        Array.isArray(error.meta.target) &&
        error.meta.target.includes('domain')
      ) {
        throw new CompanyAlreadyExistsError(companyData.domain);
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Find company by ID
   */
  static async findById(id: string): Promise<Company | null> {
    const company = await prisma.company.findUnique({
      where: { id },
    });

    return company ? this.mapPrismaToCompany(company) : null;
  }

  /**
   * Find company by domain
   * Tries exact match first, then base domain match (for subdomains)
   */
  static async findByDomain(domain: string): Promise<Company | null> {
    const normalizedDomain = domain.toLowerCase().trim();

    // Try exact match first
    let company = await prisma.company.findUnique({
      where: { domain: normalizedDomain },
    });

    if (company) {
      return this.mapPrismaToCompany(company);
    }

    // If no exact match, try to find by base domain (for subdomain matching)
    // e.g., if searching for "mail.company.com", try "company.com"
    const domainParts = normalizedDomain.split('.');
    if (domainParts.length > 2) {
      const baseDomain = domainParts.slice(-2).join('.');
      company = await prisma.company.findUnique({
        where: { domain: baseDomain },
      });

      if (company) {
        return this.mapPrismaToCompany(company);
      }
    }

    return null;
  }

  /**
   * Update company verification status
   * Only updates existing company, never creates a new one
   */
  static async updateVerificationStatus(
    id: string,
    status: CompanyVerificationStatus,
    method?: VerificationMethod
  ): Promise<Company> {
    // Verify company exists first
    const existingCompany = await prisma.company.findUnique({
      where: { id },
    });

    if (!existingCompany) {
      throw new Error(`Company with id ${id} not found. Cannot update verification status.`);
    }

    const updateData: any = {
      verification_status: status,
    };

    if (method) {
      updateData.verification_method = method;
    }

    if (status === CompanyVerificationStatus.VERIFIED) {
      updateData.verified_at = new Date();
    }

    const company = await prisma.company.update({
      where: { id },
      data: updateData,
    });

    return this.mapPrismaToCompany(company);
  }

  /**
   * Update company verification data (for manual verification)
   */
  static async updateVerificationData(
    id: string,
    verificationData: {
      gstNumber?: string;
      registrationNumber?: string;
      linkedInUrl?: string;
      verifiedBy?: string;
    }
  ): Promise<Company> {
    const company = await prisma.company.update({
      where: { id },
      data: {
        gst_number: verificationData.gstNumber,
        registration_number: verificationData.registrationNumber,
        linked_in_url: verificationData.linkedInUrl,
        verified_by: verificationData.verifiedBy,
      },
    });

    return this.mapPrismaToCompany(company);
  }

  /**
   * Get all companies (admin use)
   * @param limit - Maximum number of companies to return (default: 100)
   * @param offset - Number of companies to skip (default: 0)
   */
  static async findAll(limit = 100, offset = 0): Promise<Company[]> {
    const companies = await prisma.company.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    return companies.map((company) => this.mapPrismaToCompany(company));
  }

  /**
   * Delete company by ID
   */
  static async deleteById(id: string): Promise<void> {
    await prisma.company.delete({
      where: { id },
    });
  }

  /**
   * Check if company exists by domain
   */
  static async existsByDomain(domain: string): Promise<boolean> {
    const count = await prisma.company.count({
      where: { domain: domain.toLowerCase() },
    });

    return count > 0;
  }

  /**
   * Update job assignment mode
   */
  static async updateJobAssignmentMode(
    companyId: string,
    mode: JobAssignmentMode
  ): Promise<Company> {
    const company = await prisma.company.update({
      where: { id: companyId },
      data: { job_assignment_mode: mode },
    });

    return this.mapPrismaToCompany(company);
  }

  /**
   * Set preferred recruiter for a company
   */
  static async setPreferredRecruiter(
    companyId: string,
    consultantId: string | null
  ): Promise<Company> {
    const company = await prisma.company.update({
      where: { id: companyId },
      data: { preferred_recruiter_id: consultantId },
    });

    return this.mapPrismaToCompany(company);
  }

  /**
   * Get job assignment settings
   */
  static async getJobAssignmentSettings(companyId: string): Promise<{
    jobAssignmentMode: JobAssignmentMode;
    preferredRecruiterId: string | null;
  }> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        job_assignment_mode: true,
        preferred_recruiter_id: true,
      },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    return {
      jobAssignmentMode: company.job_assignment_mode as JobAssignmentMode,
      preferredRecruiterId: company.preferred_recruiter_id,
    };
  }

  /**
   * Map Prisma company model to our Company interface
   */
  private static mapPrismaToCompany(prismaCompany: any): Company {
    return {
      id: prismaCompany.id,
      name: prismaCompany.name,
      website: prismaCompany.website,
      domain: prismaCompany.domain,
      countryOrRegion: prismaCompany.country_or_region,
      acceptedTerms: prismaCompany.accepted_terms,
      verificationStatus: prismaCompany.verification_status,
      verificationMethod: prismaCompany.verification_method || undefined,
      verificationData: {
        verifiedAt: prismaCompany.verified_at || undefined,
        verifiedBy: prismaCompany.verified_by || undefined,
        gstNumber: prismaCompany.gst_number || undefined,
        registrationNumber: prismaCompany.registration_number || undefined,
        linkedInUrl: prismaCompany.linked_in_url || undefined,
      },
      regionId: prismaCompany.region_id || undefined,
      jobAssignmentMode: prismaCompany.job_assignment_mode || undefined,
      preferredRecruiterId: prismaCompany.preferred_recruiter_id || undefined,
      regionOwnerType: prismaCompany.region_owner_type || undefined,
      commissionStatus: prismaCompany.commission_status || undefined,
      attributionLocked: prismaCompany.attribution_locked,
      attributionLockedAt: prismaCompany.attribution_locked_at || undefined,
      referredBy: prismaCompany.referred_by || undefined,
      salesAgentId: prismaCompany.sales_agent_id || undefined,
      createdAt: prismaCompany.created_at,
      updatedAt: prismaCompany.updated_at,
    };
  }
}
