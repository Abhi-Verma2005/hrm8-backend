/**
 * Application Service
 * Handles job application submission and management
 */

import { ApplicationModel, ApplicationData } from '../../models/Application';
import { CandidateModel } from '../../models/Candidate';
import { JobModel } from '../../models/Job';
import { ApplicationStatus, ApplicationStage, ManualScreeningStatus } from '@prisma/client';

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
    console.log('[ApplicationService.getApplication] loading application', { applicationId });
    const application = await ApplicationModel.findById(applicationId);
    console.log('[ApplicationService.getApplication] result', {
      found: !!application,
      applicationId,
    });
    return application;
  }

  /**
   * Get applications by candidate ID
   */
  static async getCandidateApplications(candidateId: string): Promise<ApplicationData[]> {
    return await ApplicationModel.findByCandidateId(candidateId);
  }

  /**
   * Get applications by job ID with optional filters
   */
  static async getJobApplications(
    jobId: string,
    filters?: {
      status?: ApplicationStatus;
      stage?: ApplicationStage;
      minScore?: number;
      maxScore?: number;
      shortlisted?: boolean;
    }
  ): Promise<ApplicationData[]> {
    const applications = await ApplicationModel.findByJobId(jobId);
    
    if (!filters) {
      return applications;
    }

    return applications.filter((app) => {
      if (filters.status && app.status !== filters.status) return false;
      if (filters.stage && app.stage !== filters.stage) return false;
      if (filters.minScore !== undefined && (app.score === undefined || app.score < filters.minScore)) return false;
      if (filters.maxScore !== undefined && (app.score === undefined || app.score > filters.maxScore)) return false;
      if (filters.shortlisted !== undefined && app.shortlisted !== filters.shortlisted) return false;
      return true;
    });
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

  /**
   * Create application manually (by recruiter)
   */
  static async createManualApplication(
    companyId: string,
    jobId: string,
    candidateId: string,
    addedBy: string,
    applicationData?: {
      resumeUrl?: string;
      coverLetterUrl?: string;
      portfolioUrl?: string;
      linkedInUrl?: string;
      websiteUrl?: string;
      tags?: string[];
      notes?: string;
    }
  ): Promise<ApplicationData | { error: string; code?: string }> {
    // Verify job exists and belongs to company
    const job = await JobModel.findById(jobId);
    if (!job) {
      return { error: 'Job not found', code: 'JOB_NOT_FOUND' };
    }

    if (job.companyId !== companyId) {
      return { error: 'Job does not belong to your company', code: 'JOB_ACCESS_DENIED' };
    }

    // Verify candidate exists
    const candidate = await CandidateModel.findById(candidateId);
    if (!candidate) {
      return { error: 'Candidate not found', code: 'CANDIDATE_NOT_FOUND' };
    }

    // Check if application already exists
    try {
      const application = await ApplicationModel.create({
        candidateId,
        jobId,
        resumeUrl: applicationData?.resumeUrl,
        coverLetterUrl: applicationData?.coverLetterUrl,
        portfolioUrl: applicationData?.portfolioUrl,
        linkedInUrl: applicationData?.linkedInUrl,
        websiteUrl: applicationData?.websiteUrl,
        tags: applicationData?.tags,
        manuallyAdded: true,
        addedBy,
      });

      // Add notes if provided
      if (applicationData?.notes) {
        await ApplicationModel.updateNotes(application.id, applicationData.notes);
        return await ApplicationModel.findById(application.id) || application;
      }

      return application;
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return { error: 'Application already exists for this candidate and job', code: 'APPLICATION_EXISTS' };
      }
      return { error: error.message || 'Failed to create application', code: 'CREATE_FAILED' };
    }
  }

  /**
   * Update application score
   */
  static async updateScore(applicationId: string, score: number): Promise<ApplicationData> {
    if (score < 0 || score > 100) {
      throw new Error('Score must be between 0 and 100');
    }
    return await ApplicationModel.updateScore(applicationId, score);
  }

  /**
   * Update application score and AI analysis
   */
  static async updateScoreAndAnalysis(
    applicationId: string,
    score: number,
    aiAnalysis: any
  ): Promise<ApplicationData> {
    if (score < 0 || score > 100) {
      throw new Error('Score must be between 0 and 100');
    }
    return await ApplicationModel.updateScoreAndAnalysis(applicationId, score, aiAnalysis);
  }

  /**
   * Update application rank
   */
  static async updateRank(applicationId: string, rank: number): Promise<ApplicationData> {
    if (rank < 1) {
      throw new Error('Rank must be at least 1');
    }
    return await ApplicationModel.updateRank(applicationId, rank);
  }

  /**
   * Shortlist candidate
   */
  static async shortlistCandidate(
    applicationId: string,
    shortlistedBy: string
  ): Promise<ApplicationData> {
    return await ApplicationModel.shortlist(applicationId, shortlistedBy);
  }

  /**
   * Unshortlist candidate
   */
  static async unshortlistCandidate(applicationId: string): Promise<ApplicationData> {
    return await ApplicationModel.unshortlist(applicationId);
  }

  /**
   * Update application stage
   */
  static async updateStage(
    applicationId: string,
    stage: ApplicationStage
  ): Promise<ApplicationData> {
    return await ApplicationModel.updateStage(applicationId, stage);
  }

  /**
   * Update recruiter notes
   */
  static async updateNotes(
    applicationId: string,
    notes: string
  ): Promise<ApplicationData> {
    return await ApplicationModel.updateNotes(applicationId, notes);
  }

  /**
   * Update manual screening results
   */
  static async updateManualScreening(
    applicationId: string,
    data: {
      score?: number;
      status?: ManualScreeningStatus;
      notes?: string;
      completed?: boolean;
    }
  ): Promise<ApplicationData> {
    return await ApplicationModel.updateManualScreening(applicationId, data);
  }

  /**
   * Check if candidate has already applied to a job
   */
  static async hasApplication(candidateId: string, jobId: string): Promise<boolean> {
    return await ApplicationModel.hasApplication(candidateId, jobId);
  }
}

