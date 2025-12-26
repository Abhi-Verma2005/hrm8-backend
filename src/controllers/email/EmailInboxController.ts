import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { EmailInboxService, EmailFilters } from '../../services/email/EmailInboxService';
import { EmailStatus } from '@prisma/client';
import { ApplicationModel } from '../../models/Application';
import { JobModel } from '../../models/Job';

export class EmailInboxController {
  /**
   * Get all emails with filters
   * GET /api/emails
   */
  static async getEmails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const {
        candidateId,
        applicationId,
        jobId,
        jobRoundId,
        status,
        startDate,
        endDate,
        limit,
        offset,
      } = req.query;

      // If jobId is provided, verify it belongs to user's company
      if (jobId) {
        const job = await JobModel.findById(jobId as string);
        if (!job || job.companyId !== req.user.companyId) {
          res.status(403).json({
            success: false,
            error: 'Forbidden',
          });
          return;
        }
      }

      // If applicationId is provided, verify it belongs to user's company
      if (applicationId) {
        const application = await ApplicationModel.findById(applicationId as string);
        if (!application) {
          res.status(404).json({
            success: false,
            error: 'Application not found',
          });
          return;
        }
        const job = await JobModel.findById(application.jobId);
        if (!job || job.companyId !== req.user.companyId) {
          res.status(403).json({
            success: false,
            error: 'Forbidden',
          });
          return;
        }
      }

      const filters: EmailFilters = {
        candidateId: candidateId as string,
        applicationId: applicationId as string,
        jobId: jobId as string,
        jobRoundId: jobRoundId as string,
        status: status as EmailStatus,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      };

      const emails = await EmailInboxService.getEmails(filters);

      res.json({
        success: true,
        data: emails,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch emails',
      });
    }
  }

  /**
   * Get email by ID
   * GET /api/emails/:id
   */
  static async getEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const email = await EmailInboxService.getEmailById(id);

      if (!email) {
        res.status(404).json({
          success: false,
          error: 'Email not found',
        });
        return;
      }

      // Verify job belongs to user's company
      const job = await JobModel.findById(email.jobId);
      if (!job || job.companyId !== req.user.companyId) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
        });
        return;
      }

      res.json({
        success: true,
        data: email,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch email',
      });
    }
  }

  /**
   * Get emails for an application
   * GET /api/applications/:applicationId/emails
   */
  static async getApplicationEmails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { applicationId } = req.params;

      // Verify application belongs to user's company
      const application = await ApplicationModel.findById(applicationId);
      if (!application) {
        res.status(404).json({
          success: false,
          error: 'Application not found',
        });
        return;
      }

      const job = await JobModel.findById(application.jobId);
      if (!job || job.companyId !== req.user.companyId) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
        });
        return;
      }

      const emails = await EmailInboxService.getEmailsByApplication(applicationId);

      res.json({
        success: true,
        data: emails,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch emails',
      });
    }
  }

  /**
   * Track email open (pixel tracking)
   * PUT /api/emails/:id/track-open
   */
  static async trackEmailOpen(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tracked = await EmailInboxService.trackEmailOpen(id);

      if (!tracked) {
        res.status(404).json({
          success: false,
          error: 'Email not found',
        });
        return;
      }

      // Return a 1x1 transparent pixel
      res.setHeader('Content-Type', 'image/png');
      res.send(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to track email open',
      });
    }
  }

  /**
   * Resend failed email
   * POST /api/emails/:id/resend
   */
  static async resendEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const result = await EmailInboxService.resendEmail(id, req.user.id);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Email resent successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resend email',
      });
    }
  }
}

