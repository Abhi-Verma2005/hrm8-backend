/**
 * Talent Pool Controller
 * Handles HTTP requests for searching and managing talent pool (recruiter-facing)
 */

import { Response, Request } from 'express';
import { AuthenticatedRequest } from '../../types';
import { CandidateModel } from '../../models/Candidate';
import { ApplicationService } from '../../services/application/ApplicationService';
import { JobModel } from '../../models/Job';
import { CompanyService } from '../../services/company/CompanyService';
import { emailService } from '../../services/email/EmailService';
import { isValidEmail, normalizeEmail } from '../../utils/email';
import { UserModel } from '../../models/User';
import { JobInvitationModel } from '../../models/JobInvitation';
import { JobInvitationStatus } from '../../types';
import { generateInvitationToken } from '../../utils/token';

export class TalentPoolController {
  /**
   * Search candidates in talent pool
   * GET /api/talent-pool/search
   */
  static async searchTalentPool(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const {
        search,
        city,
        state,
        country,
        status,
        jobId, // Optional: to check if candidates have already applied
        limit = 50,
        offset = 0,
      } = req.query;

      const result = await CandidateModel.searchTalentPool({
        search: search as string,
        city: city as string,
        state: state as string,
        country: country as string,
        status: status as any,
        limit: parseInt(limit as string) || 50,
        offset: parseInt(offset as string) || 0,
      });

      // Remove sensitive data (passwordHash) from response
      let candidates = result.candidates.map(candidate => ({
        id: candidate.id,
        email: candidate.email,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        phone: candidate.phone,
        photo: candidate.photo,
        linkedInUrl: candidate.linkedInUrl,
        city: candidate.city,
        state: candidate.state,
        country: candidate.country,
        visaStatus: candidate.visaStatus,
        workEligibility: candidate.workEligibility,
        jobTypePreference: candidate.jobTypePreference,
        salaryPreference: candidate.salaryPreference,
        relocationWilling: candidate.relocationWilling,
        remotePreference: candidate.remotePreference,
        emailVerified: candidate.emailVerified,
        status: candidate.status,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt,
        hasApplied: false as boolean, // Will be set below if jobId provided
      }));

      // Check if candidates have already applied to the job (if jobId provided)
      if (jobId) {
        const applicationChecks = await Promise.all(
          candidates.map(async (candidate) => {
            const hasApplied = await ApplicationService.hasApplication(candidate.id, jobId as string);
            return { ...candidate, hasApplied };
          })
        );
        candidates = applicationChecks;
      }

      res.json({
        success: true,
        data: {
          candidates,
          total: result.total,
          limit: parseInt(limit as string) || 50,
          offset: parseInt(offset as string) || 0,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search talent pool',
      });
    }
  }

  /**
   * Send job invitation email to non-user
   * POST /api/talent-pool/invite
   */
  static async sendJobInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { email, jobId } = req.body;

      if (!email || !jobId) {
        res.status(400).json({
          success: false,
          error: 'email and jobId are required',
        });
        return;
      }

      // Validate email format
      const normalizedEmail = normalizeEmail(email);
      if (!isValidEmail(normalizedEmail)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
        return;
      }

      // Check if there's already a pending invitation
      const hasPendingInvitation = await JobInvitationModel.hasPendingInvitation(
        normalizedEmail,
        jobId
      );
      if (hasPendingInvitation) {
        res.status(400).json({
          success: false,
          error: 'An invitation has already been sent to this email address',
          code: 'INVITATION_EXISTS',
        });
        return;
      }

      // Get job details
      const job = await JobModel.findById(jobId);
      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }

      // Verify job belongs to user's company
      if (job.companyId !== req.user.companyId) {
        res.status(403).json({
          success: false,
          error: 'Job does not belong to your company',
        });
        return;
      }

      // Get company details
      const company = await CompanyService.findById(req.user.companyId);
      if (!company) {
        res.status(404).json({
          success: false,
          error: 'Company not found',
        });
        return;
      }

      // Check if candidate exists
      const existingCandidate = await CandidateModel.findByEmail(normalizedEmail);
      
      // Get recruiter name
      const recruiter = await UserModel.findById(req.user.id);
      const recruiterName = recruiter?.name;

      // Generate invitation token
      const token = generateInvitationToken();
      
      // Set expiration (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create job invitation
      const invitation = await JobInvitationModel.create({
        jobId,
        candidateId: existingCandidate?.id,
        email: normalizedEmail,
        token,
        status: JobInvitationStatus.PENDING,
        invitedBy: req.user.id,
        expiresAt,
      });

      // Generate invitation URL (if candidate exists, go to accept page; if not, go to register then accept)
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const invitationUrl = existingCandidate 
        ? `${baseUrl}/candidate/accept-invitation?token=${token}`
        : `${baseUrl}/candidate/register?invitation=${token}`;

      // Send invitation email
      await emailService.sendJobInvitationEmail({
        to: normalizedEmail,
        jobTitle: job.title,
        companyName: company.name,
        jobUrl: invitationUrl,
        recruiterName,
      });

      res.json({
        success: true,
        message: 'Job invitation email sent successfully',
        data: {
          invitationId: invitation.id,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send job invitation',
      });
    }
  }

  /**
   * Get job invitation by token (for accepting invitation)
   * GET /api/talent-pool/invitation/:token
   * Public route - no authentication required
   */
  static async getJobInvitationByToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Token is required',
        });
        return;
      }

      const invitation = await JobInvitationModel.findByToken(token);

      if (!invitation) {
        res.status(404).json({
          success: false,
          error: 'Invitation not found',
        });
        return;
      }

      // Check if invitation is expired
      if (invitation.expiresAt < new Date()) {
        res.status(400).json({
          success: false,
          error: 'Invitation has expired',
          code: 'EXPIRED',
        });
        return;
      }

      // Check if invitation is already accepted
      if (invitation.status === JobInvitationStatus.ACCEPTED) {
        res.status(400).json({
          success: false,
          error: 'Invitation has already been accepted',
          code: 'ALREADY_ACCEPTED',
        });
        return;
      }

      // Get job details
      const job = await JobModel.findById(invitation.jobId);
      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }

      // Get company details
      const company = await CompanyService.findById(job.companyId);
      if (!company) {
        res.status(404).json({
          success: false,
          error: 'Company not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          invitation: {
            id: invitation.id,
            email: invitation.email,
            jobId: invitation.jobId,
            candidateId: invitation.candidateId,
            expiresAt: invitation.expiresAt,
          },
          job: {
            id: job.id,
            title: job.title,
            department: job.department,
            location: job.location,
            employmentType: job.employmentType,
            workArrangement: job.workArrangement,
            description: job.description,
            requirements: job.requirements,
            responsibilities: job.responsibilities,
            applicationForm: job.applicationForm,
          },
          company: {
            id: company.id,
            name: company.name,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get invitation',
      });
    }
  }
}

