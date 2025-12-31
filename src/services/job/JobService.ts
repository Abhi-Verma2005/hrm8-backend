/**
 * Job Service
 * Handles job-related business logic
 */

import { Job, JobStatus, HiringMode, WorkArrangement, EmploymentType, HiringTeamMember, AssignmentMode, JobAssignmentMode } from '../../types';
import { JobModel } from '../../models/Job';
import { CompanyModel } from '../../models/Company';
import { JobAllocationService } from '../hrm8/JobAllocationService';
import { JobPaymentService } from '../payments/JobPaymentService';
import { JobRoundService } from './JobRoundService';
import { CandidateJobService } from '../candidate/CandidateJobService';
import { prisma } from '../../lib/prisma';
import { PaymentStatus } from '@prisma/client';

export interface CreateJobRequest {
  title: string;
  description: string;
  jobSummary?: string;
  hiringMode: HiringMode;
  location: string;
  department?: string;
  workArrangement: WorkArrangement;
  employmentType: EmploymentType;
  numberOfVacancies?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryDescription?: string;
  category?: string;
  promotionalTags?: string[];
  featured?: boolean;
  stealth?: boolean;
  visibility?: string;
  requirements?: string[];
  responsibilities?: string[];
  termsAccepted?: boolean;
  termsAcceptedAt?: Date;
  termsAcceptedBy?: string;
  expiryDate?: Date;
  hiringTeam?: HiringTeamMember[];
  applicationForm?: any;
  videoInterviewingEnabled?: boolean;
  assignmentMode?: AssignmentMode;
  regionId?: string;
  servicePackage?: string;
}

export interface UpdateJobRequest extends Partial<CreateJobRequest> {
  status?: JobStatus;
  closeDate?: Date;
  applicationForm?: any;
  assignedConsultantId?: string | null;
  screening_enabled?: boolean;
  automated_screening_enabled?: boolean;
  screening_criteria?: any;
  pre_interview_questionnaire_enabled?: boolean;
  servicePackage?: string;
}

export class JobService {
  /**
   * Create a new job posting
   */
  static async createJob(
    companyId: string,
    createdBy: string,
    jobData: CreateJobRequest
  ): Promise<Job> {
    try {
      // Generate job code if not provided
      const jobCode = await this.generateJobCode(companyId);

      const jobModelData = {
        companyId,
        createdBy,
        jobCode,
        title: jobData.title,
        description: jobData.description,
        jobSummary: jobData.jobSummary,
        status: JobStatus.DRAFT,
        hiringMode: jobData.hiringMode,
        location: jobData.location,
        department: jobData.department,
        workArrangement: jobData.workArrangement,
        employmentType: jobData.employmentType,
        numberOfVacancies: jobData.numberOfVacancies || 1,
        salaryMin: jobData.salaryMin,
        salaryMax: jobData.salaryMax,
        salaryCurrency: jobData.salaryCurrency || 'USD',
        salaryDescription: jobData.salaryDescription,
        category: jobData.category,
        promotionalTags: jobData.promotionalTags || [],
        featured: jobData.featured || false,
        stealth: jobData.stealth || false,
        visibility: jobData.visibility || 'public',
        requirements: jobData.requirements || [],
        responsibilities: jobData.responsibilities || [],
        termsAccepted: jobData.termsAccepted || false,
        termsAcceptedAt: jobData.termsAcceptedAt,
        termsAcceptedBy: jobData.termsAcceptedBy,
        expiryDate: jobData.expiryDate,
        hiringTeam: jobData.hiringTeam || [],
        applicationForm: jobData.applicationForm,
        videoInterviewingEnabled: jobData.videoInterviewingEnabled || false,
      };

      // Get company data to inherit regionId and check assignment settings FIRST
      const company = await CompanyModel.findById(companyId);
      let companyRegionId: string | undefined;
      let jobAssignmentMode: JobAssignmentMode = JobAssignmentMode.AUTO_RULES_ONLY;

      if (company) {
        const companyData = await prisma.company.findUnique({
          where: { id: companyId },
          select: {
            region_id: true,
            job_assignment_mode: true,
          },
        });

        companyRegionId = companyData?.region_id || undefined;
        jobAssignmentMode = companyData?.job_assignment_mode || JobAssignmentMode.AUTO_RULES_ONLY;
      }

      // Use company's regionId as default if job doesn't have one
      // Priority: jobData.regionId (explicit) > company.regionId (default)
      const finalRegionId = jobData.regionId || companyRegionId;

      // Determine service package and payment status
      const servicePackage = jobData.servicePackage || 'self-managed';
      const requiresPayment = JobPaymentService.requiresPayment(servicePackage as any);
      const paymentStatus = requiresPayment ? undefined : PaymentStatus.PAID; // Free packages are automatically PAID

      // Add assignmentMode, regionId, and payment fields to job data
      // Note: regionId must be set here so JobModel.create can save it
      const finalJobData = {
        ...jobModelData,
        assignmentMode: jobData.assignmentMode || AssignmentMode.AUTO,
        ...(finalRegionId && { regionId: finalRegionId }), // Only include if we have a value
        servicePackage,
        ...(paymentStatus && { paymentStatus }), // Only set if we have a value
      };

      const job = await JobModel.create(finalJobData);

      // Initialize fixed rounds for the new job
      try {
        await JobRoundService.initializeFixedRounds(job.id);
        console.log('✅ Fixed rounds initialized for job:', job.id);
      } catch (roundError) {
        console.error('⚠️ Failed to initialize fixed rounds (non-critical):', roundError);
        // Don't fail job creation if round initialization fails
      }

      // Attempt auto-assignment if company mode is AUTO_RULES_ONLY and job assignmentMode is AUTO
      // Skip auto-assignment for drafts. Only assign once the job is OPEN (publish/submit).
      try {
        const assignmentMode = jobData.assignmentMode || AssignmentMode.AUTO;
        if (job.status !== JobStatus.OPEN) {
          // Draft jobs should not be auto-assigned
        } else if (jobAssignmentMode === JobAssignmentMode.AUTO_RULES_ONLY && assignmentMode === AssignmentMode.AUTO) {
          await JobAllocationService.autoAssignJob(job.id);
        }
      } catch (autoAssignError) {
        console.error('❌ Auto-assignment error (non-fatal):', autoAssignError);
        // Don't throw - job creation should succeed even if auto-assignment fails
      }

      // Process job alerts asynchronously (don't wait for it)
      this.processJobAlertsAsync(job).catch(err => {
        console.error('Failed to process job alerts:', err);
      });

      // Fetch the job again to get updated assignment info
      const updatedJob = await JobModel.findById(job.id);
      return updatedJob || job;
    } catch (error) {
      console.error('❌ JobService.createJob failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
      });
      throw error;
    }
  }

  /**
   * Process job alerts asynchronously
   */
  private static async processJobAlertsAsync(job: any) {
    try {
      await CandidateJobService.processJobAlerts(job);
    } catch (error) {
      console.error('Error in processJobAlertsAsync:', error);
    }
  }

  /**
   * Update an existing job
   */
  static async updateJob(
    jobId: string,
    companyId: string,
    jobData: UpdateJobRequest
  ): Promise<Job> {
    // Verify job belongs to company
    const existingJob = await JobModel.findById(jobId);
    if (!existingJob) {
      throw new Error('Job not found');
    }

    if (existingJob.companyId !== companyId) {
      throw new Error('Job does not belong to your company');
    }

    // Only allow editing if job is in DRAFT status or user is the creator
    // This check should be done at controller level with user context

    const updatedJob = await JobModel.update(jobId, jobData);

    return updatedJob;
  }

  /**
   * Get job by ID
   */
  static async getJobById(jobId: string, companyId: string): Promise<Job> {
    const job = await JobModel.findById(jobId);

    if (!job) {
      throw new Error('Job not found');
    }

    if (job.companyId !== companyId) {
      throw new Error('Job does not belong to your company');
    }

    const pipeline = await JobAllocationService.getPipelineForJob(jobId, job.assignedConsultantId);
    let assignedConsultantName: string | undefined;
    if (job.assignedConsultantId) {
      const consultant = await prisma.consultant.findUnique({
        where: { id: job.assignedConsultantId },
        select: { first_name: true, last_name: true },
      });
      if (consultant) {
        assignedConsultantName = `${consultant.first_name} ${consultant.last_name}`.trim();
      }
    }

    return {
      ...job,
      ...(assignedConsultantName && { assignedConsultantName }),
      ...(pipeline && { pipeline }),
    };
  }

  /**
   * Get all jobs for a company
   */
  static async getCompanyJobs(
    companyId: string,
    filters?: {
      status?: JobStatus;
      department?: string;
      location?: string;
      hiringMode?: HiringMode;
    }
  ): Promise<Job[]> {
    if (filters) {
      return await JobModel.findByCompanyIdWithFilters(companyId, filters);
    }

    return await JobModel.findByCompanyId(companyId);
  }

  /**
   * Delete a job (soft delete)
   */
  static async deleteJob(jobId: string, companyId: string): Promise<void> {
    // Verify job belongs to company
    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.companyId !== companyId) {
      throw new Error('Job does not belong to your company');
    }

    await JobModel.delete(jobId);
  }

  /**
   * Bulk delete jobs (soft delete)
   */
  static async bulkDeleteJobs(jobIds: string[], companyId: string): Promise<number> {
    if (!jobIds || jobIds.length === 0) {
      throw new Error('No job IDs provided');
    }

    // Verify all jobs belong to company
    const jobs = await JobModel.findByCompanyId(companyId);
    const validJobIds = jobs.filter(job => jobIds.includes(job.id)).map(job => job.id);

    if (validJobIds.length === 0) {
      throw new Error('No valid jobs found for deletion');
    }

    const deletedCount = await JobModel.bulkDelete(validJobIds, companyId);
    return deletedCount;
  }

  /**
   * Publish a job (change status from DRAFT to OPEN)
   */
  static async publishJob(jobId: string, companyId: string): Promise<Job> {
    const job = await this.getJobById(jobId, companyId);

    if (job.status !== JobStatus.DRAFT) {
      throw new Error('Only draft jobs can be published');
    }

    // Check if payment is required and completed
    const canPublish = await JobPaymentService.canPublishJob(jobId);
    if (!canPublish) {
      const prismaJob = await prisma.job.findUnique({
        where: { id: jobId },
        select: { service_package: true, payment_status: true },
      });

      if (prismaJob?.service_package && prismaJob.service_package !== 'self-managed') {
        throw new Error('Payment is required before publishing this job. Please complete the payment first.');
      }
    }

    // Set posting date if not already set
    const updatedJob = await JobModel.update(jobId, {
      status: JobStatus.OPEN,
      postingDate: job.postingDate || new Date(),
    });

    // Auto-assign when publishing if eligible and unassigned
    try {
      const companySettings = await prisma.company.findUnique({
        where: { id: updatedJob.companyId },
        select: { job_assignment_mode: true },
      });
      if (
        updatedJob.assignmentMode === AssignmentMode.AUTO &&
        !updatedJob.assignedConsultantId &&
        companySettings?.job_assignment_mode === JobAssignmentMode.AUTO_RULES_ONLY
      ) {
        await JobAllocationService.autoAssignJob(updatedJob.id);
      }
    } catch (autoAssignError) {
      console.error('❌ Auto-assignment error on publish (non-fatal):', autoAssignError);
    }

    return updatedJob;
  }

  /**
   * Submit and activate a job (after review step)
   * This activates the job and makes it live on internal job board and careers page
   */
  static async submitAndActivate(
    jobId: string,
    companyId: string,
    _paymentId?: string // TODO: Verify payment for PAYG users before activating
  ): Promise<Job> {
    const job = await this.getJobById(jobId, companyId);

    if (job.status !== JobStatus.DRAFT) {
      throw new Error('Only draft jobs can be submitted');
    }

    // Generate share link and referral link
    const shareLink = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/jobs/${jobId}`;
    const referralLink = `${shareLink}?ref=${jobId.substring(0, 8)}`;

    // Activate job - set status to OPEN and set posting date
    const updatedJob = await JobModel.update(jobId, {
      status: JobStatus.OPEN,
      postingDate: job.postingDate || new Date(),
      shareLink,
      referralLink,
    });

    // Auto-assign when activating if eligible and unassigned
    try {
      const companySettings = await prisma.company.findUnique({
        where: { id: updatedJob.companyId },
        select: { job_assignment_mode: true },
      });
      if (
        updatedJob.assignmentMode === AssignmentMode.AUTO &&
        !updatedJob.assignedConsultantId &&
        companySettings?.job_assignment_mode === JobAssignmentMode.AUTO_RULES_ONLY
      ) {
        await JobAllocationService.autoAssignJob(updatedJob.id);
      }
    } catch (autoAssignError) {
      console.error('❌ Auto-assignment error on submit (non-fatal):', autoAssignError);
    }

    return updatedJob;
  }

  /**
   * Update job alerts configuration
   */
  static async updateAlerts(
    jobId: string,
    companyId: string,
    alertsConfig: {
      newApplicants?: boolean;
      inactivity?: boolean;
      deadlines?: boolean;
      inactivityDays?: number;
    }
  ): Promise<Job> {
    await this.getJobById(jobId, companyId);

    const updatedJob = await JobModel.update(jobId, {
      alertsEnabled: alertsConfig,
    });

    return updatedJob;
  }

  /**
   * @deprecated Use JobTemplateService.createFromJob() instead
   * Save job as template - DEPRECATED
   * This method is kept for backward compatibility but should not be used.
   * Use JobTemplateService.createFromJob() to create templates in the new system.
   */
  static async saveJobAsTemplate(
    _jobId: string,
    _companyId: string,
    _templateName: string,
    _templateDescription?: string
  ): Promise<{ job: Job; templateId: string }> {
    throw new Error('This method is deprecated. Use JobTemplateService.createFromJob() instead.');
  }

  /**
   * Save job as draft
   */
  static async saveDraft(
    jobId: string,
    companyId: string,
    jobData: UpdateJobRequest
  ): Promise<Job> {
    // Verify job exists and belongs to company (throws error if not)
    await this.getJobById(jobId, companyId);

    const updatedJob = await JobModel.update(jobId, {
      ...jobData,
      status: JobStatus.DRAFT,
    });

    return updatedJob;
  }

  /**
   * @deprecated Use JobTemplateService.createFromJob() or JobTemplateService.createTemplate() instead
   * Save job as template - DEPRECATED
   * This method is kept for backward compatibility but should not be used.
   * Use JobTemplateService to create templates in the new system.
   */
  static async saveTemplate(
    _jobId: string,
    _companyId: string,
    _jobData: UpdateJobRequest
  ): Promise<Job> {
    throw new Error('This method is deprecated. Use JobTemplateService.createFromJob() or JobTemplateService.createTemplate() instead.');
  }

  /**
   * Generate unique job code for a company
   */
  private static async generateJobCode(companyId: string): Promise<string> {
    // Get count of jobs for this company
    const jobs = await JobModel.findByCompanyId(companyId);
    const jobNumber = jobs.length + 1;

    // Format: JOB-001, JOB-002, etc.
    return `JOB-${String(jobNumber).padStart(3, '0')}`;
  }
}

