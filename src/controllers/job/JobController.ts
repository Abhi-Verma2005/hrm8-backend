/**
 * Job Controller
 * Handles HTTP requests for job-related endpoints
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { JobService, CreateJobRequest, UpdateJobRequest } from '../../services/job/JobService';
import { JobStatus } from '../../types';
import { HiringTeamInvitationService } from '../../services/job/HiringTeamInvitationService';
import { JobPaymentService } from '../../services/payments/JobPaymentService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class JobController {
  /**
   * Create a new job posting
   * POST /api/jobs
   */
  static async createJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const jobData: CreateJobRequest = req.body;

      // Basic validation - title and location are required, description can be empty for drafts
      if (!jobData.title || !jobData.title.trim()) {
        res.status(400).json({
          success: false,
          error: 'Job title is required',
        });
        return;
      }

      if (!jobData.location || !jobData.location.trim()) {
        res.status(400).json({
          success: false,
          error: 'Job location is required',
        });
        return;
      }

      // Description is optional for drafts (can be empty), but if provided, it should be a string
      if (jobData.description !== undefined && typeof jobData.description !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Description must be a string',
        });
        return;
      }

      // Ensure description is at least an empty string if not provided
      if (!jobData.description) {
        jobData.description = '';
      }


      // Check wallet balance for paid jobs
      let walletCheck = null;
      if (jobData.servicePackage && jobData.servicePackage !== 'self-managed') {
        const { WalletJobPaymentService } = await import('../../services/payments/WalletJobPaymentService');
        const walletService = new WalletJobPaymentService(prisma);

        walletCheck = await walletService.checkCanPostJob(req.user.companyId, jobData.servicePackage);

        if (!walletCheck.canPost) {
          res.status(402).json({
            success: false,
            error: 'INSUFFICIENT_BALANCE',
            message: `Insufficient wallet balance. Required: $${walletCheck.required}, Available: $${walletCheck.balance}`,
            data: {
              balance: walletCheck.balance,
              required: walletCheck.required,
              shortfall: walletCheck.shortfall,
              currency: walletCheck.currency
            }
          });
          return;
        }
      }

      const job = await JobService.createJob(
        req.user.companyId,
        req.user.id,
        jobData
      );

      // Process wallet payment if applicable
      if (jobData.servicePackage && jobData.servicePackage !== 'self-managed' && walletCheck?.canPost) {
        try {
          const { WalletJobPaymentService } = await import('../../services/payments/WalletJobPaymentService');
          const walletService = new WalletJobPaymentService(prisma);

          await walletService.payForJobFromWallet(
            req.user.companyId,
            job.id,
            jobData.servicePackage,
            req.user.id,
            job.title
          );

          // Auto-publish after payment
          await JobService.publishJob(job.id, req.user.companyId);

          // Refresh job data to return updated status
          const updatedJob = await prisma.job.findUnique({ where: { id: job.id } });
          if (updatedJob) {
            Object.assign(job, updatedJob);
          }
        } catch (paymentError) {
          console.error('❌ Wallet payment failed after job creation:', paymentError);
          // Return success but with payment warning - job is created but remains in DRAFT/PENDING
          res.status(201).json({
            success: true,
            data: job,
            warning: 'Job created but payment failed. Please try paying again.'
          });
          return;
        }
      }

      res.status(201).json({
        success: true,
        data: job,
      });
    } catch (error) {
      console.error('❌ Error creating job:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create job',
      });
    }
  }

  /**
   * Get all jobs for company
   * GET /api/jobs
   */
  static async getJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const filters: {
        status?: JobStatus;
        department?: string;
        location?: string;
        hiringMode?: any;
      } = {};

      if (req.query.status) {
        filters.status = req.query.status as JobStatus;
      }
      if (req.query.department) {
        filters.department = req.query.department as string;
      }
      if (req.query.location) {
        filters.location = req.query.location as string;
      }
      if (req.query.hiringMode) {
        filters.hiringMode = req.query.hiringMode as any;
      }

      const jobs = await JobService.getCompanyJobs(req.user.companyId, filters);

      res.json({
        success: true,
        data: jobs,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch jobs',
      });
    }
  }

  /**
   * Get job by ID
   * GET /api/jobs/:id
   */
  static async getJobById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;

      const job = await JobService.getJobById(id, req.user.companyId);

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch job',
      });
    }
  }

  /**
   * Update job
   * PUT /api/jobs/:id
   */
  static async updateJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const jobData: UpdateJobRequest = req.body;

      // Check if user can edit this job
      const existingJob = await JobService.getJobById(id, req.user.companyId);

      // Determine if this update only touches lifecycle fields (status / dates / hiringMode / distribution)
      const LIFECYCLE_FIELDS = new Set([
        'status',
        'closeDate',
        'expiryDate',
        'postingDate',
        'hiringMode',
        'jobBoardDistribution',
      ]);

      const payloadKeys = Object.keys(jobData || {});
      const isLifecycleOnlyUpdate =
        payloadKeys.length > 0 &&
        payloadKeys.every((key) => LIFECYCLE_FIELDS.has(key));

      // For full content edits, allow editing if:
      // 1. Job is in DRAFT status, OR
      // 2. User is the job creator, OR  
      // 3. Job status allows editing (OPEN jobs can be edited by creator)
      // This allows editing posted jobs through the edit drawer
      if (!isLifecycleOnlyUpdate) {
        const canEdit =
          existingJob.status === JobStatus.DRAFT ||
          existingJob.createdBy === req.user.id ||
          existingJob.status === JobStatus.OPEN; // Allow editing OPEN jobs

        if (!canEdit) {
          res.status(403).json({
            success: false,
            error: 'You can only edit draft jobs, open jobs you created, or use lifecycle-only updates',
          });
          return;
        }
      }

      const job = await JobService.updateJob(id, req.user.companyId, jobData);

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update job',
      });
    }
  }

  /**
   * Delete job
   * DELETE /api/jobs/:id
   */
  static async deleteJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;

      await JobService.deleteJob(id, req.user.companyId);

      res.json({
        success: true,
        data: { message: 'Job deleted successfully' },
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete job',
      });
    }
  }

  /**
   * Publish job
   * POST /api/jobs/:id/publish
   */
  static async publishJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }


      const { id } = req.params;

      // 1. Get job to check service package and status
      const existingJob = await JobService.getJobById(id, req.user.companyId);

      // IDEMPOTENCY: If job is already published (OPEN), just return success
      if (existingJob.status === 'OPEN') {
        console.log(`ℹ️ Job ${id} is already published, returning success.`);
        res.json({
          success: true,
          data: existingJob,
          message: 'Job is already published'
        });
        return;
      }

      // 2. Check and process payment if needed
      if (existingJob.servicePackage &&
        existingJob.servicePackage !== 'self-managed' &&
        existingJob.paymentStatus !== 'PAID') {

        const { WalletJobPaymentService } = await import('../../services/payments/WalletJobPaymentService');
        const walletService = new WalletJobPaymentService(prisma);

        // Check balance
        const walletCheck = await walletService.checkCanPostJob(req.user.companyId, existingJob.servicePackage);

        if (!walletCheck.canPost) {
          res.status(402).json({
            success: false,
            error: 'INSUFFICIENT_BALANCE',
            message: `Insufficient wallet balance. Required: $${walletCheck.required}, Available: $${walletCheck.balance}`,
            data: {
              balance: walletCheck.balance,
              required: walletCheck.required,
              shortfall: walletCheck.shortfall,
              currency: walletCheck.currency
            }
          });
          return;
        }

        // Process Payment
        try {
          await walletService.payForJobFromWallet(
            req.user.companyId,
            id,
            existingJob.servicePackage,
            req.user.id,
            existingJob.title
          );
        } catch (paymentError) {
          console.error('❌ Wallet payment failed during publish:', paymentError);
          res.status(500).json({
            success: false,
            error: 'Payment failed',
            message: process.env.NODE_ENV === 'development' ? (paymentError as Error).message : 'Failed to process payment from wallet. Please try again.',
            details: (paymentError as Error).stack // Debugging aid
          });
          return;
        }
      }

      const job = await JobService.publishJob(id, req.user.companyId);

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish job',
      });
    }
  }

  /**
   * Submit and activate job (after review step)
   * POST /api/jobs/:id/submit
   */
  static async submitAndActivate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const { paymentId } = req.body; // Optional payment ID for PAYG users

      // TODO: For PAYG users, verify payment before activating
      // For now, we'll just activate the job
      const job = await JobService.submitAndActivate(id, req.user.companyId, paymentId);

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit and activate job',
      });
    }
  }

  /**
   * Update job alerts configuration
   * PUT /api/jobs/:id/alerts
   */
  static async updateAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const alertsConfig = req.body;

      const job = await JobService.updateAlerts(id, req.user.companyId, alertsConfig);

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update alerts',
      });
    }
  }

  /**
   * Save job as template
   * POST /api/jobs/:id/save-template
   */
  static async saveAsTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const { templateName, templateDescription } = req.body;

      if (!templateName) {
        res.status(400).json({
          success: false,
          error: 'Template name is required',
        });
        return;
      }

      const result = await JobService.saveJobAsTemplate(
        id,
        req.user.companyId,
        templateName,
        templateDescription
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save as template',
      });
    }
  }

  /**
   * Save job as draft
   * POST /api/jobs/:id/save-draft
   */
  static async saveDraft(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const jobData: UpdateJobRequest = req.body;

      const job = await JobService.saveDraft(id, req.user.companyId, jobData);

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save draft',
      });
    }
  }

  /**
   * Save job as template
   * POST /api/jobs/:id/save-template
   */
  static async saveTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const jobData: UpdateJobRequest = req.body;

      const job = await JobService.saveTemplate(id, req.user.companyId, jobData);

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save template',
      });
    }
  }

  /**
   * Bulk delete jobs
   * POST /api/jobs/bulk-delete
   */
  static async bulkDeleteJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { jobIds } = req.body;

      if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Job IDs array is required',
        });
        return;
      }

      const deletedCount = await JobService.bulkDeleteJobs(jobIds, req.user.companyId);

      res.json({
        success: true,
        data: { deletedCount, message: `${deletedCount} job(s) deleted successfully` },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete jobs',
      });
    }
  }

  /**
   * Invite a member to the hiring team
   * POST /api/jobs/:id/hiring-team/invite
   */
  static async inviteHiringTeamMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id: jobId } = req.params;
      const invitationData = req.body;

      // Validate required fields
      if (!invitationData.email || !invitationData.name || !invitationData.role) {
        res.status(400).json({
          success: false,
          error: 'Email, name, and role are required',
        });
        return;
      }

      // Get job to verify it exists and get title
      const job = await JobService.getJobById(jobId, req.user.companyId);
      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }

      // Send invitation
      await HiringTeamInvitationService.inviteToHiringTeam(
        req.user.companyId,
        jobId,
        job.title,
        req.user.id,
        invitationData
      );

      res.json({
        success: true,
        message: 'Invitation sent successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send invitation',
      });
    }
  }

  /**
   * Create payment checkout session for a job
   * POST /api/jobs/:id/create-payment
   */
  static async createJobPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id: jobId } = req.params;
      const { servicePackage, customerEmail } = req.body;

      if (!servicePackage) {
        res.status(400).json({ success: false, error: 'servicePackage is required' });
        return;
      }

      const validPackages = ['self-managed', 'shortlisting', 'full-service', 'executive-search'];
      if (!validPackages.includes(servicePackage)) {
        res.status(400).json({ success: false, error: 'Invalid servicePackage' });
        return;
      }

      // Verify job belongs to company
      await JobService.getJobById(jobId, req.user.companyId);

      const result = await JobPaymentService.createJobCheckoutSession({
        jobId,
        servicePackage: servicePackage as any,
        companyId: req.user.companyId,
        customerEmail,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment checkout',
      });
    }
  }

  /**
   * Generate job description using AI from ALL available form fields
   * POST /api/jobs/generate-description
   */
  static async generateDescription(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const {
        // Step 1 fields
        title,
        numberOfVacancies,
        department,
        location,
        employmentType,
        experienceLevel,
        workArrangement,
        tags,
        serviceType,

        // Step 2 fields (if partially filled)
        existingDescription,
        existingRequirements,
        existingResponsibilities,

        // Step 3 fields (if available)
        salaryMin,
        salaryMax,
        salaryCurrency,
        salaryPeriod,
        salaryDescription,
        hideSalary,
        closeDate,
        visibility,
        stealth,

        // Additional context
        additionalContext,
      } = req.body;

      if (!title) {
        res.status(400).json({ success: false, error: 'Job title is required' });
        return;
      }

      const { JobDescriptionGeneratorService } = await import('../../services/ai/JobDescriptionGeneratorService');

      const generated = await JobDescriptionGeneratorService.generateWithAI({
        title,
        numberOfVacancies,
        department,
        location,
        employmentType,
        experienceLevel,
        workArrangement,
        tags,
        serviceType,
        existingDescription,
        existingRequirements,
        existingResponsibilities,
        salaryMin,
        salaryMax,
        salaryCurrency,
        salaryPeriod,
        salaryDescription,
        hideSalary,
        closeDate,
        visibility,
        stealth,
        additionalContext,
      });

      res.json({
        success: true,
        data: generated,
      });
    } catch (error) {
      console.error('Error generating job description:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate job description',
      });
    }
  }
}

