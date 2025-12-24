/**
 * Application Service
 * Handles job application submission and management
 */

import { ApplicationModel, ApplicationData } from '../../models/Application';
import { CandidateModel } from '../../models/Candidate';
import { JobModel } from '../../models/Job';
import { ApplicationStatus, ApplicationStage, ManualScreeningStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { JobRoundModel } from '../../models/JobRound';
import { JobRoundService } from '../job/JobRoundService';
import { AssessmentService } from '../assessment/AssessmentService';
import { InterviewService } from '../interview/InterviewService';
import { CandidateScoringService } from '../ai/CandidateScoringService';
import crypto from 'crypto';

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

      // Automatically assign application to NEW round
      try {
        const newRound = await JobRoundModel.findByJobIdAndFixedKey(applicationData.jobId, 'NEW');
        if (newRound) {
          await prisma.applicationRoundProgress.upsert({
            where: {
              applicationId_jobRoundId: {
                applicationId: application.id,
                jobRoundId: newRound.id,
              },
            },
            create: {
              id: crypto.randomUUID(),
              applicationId: application.id,
              jobRoundId: newRound.id,
              completed: false,
            },
            update: {
              completed: false,
              completedAt: null,
            },
          });
        }
      } catch (roundError) {
        // Log error but don't fail application creation
        console.error('Failed to assign application to NEW round:', roundError);
      }

      // Trigger auto-scoring in the background (non-blocking)
      // Don't await - let it run asynchronously
      this.autoScoreApplication(application.id, applicationData.jobId).catch((scoringError) => {
        // Log error but don't fail application creation
        console.error('Auto-scoring failed for application:', application.id, scoringError);
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

      // Automatically assign application to NEW round
      try {
        const newRound = await JobRoundModel.findByJobIdAndFixedKey(jobId, 'NEW');
        if (newRound) {
          await prisma.applicationRoundProgress.upsert({
            where: {
              applicationId_jobRoundId: {
                applicationId: application.id,
                jobRoundId: newRound.id,
              },
            },
            create: {
              id: crypto.randomUUID(),
              applicationId: application.id,
              jobRoundId: newRound.id,
              completed: false,
            },
            update: {
              completed: false,
              completedAt: null,
            },
          });
        }
      } catch (roundError) {
        // Log error but don't fail application creation
        console.error('Failed to assign application to NEW round:', roundError);
      }

      // Trigger auto-scoring in the background (non-blocking)
      // Don't await - let it run asynchronously
      this.autoScoreApplication(application.id, jobId).catch((scoringError) => {
        // Log error but don't fail application creation
        console.error('Auto-scoring failed for application:', application.id, scoringError);
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
   * Update application tags
   */
  static async updateTags(applicationId: string, tags: string[]): Promise<ApplicationData> {
    if (!Array.isArray(tags)) {
      throw new Error('Tags must be an array');
    }
    // Validate tag strings (no empty strings, reasonable length)
    const validTags = tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0 && tag.length <= 50);
    return await ApplicationModel.updateTags(applicationId, validTags);
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

  /**
   * Move application to a specific round
   * Creates or updates ApplicationRoundProgress record
   */
  static async moveToRound(
    applicationId: string,
    jobRoundId: string,
    userId: string
  ): Promise<ApplicationData> {
    // Verify application exists
    const application = await ApplicationModel.findById(applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    // Handle fallback round IDs (e.g., "fixed-OFFER-{jobId}")
    // These are created by the frontend when fixed rounds don't exist in the database
    let round = await JobRoundModel.findById(jobRoundId);
    
    if (!round && jobRoundId.startsWith('fixed-')) {
      // Extract fixedKey from fallback ID format: "fixed-{FIXEDKEY}-{jobId}"
      const parts = jobRoundId.split('-');
      if (parts.length >= 2) {
        const fixedKey = parts[1]; // e.g., "OFFER", "HIRED", "NEW", "REJECTED"
        
        // First, try to find the actual round (it might already exist)
        round = await JobRoundModel.findByJobIdAndFixedKey(application.jobId, fixedKey);
        
        // If not found, ensure fixed rounds exist for this job
        if (!round) {
          await JobRoundService.initializeFixedRounds(application.jobId);
          
          // Try to find the actual round again
          round = await JobRoundModel.findByJobIdAndFixedKey(application.jobId, fixedKey);
        }
        
        if (!round) {
          throw new Error(`Fixed round '${fixedKey}' not found for job`);
        }
        
        // Update jobRoundId to use the actual round ID
        jobRoundId = round.id;
      }
    }
    
    if (!round) {
      throw new Error('Round not found');
    }

    if (round.jobId !== application.jobId) {
      throw new Error('Round does not belong to the same job');
    }

    // Create or update ApplicationRoundProgress
    await prisma.applicationRoundProgress.upsert({
      where: {
        applicationId_jobRoundId: {
          applicationId,
          jobRoundId,
        },
      },
      create: {
        id: crypto.randomUUID(),
        applicationId,
        jobRoundId,
        completed: false,
      },
      update: {
        // Reset completion if moving to a round
        completed: false,
        completedAt: null,
      },
    });

    // Map round to stage for backward compatibility
    // Map fixed rounds to ApplicationStage
    let mappedStage: ApplicationStage = ApplicationStage.NEW_APPLICATION;
    
    if (round.isFixed) {
      switch (round.fixedKey) {
        case 'NEW':
          mappedStage = ApplicationStage.NEW_APPLICATION;
          break;
        case 'OFFER':
          mappedStage = ApplicationStage.OFFER_EXTENDED;
          break;
        case 'HIRED':
          mappedStage = ApplicationStage.OFFER_ACCEPTED;
          break;
        case 'REJECTED':
          mappedStage = ApplicationStage.REJECTED;
          break;
      }
    } else {
      // For custom rounds, try to infer stage from type
      if (round.type === 'ASSESSMENT') {
        mappedStage = ApplicationStage.RESUME_REVIEW; // Default to screening
      } else if (round.type === 'INTERVIEW') {
        mappedStage = ApplicationStage.TECHNICAL_INTERVIEW;
      }
    }

    // Update application stage for backward compatibility
    const updatedApplication = await ApplicationModel.updateStage(applicationId, mappedStage);

    // Auto-assign assessment if moving to an assessment round
    if (round.type === 'ASSESSMENT') {
      try {
        await AssessmentService.autoAssignAssessment(applicationId, jobRoundId, userId);
      } catch (error) {
        // Log error but don't fail the move operation
        console.error('Failed to auto-assign assessment:', error);
      }
    }
    // Auto-schedule interview if moving to an interview round
    else if (round.type === 'INTERVIEW') {
      try {
        await InterviewService.autoScheduleInterview({
          applicationId,
          jobRoundId,
          scheduledBy: userId,
        });
      } catch (error) {
        // Log error with details for debugging
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to auto-schedule interview for application ${applicationId} in round ${jobRoundId}:`, errorMessage);
        // Store error in application notes for visibility
        const currentNotes = updatedApplication.recruiterNotes || '';
        await ApplicationModel.updateNotes(
          applicationId,
          `${currentNotes}\n[Auto-schedule failed: ${errorMessage}]`.trim()
        );
        // Note: We don't throw here to allow the move operation to complete
        // The error is logged and stored in notes for admin visibility
      }
    }

    return updatedApplication;
  }

  /**
   * Auto-score application in the background
   * This is called automatically when an application is submitted
   */
  private static async autoScoreApplication(applicationId: string, jobId: string): Promise<void> {
    try {
      console.log(`🤖 Starting auto-scoring for application ${applicationId}`);
      
      const scoringResult = await CandidateScoringService.scoreCandidate({
        applicationId,
        jobId,
      });

      // Update application with score and AI analysis
      await ApplicationModel.updateScoreAndAnalysis(
        applicationId,
        scoringResult.scores.overall,
        scoringResult
      );

      console.log(`✅ Auto-scoring completed for application ${applicationId}: ${scoringResult.scores.overall}/100`);
    } catch (error) {
      // Log error but don't throw - this is a background operation
      console.error(`❌ Auto-scoring failed for application ${applicationId}:`, error);
      // Optionally, you could store a flag indicating scoring failed for retry later
    }
  }
}
