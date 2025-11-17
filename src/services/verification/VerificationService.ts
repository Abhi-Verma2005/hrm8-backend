/**
 * Company Verification Service
 * Handles all company verification logic (domain check, email verification, manual)
 */

import { Company, CompanyVerificationStatus, VerificationMethod, UserStatus } from '../../types';
import { extractEmailDomain } from '../../utils/domain';
import { CompanyModel } from '../../models/Company';
import { VerificationTokenModel } from '../../models/VerificationToken';
import { generateVerificationToken } from '../../utils/token';
import { emailService } from '../email/EmailService';
import { UserModel } from '../../models/User';
import { normalizeEmail } from '../../utils/email';

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

      // Activate the admin user
      const user = await UserModel.findByEmail(normalizeEmail(adminEmail));
      if (user && user.status === UserStatus.PENDING_VERIFICATION) {
        await UserModel.updateStatus(user.id, UserStatus.ACTIVE);
      }
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
    // Generate verification token
    const token = generateVerificationToken();
    
    // Set expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store token in database
    await VerificationTokenModel.create({
      companyId: company.id,
      email: adminEmail,
      token,
      expiresAt,
    });

    // Generate verification URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const verificationUrl = `${frontendUrl}/verify-company?token=${token}&companyId=${company.id}`;

    // Send verification email
    await emailService.sendVerificationEmail(
      adminEmail,
      token,
      company.name,
      verificationUrl
    );

    return {
      verificationToken: token,
      method: VerificationMethod.VERIFICATION_EMAIL,
    };
  }

  /**
   * Verify company using verification token from email
   */
  static async verifyByEmailToken(
    companyId: string,
    token: string
  ): Promise<{ verified: boolean; email?: string; error?: string }> {
    // Get token data first to check if it exists
    const tokenData = await VerificationTokenModel.findByToken(token);
    if (!tokenData) {
      console.error('[VerifyByEmailToken] Token not found', { tokenSnippet: token.slice(0, 6) + '***' });
      return { verified: false, error: 'Invalid verification token' };
    }

    // Verify company ID matches
    if (tokenData.companyId !== companyId) {
      console.error('[VerifyByEmailToken] Token company mismatch', {
        tokenCompanyId: tokenData.companyId,
        requestedCompanyId: companyId,
      });
      return { verified: false, error: 'Token does not match company' };
    }

    // Validate token (check expiration and usage)
    const isValid = await VerificationTokenModel.isValidToken(token);
    if (!isValid) {
      if (tokenData.usedAt) {
        console.error('[VerifyByEmailToken] Token already used', { tokenSnippet: token.slice(0, 6) + '***' });
        return { verified: false, error: 'This verification link has already been used' };
      }
      if (tokenData.expiresAt < new Date()) {
        console.error('[VerifyByEmailToken] Token expired', {
          tokenSnippet: token.slice(0, 6) + '***',
          expiresAt: tokenData.expiresAt,
        });
        return { verified: false, error: 'This verification link has expired. Please request a new one.' };
      }
      console.error('[VerifyByEmailToken] Token invalid for unknown reason');
      return { verified: false, error: 'Invalid verification token' };
    }

    // Verify company exists before updating
    const company = await CompanyModel.findById(companyId);
    if (!company) {
      console.error('[VerifyByEmailToken] Company not found', { companyId });
      return { verified: false, error: 'Company not found' };
    }

    // Mark token as used
    await VerificationTokenModel.markAsUsed(tokenData.id);

    // Update company verification status (only update, never create)
    await CompanyModel.updateVerificationStatus(
      companyId,
      CompanyVerificationStatus.VERIFIED,
      VerificationMethod.VERIFICATION_EMAIL
    );

    // Activate the admin user
    const user = await UserModel.findByEmail(normalizeEmail(tokenData.email));
    if (user && user.status === UserStatus.PENDING_VERIFICATION) {
      await UserModel.updateStatus(user.id, UserStatus.ACTIVE);
    }

    return { verified: true, email: tokenData.email };
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

