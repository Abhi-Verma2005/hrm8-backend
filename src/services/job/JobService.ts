/**
 * Job Service
 * Handles job-related business logic
 */

import { Job, JobStatus, HiringMode, WorkArrangement, EmploymentType, HiringTeamMember } from '../../types';
import { JobModel } from '../../models/Job';

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
      };
      
      console.log('📦 Calling JobModel.create with:', {
        ...jobModelData,
        description: jobModelData.description?.substring(0, 100) + '...',
      });

      const job = await JobModel.create(jobModelData);
      console.log('✅ JobModel.create succeeded:', job.id);
      return job;
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

