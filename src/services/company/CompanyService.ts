/**
 * Company Service
 * Handles company-related business logic
 */

import { Company, CompanyRegistrationRequest, CompanyVerificationStatus, VerificationMethod } from '../../types';
import { extractDomain, extractEmailDomain, doDomainsBelongToSameOrg } from '../../utils/domain';
import { CompanyModel } from '../../models/Company';
import { VerificationService } from '../verification/VerificationService';

export class CompanyService {
  /**
   * Register a new company
   * Creates company workspace and sets up first admin
   */
  static async registerCompany(
    registrationData: CompanyRegistrationRequest
  ): Promise<{
    company: Company;
    verificationMethod: VerificationMethod;
    verificationRequired: boolean;
  }> {
    // Extract domain from website
    const domain = extractDomain(registrationData.companyWebsite);
    const adminEmailDomain = extractEmailDomain(registrationData.adminEmail);

    // Ensure the admin email belongs to the same organization as the company domain
    const domainsMatch = doDomainsBelongToSameOrg(domain, adminEmailDomain);
    if (!domainsMatch) {
      throw new Error(
        'Admin email domain must match your company website domain. Please use your corporate email address.'
      );
    }

    // Create company
    const company = await CompanyModel.create({
      name: registrationData.companyName,
      website: registrationData.companyWebsite,
      domain: domain,
      verificationStatus: CompanyVerificationStatus.PENDING,
    });

    // Always require verification email even after domain match
    await VerificationService.initiateEmailVerification(company, registrationData.adminEmail);

    return {
      company,
      verificationMethod: VerificationMethod.VERIFICATION_EMAIL,
      verificationRequired: true,
    };
  }

  /**
   * Find company by domain
   * Used for auto-joining employees via email domain matching
   */
  static async findByDomain(domain: string): Promise<Company | null> {
    return await CompanyModel.findByDomain(domain);
  }

  /**
   * Find company by ID
   */
  static async findById(id: string): Promise<Company | null> {
    return await CompanyModel.findById(id);
  }

  /**
   * Get company verification status
   */
  static async getVerificationStatus(
    companyId: string
  ): Promise<CompanyVerificationStatus | null> {
    const company = await CompanyModel.findById(companyId);
    return company?.verificationStatus || null;
  }
}

