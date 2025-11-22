/**
 * SignupRequest Service
 * Handles employee signup request logic
 */

import { SignupRequest, SignupRequestStatus, EmployeeSignupRequest, UserRole, UserStatus } from '../../types';
import { SignupRequestModel } from '../../models/SignupRequest';
import { UserModel } from '../../models/User';
import { CompanyService } from '../company/CompanyService';
import { extractEmailDomain, extractDomain } from '../../utils/domain';
import { normalizeEmail, isValidEmail } from '../../utils/email';
import { hashPassword } from '../../utils/password';
import { emailService } from '../email/EmailService';

export class SignupRequestService {
  /**
   * Create a new signup request
   * If companyDomain is provided, finds company by domain
   * Otherwise, extracts domain from email and finds company
   */
  static async createSignupRequest(
    signupData: EmployeeSignupRequest
  ): Promise<SignupRequest> {
    const normalizedEmail = normalizeEmail(signupData.businessEmail);
    const firstName = signupData.firstName.trim();
    const lastName = signupData.lastName.trim();
    const fullName = `${firstName} ${lastName}`.trim();

    // Validate email format
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Invalid email format');
    }

    const companyDomain = this.normalizeCompanyDomain(
      signupData.companyDomain,
      normalizedEmail
    );

    // Find company by domain
    const company = await CompanyService.findByDomain(companyDomain);
    if (!company) {
      throw new Error(`No company found for this email domain (${companyDomain}). Please contact your company admin for an invitation.`);
    }

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Check if there's already a pending signup request
    const hasPendingRequest = await SignupRequestModel.hasPendingSignupRequest(
      normalizedEmail,
      company.id
    );
    if (hasPendingRequest) {
      throw new Error('A signup request is already pending for this email');
    }

    // Hash password
    const passwordHash = await hashPassword(signupData.password);

    // Create signup request
    const signupRequest = await SignupRequestModel.create({
      companyId: company.id,
      email: normalizedEmail,
      name: fullName,
      firstName,
      lastName,
      acceptedTerms: signupData.acceptTerms,
      passwordHash,
      status: SignupRequestStatus.PENDING,
    });

    // Send notification email to company admin
    try {
      const adminUsers = await UserModel.findByCompanyIdAndRole(
        company.id,
        UserRole.SUPER_ADMIN
      );
      
      if (adminUsers.length > 0) {
        // Send email to first admin (or all admins)
        for (const admin of adminUsers) {
          await emailService.sendSignupRequestNotification(
            admin.email,
            signupRequest.email,
            signupRequest.name,
            company.name,
            signupRequest.id
          );
        }
      }
    } catch (error) {
      // Log error but don't fail the signup request creation
      console.error('Failed to send signup request notification email:', error);
    }

    return signupRequest;
  }

  /**
   * Get all pending signup requests for a company
   */
  static async getPendingSignupRequests(
    companyId: string
  ): Promise<SignupRequest[]> {
    return await SignupRequestModel.findPendingByCompanyId(companyId);
  }

  /**
   * Get all signup requests for a company
   */
  static async getSignupRequests(
    companyId: string
  ): Promise<SignupRequest[]> {
    return await SignupRequestModel.findByCompanyId(companyId);
  }

  /**
   * Get signup request by ID
   */
  static async getSignupRequestById(id: string): Promise<SignupRequest | null> {
    return await SignupRequestModel.findById(id);
  }

  /**
   * Approve signup request and create user account
   */
  static async approveSignupRequest(
    requestId: string,
    reviewedBy: string
  ): Promise<{ signupRequest: SignupRequest; user: any }> {
    const signupRequest = await SignupRequestModel.findById(requestId);
    
    if (!signupRequest) {
      throw new Error('Signup request not found');
    }

    if (signupRequest.status !== SignupRequestStatus.PENDING) {
      throw new Error('Signup request is not pending');
    }

    // Check if user already exists (edge case)
    const existingUser = await UserModel.findByEmail(signupRequest.email);
    if (existingUser) {
      // Update status to approved even though user exists
      await SignupRequestModel.updateStatus(
        requestId,
        SignupRequestStatus.APPROVED,
        reviewedBy
      );
      throw new Error('User already exists with this email');
    }

    // Create user account
    const user = await UserModel.create({
      email: signupRequest.email,
      name: signupRequest.name,
      passwordHash: signupRequest.passwordHash,
      companyId: signupRequest.companyId,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    });

    // Update signup request status
    const updatedRequest = await SignupRequestModel.updateStatus(
      requestId,
      SignupRequestStatus.APPROVED,
      reviewedBy
    );

    // Send approval email to user
    try {
      const company = await CompanyService.findById(signupRequest.companyId);
      if (company) {
        await emailService.sendSignupRequestApprovalEmail(
          signupRequest.email,
          signupRequest.name,
          company.name
        );
      }
    } catch (error) {
      console.error('Failed to send approval email:', error);
    }

    return { signupRequest: updatedRequest, user };
  }

  /**
   * Reject signup request
   */
  static async rejectSignupRequest(
    requestId: string,
    reviewedBy: string,
    reason?: string
  ): Promise<SignupRequest> {
    const signupRequest = await SignupRequestModel.findById(requestId);
    
    if (!signupRequest) {
      throw new Error('Signup request not found');
    }

    if (signupRequest.status !== SignupRequestStatus.PENDING) {
      throw new Error('Signup request is not pending');
    }

    // Update signup request status
    const updatedRequest = await SignupRequestModel.updateStatus(
      requestId,
      SignupRequestStatus.REJECTED,
      reviewedBy,
      reason
    );

    // Send rejection email to user
    try {
      const company = await CompanyService.findById(signupRequest.companyId);
      if (company) {
        await emailService.sendSignupRequestRejectionEmail(
          signupRequest.email,
          signupRequest.name,
          company.name,
          reason
        );
      }
    } catch (error) {
      console.error('Failed to send rejection email:', error);
    }

    return updatedRequest;
  }

  /**
   * Normalize company domain
   * If a domain is provided explicitly, sanitize it. Otherwise derive from email.
   */
  private static normalizeCompanyDomain(
    providedDomain: string | undefined,
    fallbackEmail: string
  ): string {
    let domain: string;

    if (providedDomain && providedDomain.trim().length > 0) {
      domain = extractDomain(providedDomain);
    } else {
      domain = extractEmailDomain(fallbackEmail);
    }

    return domain.toLowerCase().trim();
  }
}

