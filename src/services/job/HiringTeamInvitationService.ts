/**
 * Hiring Team Invitation Service
 * Handles invitations for hiring team members
 */

import { InvitationService } from '../invitation/InvitationService';
import { emailService } from '../email/EmailService';
import { UserModel } from '../../models/User';
import { CompanyService } from '../company/CompanyService';
import { extractEmailDomain, doDomainsBelongToSameOrg } from '../../utils/domain';

export interface HiringTeamInvitationRequest {
  email: string;
  name: string;
  role: 'hiring_manager' | 'recruiter' | 'interviewer' | 'coordinator';
  permissions: {
    canViewApplications: boolean;
    canShortlist: boolean;
    canScheduleInterviews: boolean;
    canMakeOffers: boolean;
  };
}

export class HiringTeamInvitationService {
  /**
   * Invite a user to join the hiring team for a specific job
   */
  static async inviteToHiringTeam(
    companyId: string,
    _jobId: string, // Reserved for future use (e.g., job-specific permissions)
    jobTitle: string,
    invitedBy: string,
    request: HiringTeamInvitationRequest
  ): Promise<void> {
    // Get inviter details
    const inviter = await UserModel.findById(invitedBy);
    if (!inviter) {
      throw new Error('Inviter not found');
    }

    // Get company details
    const company = await CompanyService.findById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }
    const companyName = company.name;
    const companyDomain = company.domain;

    // Validate email domain matches company domain
    const inviteeEmailDomain = extractEmailDomain(request.email);
    const domainsMatch = doDomainsBelongToSameOrg(companyDomain, inviteeEmailDomain);
    
    if (!domainsMatch) {
      throw new Error(
        `Email domain must match your company domain (${companyDomain}). Please use a corporate email address.`
      );
    }

    // Check if user already exists in the company
    const existingUser = await UserModel.findByEmail(request.email);
    
    if (existingUser && existingUser.companyId === companyId) {
      // User exists in company - no need to send invitation, just add to team
      // This will be handled by the job update
      return;
    }

    // Create invitation if user doesn't exist
    if (!existingUser) {
      const invitation = await InvitationService.createInvitation(
        companyId,
        invitedBy,
        request.email
      );

      // Send email with job context
      await emailService.sendHiringTeamInvitation({
        to: request.email,
        name: request.name,
        jobTitle,
        role: request.role,
        permissions: request.permissions,
        invitationToken: invitation.token,
        inviterName: inviter.name,
        companyName,
      });
    } else {
      // User exists but in different company - send notification email
      await emailService.sendHiringTeamNotification({
        to: request.email,
        name: request.name,
        jobTitle,
        role: request.role,
        permissions: request.permissions,
        inviterName: inviter.name,
      });
    }
  }
}

