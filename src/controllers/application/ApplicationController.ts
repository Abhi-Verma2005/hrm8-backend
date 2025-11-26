/**
 * Application Controller
 * Handles HTTP requests for job application endpoints
 */

import { Request, Response } from 'express';
import { ApplicationService, SubmitApplicationRequest } from '../../services/application/ApplicationService';
import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';

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
   * GET /api/jobs/:jobId/applications
   */
  static async getJobApplications(req: Request, res: Response): Promise<void> {
    try {
      // This endpoint should be protected by company auth middleware
      // For now, we'll allow it but in production should check company permissions
      const { jobId } = req.params;

      console.log('[ApplicationController.getJobApplications] recruiter view', { jobId });

      const applications = await ApplicationService.getJobApplications(jobId);

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
}

