/**
 * Application Controller
 * Handles HTTP requests for job application endpoints
 */

import { Request, Response } from 'express';
import { ApplicationService, SubmitApplicationRequest } from '../../services/application/ApplicationService';
import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';
import { AuthenticatedRequest } from '../../types';
import { ApplicationStage } from '@prisma/client';
import { CandidateModel } from '../../models/Candidate';
import { JobModel } from '../../models/Job';
import { CompanyService } from '../../services/company/CompanyService';
import { JobInvitationModel } from '../../models/JobInvitation';

export class ApplicationController {
  /**
   * Submit a new application
   * POST /api/applications
   */
  static async submitApplication(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const candidate = req.candidate;

      if (!candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const applicationData: SubmitApplicationRequest = {
        ...req.body,
        candidateId: candidate.id,
      };

      // Validate required fields
      if (!applicationData.jobId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: jobId',
        });
        return;
      }

      const result = await ApplicationService.submitApplication(applicationData);

      // Check if service returned an error
      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: {
          application: {
            id: result.id,
            candidateId: result.candidateId,
            jobId: result.jobId,
            status: result.status,
            stage: result.stage,
            appliedDate: result.appliedDate,
            createdAt: result.createdAt,
          },
          message: 'Application submitted successfully',
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit application',
      });
    }
  }

  /**
   * Get application by ID
   * GET /api/applications/:id
   */
  static async getApplication(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const candidate = req.candidate;
      const { id } = req.params;

      console.log('[ApplicationController.getApplication] candidate view', {
        candidateId: candidate?.id,
        applicationId: id,
      });

      if (!candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const application = await ApplicationService.getApplication(id);

      console.log('[ApplicationController.getApplication] loaded application', {
        found: !!application,
      });

      if (!application) {
        res.status(404).json({
          success: false,
          error: 'Application not found',
        });
        return;
      }

      // Verify candidate owns this application
      if (application.candidateId !== candidate.id) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      res.json({
        success: true,
        data: { application },
      });
    } catch (error) {
      console.error('[ApplicationController.getApplication] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get application',
      });
    }
  }

  /**
   * Get application by ID for recruiters/admins
   * GET /api/applications/admin/:id
   */
  static async getApplicationForAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      console.log('[ApplicationController.getApplicationForAdmin] recruiter view', {
        applicationId: id,
      });

      const application = await ApplicationService.getApplication(id);

      if (!application) {
        console.log('[ApplicationController.getApplicationForAdmin] not found', { applicationId: id });
        res.status(404).json({
          success: false,
          error: 'Application not found',
        });
        return;
      }

      console.log('[ApplicationController.getApplicationForAdmin] loaded application', {
        id: application.id,
        jobId: application.jobId,
        candidateId: application.candidateId,
      });

      res.json({
        success: true,
        data: { application },
      });
    } catch (error) {
      console.error('[ApplicationController.getApplicationForAdmin] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get application',
      });
    }
  }

  /**
   * Get candidate's applications
   * GET /api/applications
   */
  static async getCandidateApplications(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const candidate = req.candidate;

      if (!candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const applications = await ApplicationService.getCandidateApplications(candidate.id);

      res.json({
        success: true,
        data: { applications },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get applications',
      });
    }
  }

  /**
   * Get applications for a job (recruiter view)
   * GET /api/applications/job/:jobId
   */
  static async getJobApplications(req: Request, res: Response): Promise<void> {
    try {
      // This endpoint should be protected by company auth middleware
      // For now, we'll allow it but in production should check company permissions
      const { jobId } = req.params;

      // Parse query filters
      const filters: {
        status?: any;
        stage?: any;
        minScore?: number;
        maxScore?: number;
        shortlisted?: boolean;
      } = {};

      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.stage) {
        filters.stage = req.query.stage;
      }
      if (req.query.minScore) {
        filters.minScore = parseFloat(req.query.minScore as string);
      }
      if (req.query.maxScore) {
        filters.maxScore = parseFloat(req.query.maxScore as string);
      }
      if (req.query.shortlisted !== undefined) {
        filters.shortlisted = req.query.shortlisted === 'true';
      }

      console.log('[ApplicationController.getJobApplications] recruiter view', { jobId, filters });

      const applications = await ApplicationService.getJobApplications(jobId, filters);

      console.log('[ApplicationController.getJobApplications] loaded applications', {
        jobId,
        count: applications.length,
      });

      res.json({
        success: true,
        data: { applications },
      });
    } catch (error) {
      console.error('[ApplicationController.getJobApplications] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get applications',
      });
    }
  }

  /**
   * Withdraw application
   * POST /api/applications/:id/withdraw
   */
  static async withdrawApplication(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const candidate = req.candidate;
      const { id } = req.params;

      if (!candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const application = await ApplicationService.getApplication(id);

      if (!application) {
        res.status(404).json({
          success: false,
          error: 'Application not found',
        });
        return;
      }

      // Verify candidate owns this application
      if (application.candidateId !== candidate.id) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const withdrawn = await ApplicationService.withdrawApplication(id);

      res.json({
        success: true,
        data: { application: withdrawn },
        message: 'Application withdrawn successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to withdraw application',
      });
    }
  }

  /**
   * Create application manually (by recruiter)
   * POST /api/applications/manual
   */
  static async createManualApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { jobId, candidateId, resumeUrl, coverLetterUrl, portfolioUrl, linkedInUrl, websiteUrl, tags, notes } = req.body;

      if (!jobId || !candidateId) {
        res.status(400).json({
          success: false,
          error: 'jobId and candidateId are required',
        });
        return;
      }

      const result = await ApplicationService.createManualApplication(
        req.user.companyId,
        jobId,
        candidateId,
        req.user.id,
        {
          resumeUrl,
          coverLetterUrl,
          portfolioUrl,
          linkedInUrl,
          websiteUrl,
          tags,
          notes,
        }
      );

      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: { application: result },
        message: 'Application created successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create application',
      });
    }
  }

  /**
   * Update application score
   * PUT /api/applications/:id/score
   */
  static async updateScore(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const { score } = req.body;

      if (score === undefined || typeof score !== 'number') {
        res.status(400).json({
          success: false,
          error: 'Score is required and must be a number',
        });
        return;
      }

      const application = await ApplicationService.updateScore(id, score);

      res.json({
        success: true,
        data: { application },
        message: 'Score updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update score',
      });
    }
  }

  /**
   * Update application rank
   * PUT /api/applications/:id/rank
   */
  static async updateRank(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const { rank } = req.body;

      if (rank === undefined || typeof rank !== 'number') {
        res.status(400).json({
          success: false,
          error: 'Rank is required and must be a number',
        });
        return;
      }

      const application = await ApplicationService.updateRank(id, rank);

      res.json({
        success: true,
        data: { application },
        message: 'Rank updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update rank',
      });
    }
  }

  /**
   * Shortlist candidate
   * POST /api/applications/:id/shortlist
   */
  static async shortlistCandidate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;

      const application = await ApplicationService.shortlistCandidate(id, req.user.id);

      res.json({
        success: true,
        data: { application },
        message: 'Candidate shortlisted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to shortlist candidate',
      });
    }
  }

  /**
   * Unshortlist candidate
   * POST /api/applications/:id/unshortlist
   */
  static async unshortlistCandidate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;

      const application = await ApplicationService.unshortlistCandidate(id);

      res.json({
        success: true,
        data: { application },
        message: 'Candidate unshortlisted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unshortlist candidate',
      });
    }
  }

  /**
   * Update application stage
   * PUT /api/applications/:id/stage
   */
  static async updateStage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const { stage } = req.body;

      if (!stage) {
        res.status(400).json({
          success: false,
          error: 'Stage is required',
        });
        return;
      }

      const application = await ApplicationService.updateStage(id, stage as ApplicationStage);

      res.json({
        success: true,
        data: { application },
        message: 'Stage updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update stage',
      });
    }
  }

  /**
   * Update recruiter notes
   * PUT /api/applications/:id/notes
   */
  static async updateNotes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const { notes } = req.body;

      const application = await ApplicationService.updateNotes(id, notes || '');

      res.json({
        success: true,
        data: { application },
        message: 'Notes updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update notes',
      });
    }
  }

  /**
   * Update manual screening results
   * PUT /api/applications/:id/manual-screening
   */
  static async updateManualScreening(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const { score, status, notes, completed } = req.body;

      const application = await ApplicationService.updateManualScreening(id, {
        score,
        status,
        notes,
        completed,
      });

      res.json({
        success: true,
        data: { application },
        message: 'Manual screening updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update manual screening',
      });
    }
  }

  /**
   * Add candidate from talent pool to job (creates invitation)
   * POST /api/applications/from-talent-pool
   */
  static async addFromTalentPool(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { jobId, candidateId } = req.body;

      if (!jobId || !candidateId) {
        res.status(400).json({
          success: false,
          error: 'jobId and candidateId are required',
        });
        return;
      }

      // Check if candidate already applied
      const hasApplied = await ApplicationService.hasApplication(candidateId, jobId);
      if (hasApplied) {
        res.status(400).json({
          success: false,
          error: 'Candidate has already applied to this job',
          code: 'ALREADY_APPLIED',
        });
        return;
      }

      // Get candidate details
      const candidate = await CandidateModel.findById(candidateId);
      if (!candidate) {
        res.status(404).json({
          success: false,
          error: 'Candidate not found',
        });
        return;
      }

      // Check if there's already a pending invitation
      const hasPendingInvitation = await JobInvitationModel.hasPendingInvitation(
        candidate.email,
        jobId
      );
      if (hasPendingInvitation) {
        res.status(400).json({
          success: false,
          error: 'An invitation has already been sent to this candidate',
          code: 'INVITATION_EXISTS',
        });
        return;
      }

      // Get job and company details
      const job = await JobModel.findById(jobId);
      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }

      const company = await CompanyService.findById(req.user.companyId);
      if (!company) {
        res.status(404).json({
          success: false,
          error: 'Company not found',
        });
        return;
      }

      // Get recruiter name
      const { UserModel } = await import('../../models/User');
      const recruiter = await UserModel.findById(req.user.id);
      const recruiterName = recruiter?.name;

      // Generate invitation token
      const { generateInvitationToken } = await import('../../utils/token');
      const token = generateInvitationToken();
      
      // Set expiration (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create job invitation
      const { JobInvitationStatus } = await import('../../types');
      const invitation = await JobInvitationModel.create({
        jobId,
        candidateId,
        email: candidate.email,
        token,
        status: JobInvitationStatus.PENDING,
        invitedBy: req.user.id,
        expiresAt,
      });

      // Generate invitation URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const invitationUrl = `${baseUrl}/candidate/accept-invitation?token=${token}`;

      // Send invitation email
      const { emailService } = await import('../../services/email/EmailService');
      await emailService.sendJobInvitationEmail({
        to: candidate.email,
        jobTitle: job.title,
        companyName: company.name,
        jobUrl: invitationUrl,
        recruiterName,
      });

      res.status(201).json({
        success: true,
        data: { 
          invitationId: invitation.id,
          message: 'Invitation sent to candidate successfully',
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send invitation to candidate',
      });
    }
  }

  /**
   * Check if candidate has applied to job
   * GET /api/applications/check/:jobId/:candidateId
   */
  static async checkApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { jobId, candidateId } = req.params;

      if (!jobId || !candidateId) {
        res.status(400).json({
          success: false,
          error: 'jobId and candidateId are required',
        });
        return;
      }

      const hasApplied = await ApplicationService.hasApplication(candidateId, jobId);

      res.json({
        success: true,
        data: { hasApplied },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check application',
      });
    }
  }

  /**
   * Accept job invitation and submit application
   * POST /api/applications/accept-invitation
   * Requires candidate authentication
   */
  static async acceptJobInvitation(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const candidate = req.candidate;

      if (!candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { token, applicationData } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Token is required',
        });
        return;
      }

      // Find invitation by token
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
      const { JobInvitationStatus } = await import('../../types');
      if (invitation.status === JobInvitationStatus.ACCEPTED) {
        res.status(400).json({
          success: false,
          error: 'Invitation has already been accepted',
          code: 'ALREADY_ACCEPTED',
        });
        return;
      }

      // Verify candidate email matches invitation email
      if (candidate.email.toLowerCase() !== invitation.email.toLowerCase()) {
        res.status(403).json({
          success: false,
          error: 'This invitation was sent to a different email address',
        });
        return;
      }

      // Check if application already exists
      const hasApplied = await ApplicationService.hasApplication(candidate.id, invitation.jobId);
      if (hasApplied) {
        res.status(400).json({
          success: false,
          error: 'You have already applied to this job',
          code: 'ALREADY_APPLIED',
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

      // Create application
      const submitData: SubmitApplicationRequest = {
        jobId: invitation.jobId,
        candidateId: candidate.id,
        resumeUrl: applicationData?.resumeUrl,
        coverLetterUrl: applicationData?.coverLetterUrl,
        portfolioUrl: applicationData?.portfolioUrl,
        linkedInUrl: applicationData?.linkedInUrl,
        websiteUrl: applicationData?.websiteUrl,
        customAnswers: applicationData?.customAnswers,
        questionnaireData: applicationData?.questionnaireData,
      };

      const result = await ApplicationService.submitApplication(submitData);

      // Check if service returned an error
      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      // Update invitation status
      await JobInvitationModel.updateStatus(
        invitation.id,
        JobInvitationStatus.ACCEPTED,
        new Date(),
        result.id
      );

      res.status(201).json({
        success: true,
        data: {
          application: {
            id: result.id,
            candidateId: result.candidateId,
            jobId: result.jobId,
            status: result.status,
            stage: result.stage,
            appliedDate: result.appliedDate,
            createdAt: result.createdAt,
          },
          message: 'Invitation accepted and application submitted successfully',
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to accept invitation',
      });
    }
  }

  /**
   * Bulk score candidates using AI
   * POST /api/applications/bulk-score
   */
  static async bulkScoreCandidates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { applicationIds, jobId } = req.body;

      if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'applicationIds is required and must be a non-empty array',
        });
        return;
      }

      if (!jobId || typeof jobId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'jobId is required',
        });
        return;
      }

      // Verify user has access to this job
      const job = await JobModel.findById(jobId);
      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }

      if (job.companyId !== req.user.companyId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      console.log(`🚀 Starting bulk scoring for ${applicationIds.length} candidates, jobId: ${jobId}`);

      const { CandidateScoringService } = await import('../../services/ai/CandidateScoringService');

      // Set up progress tracking
      const progressUpdates: Array<{ completed: number; total: number; current: string }> = [];
      
      const results = await CandidateScoringService.bulkScoreCandidates(
        applicationIds,
        jobId,
        (completed, total, current) => {
          progressUpdates.push({ completed, total, current });
          console.log(`📊 Progress: ${completed}/${total} - ${current}`);
        }
      );

      console.log(`✅ Bulk scoring completed: ${results.size}/${applicationIds.length} successful`);

      // Update scores in database
      const updatePromises: Promise<any>[] = [];
      const scoringResults: Array<{
        applicationId: string;
        score: number;
        analysis: any;
        success: boolean;
      }> = [];

      for (const [applicationId, { score, result }] of results.entries()) {
        updatePromises.push(
          ApplicationService.updateScoreAndAnalysis(applicationId, score, result).then(() => {
            scoringResults.push({
              applicationId,
              score,
              analysis: result,
              success: true,
            });
          }).catch((error) => {
            console.error(`❌ Failed to update score and analysis for ${applicationId}:`, error);
            scoringResults.push({
              applicationId,
              score: 0,
              analysis: null,
              success: false,
            });
          })
        );
      }

      await Promise.all(updatePromises);

      const successCount = scoringResults.filter(r => r.success).length;
      const failedCount = applicationIds.length - results.size;

      console.log(`📊 Final results: ${successCount} successful, ${failedCount} failed`);

      res.json({
        success: true,
        data: {
          results: scoringResults,
          progress: progressUpdates,
          summary: {
            total: applicationIds.length,
            successful: successCount,
            failed: failedCount,
          },
        },
      });
    } catch (error) {
      console.error('Bulk scoring error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to score candidates',
      });
    }
  }
}

