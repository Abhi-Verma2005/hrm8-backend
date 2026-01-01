/**
 * Company Service
 * Handles company-related business logic
 */

import { Company, CompanyRegistrationRequest, CompanyVerificationStatus, VerificationMethod } from '../../types';
import { extractDomain, extractEmailDomain, doDomainsBelongToSameOrg } from '../../utils/domain';
import { CompanyModel } from '../../models/Company';
import { VerificationService } from '../verification/VerificationService';
import { CompanyProfileService } from './CompanyProfileService';

export class CompanyService {
  /**
   * Register a new company
   * Creates company workspace and sets up first admin
   */
  static async registerCompany(
    registrationData: CompanyRegistrationRequest,
    options?: {
      skipDomainValidation?: boolean;
      skipEmailVerification?: boolean;
    }
  ): Promise<{
    company: Company;
    verificationMethod: VerificationMethod;
    verificationRequired: boolean;
  }> {
    // Extract domain from website
    const domain = extractDomain(registrationData.companyWebsite);
    const adminEmailDomain = extractEmailDomain(registrationData.adminEmail);

    // Ensure the admin email belongs to the same organization as the company domain
    // Skip if requested (e.g. internal sales flow)
    const domainsMatch = doDomainsBelongToSameOrg(domain, adminEmailDomain);
    
    if (!domainsMatch && !options?.skipDomainValidation) {
      throw new Error(
        'Admin email domain must match your company website domain. Please use your corporate email address.'
      );
    }

    // Create company
    const company = await CompanyModel.create({
      name: registrationData.companyName,
      website: registrationData.companyWebsite,
      domain: domain,
      countryOrRegion: registrationData.countryOrRegion.trim(),
      acceptedTerms: registrationData.acceptTerms,
      verificationStatus: options?.skipEmailVerification 
        ? CompanyVerificationStatus.VERIFIED 
        : CompanyVerificationStatus.PENDING,
    });

    // Initialize onboarding profile for company
    await CompanyProfileService.initializeProfile(company.id);


    // Always require verification email even after domain match
    // Unless explicitly skipped
    if (!options?.skipEmailVerification) {
      await VerificationService.initiateEmailVerification(company, registrationData.adminEmail);
    }

    return {
      company,
      verificationMethod: options?.skipEmailVerification 
        ? VerificationMethod.MANUAL_VERIFICATION 
        : VerificationMethod.VERIFICATION_EMAIL,
      verificationRequired: !options?.skipEmailVerification,
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

