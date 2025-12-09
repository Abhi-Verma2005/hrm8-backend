import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../types';
import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';
import { VideoInterviewService } from '../../services/interview/VideoInterviewService';
import { VideoInterviewModel } from '../../models/VideoInterview';
import { ApplicationModel } from '../../models/Application';

export class VideoInterviewController {
  /**
   * Get all video interviews for a job
   * GET /api/video-interviews/job/:jobId
   */
  static async getJobInterviews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { jobId } = req.params;

      const interviews = await VideoInterviewService.getJobInterviews(jobId);

      res.json({
        success: true,
        data: { interviews },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load interviews',
      });
    }
  }

  /**
   * Get all video interviews for a company (optionally filtered by job)
   * GET /api/video-interviews
   */
  static async getCompanyInterviews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.companyId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { jobId } = req.query;

      const interviews = await VideoInterviewService.getCompanyInterviews(req.user.companyId, {
        jobId: jobId as string | undefined,
      });

      res.json({
        success: true,
        data: { interviews },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load interviews',
      });
    }
  }

  /**
   * Schedule a manual video interview (basic endpoint)
   * POST /api/video-interviews
   */
  static async scheduleManual(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.companyId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const {
        applicationId,
        candidateId,
        jobId,
        scheduledDate,
        duration,
        meetingLink,
        status,
        type,
        interviewerIds,
        notes,
      } = req.body;

      if (!applicationId || !candidateId || !jobId || !scheduledDate || !duration) {
        res.status(400).json({
          success: false,
          error: 'applicationId, candidateId, jobId, scheduledDate and duration are required',
        });
        return;
      }

      const interview = await VideoInterviewService.scheduleManualInterview({
        applicationId,
        candidateId,
        jobId,
        scheduledDate: new Date(scheduledDate),
        duration,
        meetingLink,
        status,
        type,
        interviewerIds,
        notes,
      });

      res.status(201).json({
        success: true,
        data: { interview },
        message: 'Video interview scheduled successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule video interview',
      });
    }
  }

  /**
   * Get video interviews for an application (candidate view)
   * GET /api/video-interviews/application/:applicationId
   */
  static async getApplicationInterviews(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const candidate = req.candidate;
      const { applicationId } = req.params;

      if (!candidate) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // Verify the application belongs to the candidate
      const application = await ApplicationModel.findById(applicationId);
      
      if (!application) {
        res.status(404).json({
          success: false,
          error: 'Application not found',
        });
        return;
      }

      if (application.candidateId !== candidate.id) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      const interviews = await VideoInterviewModel.findByApplicationId(applicationId);

      res.json({
        success: true,
        data: { interviews },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load interviews',
      });
    }
  }
}


