/**
 * Invitation Service
 * Handles employee invitation logic
 */

import { Invitation, InvitationStatus, EmployeeInvitationRequest } from '../../types';
import { InvitationModel } from '../../models/Invitation';
import { UserModel } from '../../models/User';
import { CompanyService } from '../company/CompanyService';
import { generateInvitationToken } from '../../utils/token';
import { normalizeEmail, isValidEmail } from '../../utils/email';
import { emailService } from '../email/EmailService';

export class InvitationService {
  /**
   * Send invitations to multiple employees
   */
  static async sendInvitations(
    companyId: string,
    invitedBy: string,
    request: EmployeeInvitationRequest
  ): Promise<{
    sent: string[];
    failed: Array<{ email: string; reason: string }>;
  }> {
    const sent: string[] = [];
    const failed: Array<{ email: string; reason: string }> = [];

    for (const email of request.emails) {
      try {
        const normalizedEmail = normalizeEmail(email);

        // Validate email format
        if (!isValidEmail(normalizedEmail)) {
          failed.push({ email, reason: 'Invalid email format' });
          continue;
        }

        // Check if user already exists
        const existingUser = await UserModel.findByEmail(normalizedEmail);
        if (existingUser) {
          failed.push({ email, reason: 'User already exists' });
          continue;
        }

        // Check for existing pending invitation
        const hasPendingInvitation = await InvitationModel.hasPendingInvitation(
          normalizedEmail,
          companyId
        );

        if (hasPendingInvitation) {
          failed.push({ email, reason: 'Invitation already sent' });
          continue;
        }

        // Generate invitation token
        const token = generateInvitationToken();
        
        // Set expiration (e.g., 7 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create invitation
        await InvitationModel.create({
          companyId,
          invitedBy,
          email: normalizedEmail,
          token,
          status: InvitationStatus.PENDING,
          expiresAt,
        });

        // Send invitation email
        try {
          const company = await CompanyService.findById(companyId);
          if (company) {
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
            const invitationUrl = `${baseUrl}/accept-invitation?token=${token}`;
            await emailService.sendInvitationEmail(
              normalizedEmail,
              token,
              company.name,
              invitationUrl
            );
          }
        } catch (error) {
          // Log error but don't fail the invitation creation
          console.error('Failed to send invitation email:', error);
        }

        sent.push(normalizedEmail);
      } catch (error) {
        failed.push({ 
          email, 
          reason: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return { sent, failed };
  }

  /**
   * Create a single invitation (used by other services)
   */
  static async createInvitation(
    companyId: string,
    invitedBy: string,
    email: string
  ): Promise<Invitation> {
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Invalid email format');
    }

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Check for existing pending invitation
    const hasPendingInvitation = await InvitationModel.hasPendingInvitation(
      normalizedEmail,
      companyId
    );
    if (hasPendingInvitation) {
      throw new Error('Pending invitation already exists');
    }

    // Generate invitation token
    const token = generateInvitationToken();

    // Set expiration (e.g., 7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    return await InvitationModel.create({
      companyId,
      invitedBy,
      email: normalizedEmail,
      token,
      status: InvitationStatus.PENDING,
      expiresAt,
    });
  }

  /**
   * Find invitation by token
   */
  static async findByToken(token: string): Promise<Invitation | null> {
    return await InvitationModel.findByToken(token);
  }

  /**
   * Accept invitation
   */
  static async acceptInvitation(
    invitationId: string
  ): Promise<Invitation> {
    return await InvitationModel.updateStatus(
      invitationId,
      InvitationStatus.ACCEPTED
    );
  }

  /**
   * Cancel invitation
   */
  static async cancelInvitation(
    invitationId: string
  ): Promise<Invitation> {
    return await InvitationModel.updateStatus(
      invitationId,
      InvitationStatus.CANCELLED
    );
  }

  /**
   * Check if invitation is valid (not expired, not accepted, etc.)
   */
  static isInvitationValid(invitation: Invitation): boolean {
    if (invitation.status !== InvitationStatus.PENDING) {
      return false;
    }

    if (invitation.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Get all invitations for a company
   */
  static async getCompanyInvitations(
    companyId: string
  ): Promise<Invitation[]> {
    return await InvitationModel.findByCompanyId(companyId);
  }
}

