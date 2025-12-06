/**
 * Job Service
 * Handles job-related business logic
 */

import { Job, JobStatus, HiringMode, WorkArrangement, EmploymentType, HiringTeamMember, AssignmentMode, JobAssignmentMode } from '../../types';
import { JobModel } from '../../models/Job';
import { CompanyModel } from '../../models/Company';
import { JobAllocationService } from '../hrm8/JobAllocationService';
import { prisma } from '../../lib/prisma';

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
}

export interface UpdateJobRequest extends Partial<CreateJobRequest> {
  status?: JobStatus;
  closeDate?: Date;
  applicationForm?: any;
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
    console.log('🔧 JobService.createJob called with:', {
      companyId,
      createdBy,
      jobData: {
        ...jobData,
        description: jobData.description?.substring(0, 100) + '...',
      },
    });
    
    try {
      // Generate job code if not provided
      const jobCode = await this.generateJobCode(companyId);
      console.log('✅ Generated job code:', jobCode);

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
      
      console.log('📦 Calling JobModel.create with:', {
        ...jobModelData,
        description: jobModelData.description?.substring(0, 100) + '...',
      });

      // Add assignmentMode and regionId to job data if provided
      const finalJobData = {
        ...jobModelData,
        assignmentMode: jobData.assignmentMode || AssignmentMode.AUTO,
        regionId: jobData.regionId,
      };

      // Get company data to inherit regionId and check assignment settings
      const company = await CompanyModel.findById(companyId);
      let companyRegionId: string | undefined;
      let jobAssignmentMode: JobAssignmentMode = JobAssignmentMode.AUTO_RULES_ONLY;

      if (company) {
        const companyData = await prisma.company.findUnique({
          where: { id: companyId },
          select: { 
            regionId: true,
            jobAssignmentMode: true,
          },
        });

        companyRegionId = companyData?.regionId || undefined;
        jobAssignmentMode = companyData?.jobAssignmentMode || JobAssignmentMode.AUTO_RULES_ONLY;
      }

      // Use company's regionId as default if job doesn't have one
      const finalRegionId = jobData.regionId || companyRegionId;
      if (finalRegionId) {
        finalJobData.regionId = finalRegionId;
        console.log('🌍 Using regionId:', finalRegionId, jobData.regionId ? '(from job data)' : '(from company)');
      } else {
        console.log('⚠️ No regionId available - job will not be auto-assignable');
      }

      const job = await JobModel.create(finalJobData);
      console.log('✅ JobModel.create succeeded:', job.id);

      // Attempt auto-assignment if company mode is AUTO_RULES_ONLY and job assignmentMode is AUTO
      try {
        const assignmentMode = jobData.assignmentMode || AssignmentMode.AUTO;

        if (jobAssignmentMode === JobAssignmentMode.AUTO_RULES_ONLY && assignmentMode === AssignmentMode.AUTO) {
          console.log('🔄 Attempting auto-assignment for job:', job.id);
          const autoAssignResult = await JobAllocationService.autoAssignJob(job.id);
          
          if (autoAssignResult.success) {
            console.log('✅ Auto-assignment succeeded:', autoAssignResult.consultantId);
          } else {
            console.log('⚠️ Auto-assignment failed:', autoAssignResult.error);
            // Don't throw - job creation should succeed even if auto-assignment fails
          }
        } else {
          console.log('ℹ️ Auto-assignment skipped:', {
            companyMode: jobAssignmentMode,
            jobMode: assignmentMode,
          });
        }
      } catch (autoAssignError) {
        console.error('❌ Auto-assignment error (non-fatal):', autoAssignError);
        // Don't throw - job creation should succeed even if auto-assignment fails
      }

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

    return job;
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

    // Set posting date if not already set
    const updatedJob = await JobModel.update(jobId, {
      status: JobStatus.OPEN,
      postingDate: job.postingDate || new Date(),
    });

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

