/**
 * Application Service
 * Handles job application submission and management
 */

import { ApplicationModel, ApplicationData } from '../../models/Application';
import { CandidateModel } from '../../models/Candidate';
import { JobModel } from '../../models/Job';
import { ApplicationStatus, ApplicationStage } from '@prisma/client';

export interface SubmitApplicationRequest {
  candidateId: string;
  jobId: string;
  resumeUrl?: string;
  coverLetterUrl?: string;
  portfolioUrl?: string;
  linkedInUrl?: string;
  websiteUrl?: string;
  customAnswers?: Array<{
    questionId: string;
    answer: string | string[];
  }>;
  questionnaireData?: any;
  tags?: string[];
}

export class ApplicationService {
  /**
   * Submit a new application
   */
  static async submitApplication(
    applicationData: SubmitApplicationRequest
  ): Promise<ApplicationData | { error: string; code?: string }> {
    // Verify candidate exists
    const candidate = await CandidateModel.findById(applicationData.candidateId);
    if (!candidate) {
      return { error: 'Candidate not found', code: 'CANDIDATE_NOT_FOUND' };
    }

    // Verify job exists and is open
    const job = await JobModel.findById(applicationData.jobId);
    if (!job) {
      return { error: 'Job not found', code: 'JOB_NOT_FOUND' };
    }

    if (job.status !== 'OPEN') {
      return { error: 'Job is not accepting applications', code: 'JOB_NOT_ACCEPTING' };
    }

    // Check if application already exists
    try {
      const application = await ApplicationModel.create({
        candidateId: applicationData.candidateId,
        jobId: applicationData.jobId,
        resumeUrl: applicationData.resumeUrl,
        coverLetterUrl: applicationData.coverLetterUrl,
        portfolioUrl: applicationData.portfolioUrl,
        linkedInUrl: applicationData.linkedInUrl,
        websiteUrl: applicationData.websiteUrl,
        customAnswers: applicationData.customAnswers,
        questionnaireData: applicationData.questionnaireData,
        tags: applicationData.tags,
      });

      return application;
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return { error: 'You have already applied to this job', code: 'APPLICATION_EXISTS' };
      }
      return { error: error.message || 'Failed to submit application', code: 'SUBMIT_FAILED' };
    }
  }

  /**
   * Get application by ID
   */
  static async getApplication(applicationId: string): Promise<ApplicationData | null> {
    return await ApplicationModel.findById(applicationId);
  }

  /**
   * Get applications by candidate ID
   */
  static async getCandidateApplications(candidateId: string): Promise<ApplicationData[]> {
    return await ApplicationModel.findByCandidateId(candidateId);
  }

  /**
   * Get applications by job ID
   */
  static async getJobApplications(jobId: string): Promise<ApplicationData[]> {
    return await ApplicationModel.findByJobId(jobId);
  }

  /**
   * Update application status
   */
  static async updateStatus(
    applicationId: string,
    status: ApplicationStatus,
    stage?: ApplicationStage
  ): Promise<ApplicationData> {
    return await ApplicationModel.updateStatus(applicationId, status, stage);
  }

  /**
   * Mark application as read
   */
  static async markAsRead(applicationId: string): Promise<void> {
    await ApplicationModel.markAsRead(applicationId);
  }

  /**
   * Withdraw application
   */
  static async withdrawApplication(applicationId: string): Promise<ApplicationData> {
    return await ApplicationModel.updateStatus(
      applicationId,
      ApplicationStatus.WITHDRAWN,
      undefined // No stage for withdrawn applications
    );
  }
}

