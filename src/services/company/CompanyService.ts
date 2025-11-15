/**
 * Company Service
 * Handles company-related business logic
 */

import { Company, CompanyRegistrationRequest, CompanyVerificationStatus } from '../../types';
import { extractDomain } from '../../utils/domain';
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
    verificationMethod: string;
    verificationRequired: boolean;
  }> {
    // Extract domain from website
    const domain = extractDomain(registrationData.companyWebsite);

    // Create company
    const company = await CompanyModel.create({
      name: registrationData.companyName,
      website: registrationData.companyWebsite,
      domain: domain,
      verificationStatus: CompanyVerificationStatus.PENDING,
    });

    // Determine verification method based on email domain match
    const verificationMethod = await VerificationService.determineVerificationMethod(
      company,
      registrationData.adminEmail
    );

    const verificationRequired = 
      verificationMethod !== 'EMAIL_DOMAIN_CHECK'; // Only required if not auto-verified

    return {
      company,
      verificationMethod: verificationMethod as string,
      verificationRequired,
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

