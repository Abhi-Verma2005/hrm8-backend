/**
 * Company Verification Service
 * Handles all company verification logic (domain check, email verification, manual)
 */

import { Company, CompanyVerificationStatus, VerificationMethod } from '../../types';
import { extractEmailDomain } from '../../utils/domain';
import { CompanyModel } from '../../models/Company';

export class VerificationService {
  /**
   * Verify company using email domain check (automatic)
   * Checks if admin email domain matches company website domain
   */
  static async verifyByEmailDomain(
    company: Company,
    adminEmail: string
  ): Promise<{ verified: boolean; method: VerificationMethod }> {
    const companyDomain = company.domain;
    const emailDomain = extractEmailDomain(adminEmail);

    const verified = companyDomain.toLowerCase() === emailDomain.toLowerCase();

    if (verified) {
      // Auto-verify the company
      await CompanyModel.updateVerificationStatus(
        company.id,
        CompanyVerificationStatus.VERIFIED,
        VerificationMethod.EMAIL_DOMAIN_CHECK
      );
    }

    return {
      verified,
      method: VerificationMethod.EMAIL_DOMAIN_CHECK,
    };
  }

  /**
   * Initiate email verification process
   * Sends verification email to admin
   */
  static async initiateEmailVerification(
    company: Company,
    adminEmail: string
  ): Promise<{ verificationToken: string; method: VerificationMethod }> {
    // TODO: Generate verification token and send email
    // For now, return a placeholder token
    
    const verificationToken = 'placeholder-token'; // TODO: Generate actual token

    // TODO: Send verification email
    // await EmailService.sendVerificationEmail(adminEmail, verificationToken, company.name);
    // Use company and adminEmail when implementing email service
    void company;
    void adminEmail;

    return {
      verificationToken,
      method: VerificationMethod.VERIFICATION_EMAIL,
    };
  }

  /**
   * Verify company using verification token from email
   */
  static async verifyByEmailToken(
    companyId: string,
    token: string
  ): Promise<boolean> {
    // TODO: Validate token and verify company
    // This would check the token against stored verification tokens
    
    const company = await CompanyModel.findById(companyId);
    if (!company) {
      return false;
    }

    // TODO: Verify token matches stored token
    // For now, placeholder logic - token validation logic will be implemented
    if (token === 'valid-token') {
      await CompanyModel.updateVerificationStatus(
        companyId,
        CompanyVerificationStatus.VERIFIED,
        VerificationMethod.VERIFICATION_EMAIL
      );
      return true;
    }

    return false;
  }

  /**
   * Initiate manual verification (for GST/Registration number)
   */
  static async initiateManualVerification(
    _companyId: string,
    _verificationData: {
      gstNumber?: string;
      registrationNumber?: string;
      linkedInUrl?: string;
    }
  ): Promise<{ method: VerificationMethod }> {
    // TODO: Store verification data and flag for manual review
    // This would typically be reviewed by an admin
    
    return {
      method: VerificationMethod.MANUAL_VERIFICATION,
    };
  }

  /**
   * Determine which verification method to use based on company and admin email
   */
  static async determineVerificationMethod(
    company: Company,
    adminEmail: string
  ): Promise<VerificationMethod> {
    // Try email domain check first (automatic)
    const domainCheck = await this.verifyByEmailDomain(company, adminEmail);
    
    if (domainCheck.verified) {
      return VerificationMethod.EMAIL_DOMAIN_CHECK;
    }

    // If domain doesn't match, initiate email verification
    await this.initiateEmailVerification(company, adminEmail);
    
    // If domain doesn't match, use email verification
    return VerificationMethod.VERIFICATION_EMAIL;
  }
}

