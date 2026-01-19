/**
 * Application Service
 * Handles job application submission and management
 */

import { ApplicationModel, ApplicationData } from '../../models/Application';
import { CandidateModel } from '../../models/Candidate';
import { JobModel } from '../../models/Job';
import { ApplicationStatus, ApplicationStage, ManualScreeningStatus, ParticipantType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { JobRoundModel } from '../../models/JobRound';
import { JobRoundService } from '../job/JobRoundService';
import { AssessmentService } from '../assessment/AssessmentService';
import { InterviewService } from '../interview/InterviewService';
import { CandidateScoringService } from '../ai/CandidateScoringService';
import { CandidateDocumentService } from '../candidate/CandidateDocumentService';
import { ResumeParserService } from '../ai/ResumeParserService';
import { CandidateService } from '../candidate/CandidateService';
import { CandidateQualificationsService } from '../candidate/CandidateQualificationsService';
import { ConversationService } from '../messaging/ConversationService';
import { ApplicationNotificationService } from '../notification/ApplicationNotificationService';

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

export interface AnonymousApplicationRequest {
  // Account creation fields (required for anonymous users)
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;

  // Application fields
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

  // Resume file buffer for parsing (if provided)
  resumeFile?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
  coverLetterFile?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
  portfolioFile?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
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
              application_id_job_round_id: {
                application_id: application.id,
                job_round_id: newRound.id,
              },
            },
            create: {
              application_id: application.id,
              job_round_id: newRound.id,
              completed: false,
              updated_at: new Date(),
            },
            update: {
              completed: false,
              completed_at: null,
              updated_at: new Date(),
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

      // Auto-populate candidate profile from resume if available and profile is empty
      if (applicationData.resumeUrl) {
        // Run in background to avoid delaying response
        (async () => {
          try {

            // Find resume document
            const resume = await CandidateDocumentService.findByUrl(applicationData.resumeUrl!);

            if (resume && resume.content) {
              // Parse resume text
              const parsedResumeData = await ResumeParserService.parseResume({
                text: resume.content,
              });

              // 1. Populate Skills (only if empty)
              const existingSkillsCount = await prisma.candidateSkill.count({ where: { candidate_id: candidate.id } });
              if (existingSkillsCount === 0 && parsedResumeData.skills && parsedResumeData.skills.length > 0) {
                const skillsToSave = parsedResumeData.skills.map((skill: any) => ({
                  name: typeof skill === 'string' ? skill : (skill.name || 'Unknown Skill'),
                  level: skill.level || 'intermediate',
                }));
                await CandidateService.updateSkills(candidate.id, skillsToSave);
              }

              // 2. Populate Work Experience (only if empty)
              const existingExpCount = await prisma.candidateWorkExperience.count({ where: { candidate_id: candidate.id } });
              if (existingExpCount === 0 && parsedResumeData.workExperience && parsedResumeData.workExperience.length > 0) {
                for (const exp of parsedResumeData.workExperience) {
                  try {
                    let startDate: Date;
                    if (exp.startDate) {
                      startDate = new Date(exp.startDate);
                      if (isNaN(startDate.getTime())) startDate = new Date();
                    } else {
                      startDate = new Date();
                    }

                    let endDate: Date | null = null;
                    if (exp.endDate) {
                      endDate = new Date(exp.endDate);
                      if (isNaN(endDate.getTime())) endDate = null;
                    }

                    await CandidateService.addWorkExperience(candidate.id, {
                      company: exp.company || 'Unknown Company',
                      role: exp.role || 'Unknown Role',
                      startDate,
                      endDate,
                      current: exp.current || false,
                      description: exp.description || undefined,
                      location: exp.location || undefined,
                    });
                  } catch (e) {
                    console.error('Error saving work experience:', e);
                  }
                }
              }

              // 3. Populate Education (only if empty)
              const existingEduCount = await prisma.candidateEducation.count({ where: { candidate_id: candidate.id } });
              if (existingEduCount === 0 && parsedResumeData.education && parsedResumeData.education.length > 0) {
                for (const edu of parsedResumeData.education) {
                  try {
                    let startDate: string | undefined;
                    if (edu.startDate) {
                      const date = new Date(edu.startDate);
                      if (!isNaN(date.getTime())) startDate = date.toISOString();
                    }

                    let endDate: string | undefined;
                    if (edu.endDate) {
                      const date = new Date(edu.endDate);
                      if (!isNaN(date.getTime())) endDate = date.toISOString();
                    }

                    await CandidateQualificationsService.addEducation(candidate.id, {
                      institution: edu.institution || 'Unknown Institution',
                      degree: edu.degree || 'Unknown Degree',
                      field: edu.field || 'Unknown Field',
                      startDate,
                      endDate,
                      current: edu.current || false,
                      grade: edu.grade,
                      description: edu.description,
                    });
                  } catch (e) {
                    console.error('Error saving education:', e);
                  }
                }
              }
            }
          } catch (error) {
            console.error('❌ Failed to auto-populate profile from resume:', error);
          }
        })();
      }

      // Auto-create conversation for candidate ↔ job owner/consultant
      try {
        const existingConversation = await prisma.conversation.findFirst({
          where: { job_id: job.id, candidate_id: candidate.id },
        });

        if (!existingConversation) {
          // Fetch owner/consultant details
          const owner = job.createdBy
            ? await prisma.user.findUnique({ where: { id: job.createdBy } })
            : null;
          const consultant = job.assignedConsultantId
            ? await prisma.consultant.findUnique({ where: { id: job.assignedConsultantId } })
            : null;

          // Build participants array
          const participants: Array<{
            participantType: ParticipantType;
            participantId: string;
            participantEmail: string;
            displayName: string;
          }> = [
              {
                participantType: ParticipantType.CANDIDATE,
                participantId: candidate.id,
                participantEmail: candidate.email,
                displayName: `${candidate.firstName} ${candidate.lastName}`.trim(),
              },
            ];

          if (owner) {
            participants.push({
              participantType: ParticipantType.EMPLOYER,
              participantId: owner.id,
              participantEmail: owner.email,
              displayName: owner.name || owner.email,
            });
          }

          if (consultant) {
            participants.push({
              participantType: ParticipantType.CONSULTANT,
              participantId: consultant.id,
              participantEmail: consultant.email,
              displayName: `${consultant.first_name} ${consultant.last_name}`.trim(),
            });
          }

          // Only create conversation if we have at least one other participant (owner or consultant)
          if (owner || consultant) {
            const newConversation = await prisma.conversation.create({
              data: {
                job_id: job.id,
                candidate_id: candidate.id,
                employer_user_id: owner?.id,
                consultant_id: consultant?.id,
                channel_type: consultant ? 'CANDIDATE_CONSULTANT' : 'CANDIDATE_EMPLOYER',
                status: 'ACTIVE',
                participants: {
                  create: participants.map(p => ({
                    participant_type: p.participantType,
                    participant_id: p.participantId,
                    participant_email: p.participantEmail,
                    display_name: p.displayName,
                  })),
                },
              },
            });

            console.log(`✅ Conversation created: ${newConversation.id}`);

            // Create initial system message
            try {
              await ConversationService.createMessage({
                conversationId: newConversation.id,
                senderType: ParticipantType.SYSTEM,
                senderId: 'system',
                senderEmail: 'system@hrm8.com',
                content: `Your application for "${job.title}" has been submitted successfully! 🎉\n\nYou can use this conversation to communicate with ${consultant ? 'your HRM8 consultant' : 'the employer'} about your application. We'll keep you updated on any status changes.`,
              });
              console.log(`✅ Initial system message created for conversation ${newConversation.id}`);
            } catch (msgError) {
              console.error('❌ Failed to create initial system message:', msgError);
              // Don't fail the application submission if message creation fails
            }
          } else {
            console.warn(`⚠️ Skipping conversation creation - no owner or consultant for job ${job.id}`);
          }
        } else {
          console.log(`ℹ️ Conversation already exists for job ${job.id} and candidate ${candidate.id}`);
        }
      } catch (convError) {
        console.error('❌ Failed to auto-create conversation on application submit:', convError);
        // Do not block application submission on conversation failure
      }

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
    // Get current application to track status change
    const currentApplication = await ApplicationModel.findById(applicationId);
    if (!currentApplication) {
      throw new Error('Application not found');
    }

    const oldStatus = currentApplication.status;
    const updatedApplication = await ApplicationModel.updateStatus(applicationId, status, stage);

    // Send notification if status changed
    if (oldStatus !== status) {
      ApplicationNotificationService.notifyStatusChange(
        applicationId,
        updatedApplication.candidateId,
        updatedApplication.jobId,
        oldStatus,
        status,
        stage || updatedApplication.stage
      ).catch((error) => {
        console.error('Failed to send status change notification:', error);
      });
    }

    return updatedApplication;
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
    const application = await ApplicationModel.updateStatus(
      applicationId,
      ApplicationStatus.WITHDRAWN,
      undefined // No stage for withdrawn applications
    );

    // Archive the conversation associated with this application
    try {
      const conversation = await ConversationService.findConversationByJobAndCandidate(
        application.jobId,
        application.candidateId
      );

      if (conversation) {
        const job = await JobModel.findById(application.jobId);
        const jobTitle = job?.title || 'the position';

        await ConversationService.archiveConversation(
          conversation.id,
          `This conversation has been archived because your application for "${jobTitle}" was withdrawn. You can no longer send messages in this conversation.`
        );
        console.log(`✅ Archived conversation ${conversation.id} for withdrawn application ${applicationId}`);
      }
    } catch (error) {
      console.error('Failed to archive conversation on application withdrawal:', error);
      // Don't fail the withdrawal if conversation archiving fails
    }

    return application;
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
              application_id_job_round_id: {
                application_id: application.id,
                job_round_id: newRound.id,
              },
            },
            create: {
              application_id: application.id,
              job_round_id: newRound.id,
              completed: false,
              updated_at: new Date(),
            },
            update: {
              completed: false,
              completed_at: null,
              updated_at: new Date(),
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
    const application = await ApplicationModel.shortlist(applicationId, shortlistedBy);

    // Send notification
    const { ApplicationNotificationService } = await import('../notification/ApplicationNotificationService');
    ApplicationNotificationService.notifyShortlisted(
      applicationId,
      application.candidateId,
      application.jobId,
      shortlistedBy
    ).catch((error) => {
      console.error('Failed to send shortlist notification:', error);
    });

    return application;
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
    // Get current application to track stage change
    const currentApplication = await ApplicationModel.findById(applicationId);
    if (!currentApplication) {
      throw new Error('Application not found');
    }

    const oldStage = currentApplication.stage;
    const updatedApplication = await ApplicationModel.updateStage(applicationId, stage);

    // Send notification if stage changed
    if (oldStage !== stage) {
      const { ApplicationNotificationService } = await import('../notification/ApplicationNotificationService');
      ApplicationNotificationService.notifyStageChange(
        applicationId,
        updatedApplication.candidateId,
        updatedApplication.jobId,
        oldStage,
        stage,
        updatedApplication.status
      ).catch((error) => {
        console.error('Failed to send stage change notification:', error);
      });
    }

    return updatedApplication;
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
   * Submit application as anonymous user (auto-creates account)
   * This method handles:
   * 1. Creating candidate account if email/password provided
   * 2. Parsing resume and saving work history, skills, education, etc.
   * 3. Saving documents (resume, cover letter, portfolio) to candidate documents
   * 4. Creating application
   * 5. Sending email notification with login details
   */
  static async submitAnonymousApplication(
    applicationData: AnonymousApplicationRequest
  ): Promise<{
    application: ApplicationData;
    candidate: { id: string; email: string; firstName: string; lastName: string };
    sessionId?: string;
    password: string; // Return password for email notification
  } | { error: string; code?: string }> {
    const { normalizeEmail } = await import('../../utils/email');
    const { hashPassword, isPasswordStrong } = await import('../../utils/password');
    const { CandidateAuthService } = await import('../candidate/CandidateAuthService');
    const { CandidateService } = await import('../candidate/CandidateService');
    const { CandidateQualificationsService } = await import('../candidate/CandidateQualificationsService');
    const { CandidateDocumentService } = await import('../candidate/CandidateDocumentService');
    const { DocumentParserService } = await import('../document/DocumentParserService');
    const { ResumeParserService } = await import('../ai/ResumeParserService');
    const { CloudinaryService } = await import('../storage/CloudinaryService');

    try {
      // Step 1: Validate email format
      const { isValidEmail } = await import('../../utils/email');
      const email = normalizeEmail(applicationData.email);

      if (!isValidEmail(email)) {
        return { error: 'Invalid email address format', code: 'INVALID_EMAIL' };
      }

      // Step 2: Check if candidate already exists
      let candidate = await CandidateAuthService.findByEmail(email);

      if (candidate) {
        // Candidate exists - they should login instead
        return { error: 'An account with this email already exists. Please login to apply.', code: 'EMAIL_EXISTS' };
      }

      // Step 3: Validate password
      if (!isPasswordStrong(applicationData.password)) {
        return { error: 'Password must be at least 8 characters with uppercase, lowercase, and number', code: 'WEAK_PASSWORD' };
      }

      // Step 3: Verify job exists and is open
      const job = await JobModel.findById(applicationData.jobId);
      if (!job) {
        return { error: 'Job not found', code: 'JOB_NOT_FOUND' };
      }

      if (job.status !== 'OPEN') {
        return { error: 'Job is not accepting applications', code: 'JOB_NOT_ACCEPTING' };
      }

      // Step 4: Parse resume if provided
      let parsedResumeData: any = null;
      let resumeText: string | undefined;
      let resumeUrl = applicationData.resumeUrl;

      if (applicationData.resumeFile) {
        try {
          // Use the same parseDocument method that logged-in users use
          // This ensures consistency and handles all file types correctly

          // Create a file-like object for parseDocument
          const { Readable } = await import('stream');
          const fileForParsing: Express.Multer.File = {
            fieldname: 'resume',
            originalname: applicationData.resumeFile.originalname,
            encoding: '7bit',
            mimetype: applicationData.resumeFile.mimetype,
            buffer: applicationData.resumeFile.buffer,
            size: applicationData.resumeFile.size,
            stream: Readable.from(applicationData.resumeFile.buffer),
            destination: '',
            filename: applicationData.resumeFile.originalname,
            path: '',
          };

          const parsedDocument = await DocumentParserService.parseDocument(fileForParsing);
          resumeText = parsedDocument.text || '';

          console.log('📝 Document parsed, text length:', parsedDocument.text?.length || 0);

          // Extract structured data using AI
          console.log('🤖 Extracting structured data from resume...');
          parsedResumeData = await ResumeParserService.parseResume(parsedDocument);
          console.log('✅ Resume parsed successfully:', {
            workExperience: parsedResumeData.workExperience?.length || 0,
            skills: parsedResumeData.skills?.length || 0,
            education: parsedResumeData.education?.length || 0,
            certifications: parsedResumeData.certifications?.length || 0,
            training: parsedResumeData.training?.length || 0,
          });

          // Upload resume to Cloudinary or Local Storage
          if (CloudinaryService.isConfigured()) {
            const uploadResult = await CloudinaryService.uploadFile(
              applicationData.resumeFile.buffer,
              applicationData.resumeFile.originalname,
              {
                folder: `hrm8/applications/temp`,
                resourceType: 'raw',
              }
            );
            resumeUrl = uploadResult.secureUrl;
            console.log('☁️ Resume uploaded to Cloudinary:', resumeUrl);
          } else {
            // Fallback: Upload to local storage
            const { LocalStorageService } = await import('../storage/LocalStorageService');
            const uploadResult = await LocalStorageService.uploadFile(
              applicationData.resumeFile.buffer,
              applicationData.resumeFile.originalname,
              { folder: `applications/temp` }
            );
            const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
            resumeUrl = `${API_BASE_URL}${uploadResult.url}`;
            console.log('💾 Resume uploaded to Local Storage:', resumeUrl);
          }
        } catch (error: any) {
          console.error('❌ Failed to parse resume:', {
            error: error.message,
            stack: error.stack,
          });
          // Continue without parsing - resume will still be saved
          // Capture error in resumeText for debugging purposes if parsing failed
          resumeText = `[Parsing Error] ${error.message}`;
        }
      } else {
        console.log('⚠️ No resume file provided for parsing');
      }

      // Step 5: Create candidate account
      const passwordHash = await hashPassword(applicationData.password);

      // Extract name from parsed resume or use provided/default
      const firstName = parsedResumeData?.firstName || applicationData.firstName || 'Candidate';
      const lastName = parsedResumeData?.lastName || applicationData.lastName || 'User';
      const phone = parsedResumeData?.phone || applicationData.phone;

      candidate = await CandidateModel.create({
        email,
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone?.trim(),
      });

      // Step 5.5: Create CandidateResume record if resume was uploaded and parsed
      if (applicationData.resumeFile && resumeUrl) {
        try {
          console.log('📄 Creating CandidateResume record...');
          await CandidateDocumentService.uploadResume(
            candidate.id,
            applicationData.resumeFile.originalname,
            resumeUrl,
            applicationData.resumeFile.size,
            applicationData.resumeFile.mimetype,
            resumeText
          );
          console.log('✅ CandidateResume record created');
        } catch (error: any) {
          console.error('❌ Failed to create CandidateResume record:', error.message);
          // Continue execution - don't fail the whole application
        }
      }

      // Step 6: Save parsed resume data (work history, skills, education, etc.)
      if (parsedResumeData) {
        console.log('📄 Parsed resume data:', {
          workExperience: parsedResumeData.workExperience?.length || 0,
          skills: parsedResumeData.skills?.length || 0,
          education: parsedResumeData.education?.length || 0,
          certifications: parsedResumeData.certifications?.length || 0,
          training: parsedResumeData.training?.length || 0,
        });

        try {
          // Save work experience
          if (parsedResumeData.workExperience && parsedResumeData.workExperience.length > 0) {
            console.log(`💼 Saving ${parsedResumeData.workExperience.length} work experience entries...`);
            for (const exp of parsedResumeData.workExperience) {
              try {
                // Handle date conversion - dates come as ISO strings from parser
                let startDate: Date;
                if (exp.startDate) {
                  startDate = new Date(exp.startDate);
                  if (isNaN(startDate.getTime())) {
                    console.warn('Invalid startDate:', exp.startDate, 'using current date');
                    startDate = new Date();
                  }
                } else {
                  console.warn('Missing startDate for work experience, using current date');
                  startDate = new Date();
                }

                let endDate: Date | null = null;
                if (exp.endDate) {
                  endDate = new Date(exp.endDate);
                  if (isNaN(endDate.getTime())) {
                    endDate = null;
                  }
                }

                await CandidateService.addWorkExperience(candidate.id, {
                  company: exp.company || 'Unknown Company',
                  role: exp.role || 'Unknown Role',
                  startDate,
                  endDate,
                  current: exp.current || false,
                  description: exp.description || undefined,
                  location: exp.location || undefined,
                });
                console.log('✅ Saved work experience:', exp.company, exp.role);
              } catch (error: any) {
                console.error('❌ Failed to save work experience:', {
                  company: exp.company,
                  role: exp.role,
                  error: error.message,
                  stack: error.stack,
                });
              }
            }
          }

          // Save skills
          if (parsedResumeData.skills && parsedResumeData.skills.length > 0) {
            console.log(`🎯 Saving ${parsedResumeData.skills.length} skills...`);
            try {
              const skillsToSave = parsedResumeData.skills.map((skill: any) => ({
                name: typeof skill === 'string' ? skill : (skill.name || 'Unknown Skill'),
                level: skill.level || 'intermediate',
              }));
              await CandidateService.updateSkills(candidate.id, skillsToSave);
              console.log('✅ Saved skills:', skillsToSave.length);
            } catch (error: any) {
              console.error('❌ Failed to save skills:', {
                error: error.message,
                stack: error.stack,
              });
            }
          }

          // Save education
          if (parsedResumeData.education && parsedResumeData.education.length > 0) {
            console.log(`🎓 Saving ${parsedResumeData.education.length} education entries...`);
            for (const edu of parsedResumeData.education) {
              try {
                // CandidateQualificationsService expects date strings, not Date objects
                let startDate: string | undefined;
                if (edu.startDate) {
                  const date = new Date(edu.startDate);
                  if (!isNaN(date.getTime())) {
                    startDate = date.toISOString();
                  }
                }

                let endDate: string | undefined;
                if (edu.endDate) {
                  const date = new Date(edu.endDate);
                  if (!isNaN(date.getTime())) {
                    endDate = date.toISOString();
                  }
                }

                await CandidateQualificationsService.addEducation(candidate.id, {
                  institution: edu.institution || 'Unknown Institution',
                  degree: edu.degree || 'Unknown Degree',
                  field: edu.field || 'Unknown Field',
                  startDate,
                  endDate,
                  current: edu.current || false,
                  grade: edu.grade || undefined,
                  description: edu.description || undefined,
                });
                console.log('✅ Saved education:', edu.institution, edu.degree);
              } catch (error: any) {
                console.error('❌ Failed to save education:', {
                  institution: edu.institution,
                  degree: edu.degree,
                  error: error.message,
                  stack: error.stack,
                });
              }
            }
          }

          // Save certifications
          if (parsedResumeData.certifications && parsedResumeData.certifications.length > 0) {
            console.log(`🏆 Saving ${parsedResumeData.certifications.length} certifications...`);
            for (const cert of parsedResumeData.certifications) {
              try {
                // CandidateQualificationsService expects date strings, not Date objects
                let issueDate: string | undefined;
                if (cert.issueDate) {
                  const date = new Date(cert.issueDate);
                  if (!isNaN(date.getTime())) {
                    issueDate = date.toISOString();
                  }
                }

                let expiryDate: string | undefined;
                if (cert.expiryDate) {
                  const date = new Date(cert.expiryDate);
                  if (!isNaN(date.getTime())) {
                    expiryDate = date.toISOString();
                  }
                }

                await CandidateQualificationsService.addCertification(candidate.id, {
                  name: cert.name || 'Unknown Certification',
                  issuingOrg: cert.issuingOrg || 'Unknown Organization',
                  issueDate,
                  expiryDate,
                  credentialId: cert.credentialId || undefined,
                  credentialUrl: cert.credentialUrl || undefined,
                  doesNotExpire: cert.doesNotExpire || false,
                });
                console.log('✅ Saved certification:', cert.name);
              } catch (error: any) {
                console.error('❌ Failed to save certification:', {
                  name: cert.name,
                  error: error.message,
                  stack: error.stack,
                });
              }
            }
          }

          // Save training
          if (parsedResumeData.training && parsedResumeData.training.length > 0) {
            console.log(`📚 Saving ${parsedResumeData.training.length} training entries...`);
            for (const train of parsedResumeData.training) {
              try {
                // CandidateQualificationsService expects date strings, not Date objects
                let completedDate: string | undefined;
                if (train.completedDate) {
                  const date = new Date(train.completedDate);
                  if (!isNaN(date.getTime())) {
                    completedDate = date.toISOString();
                  }
                }

                await CandidateQualificationsService.addTraining(candidate.id, {
                  courseName: train.courseName || 'Unknown Course',
                  provider: train.provider || 'Unknown Provider',
                  completedDate,
                  duration: train.duration || undefined,
                  description: train.description || undefined,
                  certificateUrl: train.certificateUrl || undefined,
                });
                console.log('✅ Saved training:', train.courseName);
              } catch (error: any) {
                console.error('❌ Failed to save training:', {
                  courseName: train.courseName,
                  error: error.message,
                  stack: error.stack,
                });
              }
            }
          }

          console.log('✅ Successfully saved all parsed resume data');
        } catch (error: any) {
          console.error('❌ Failed to save parsed resume data:', {
            error: error.message,
            stack: error.stack,
          });
          // Continue even if parsing fails
        }
      } else {
        console.log('⚠️ No parsed resume data to save');
      }

      // Step 7: Save documents to candidate documents
      // Save resume
      if (resumeUrl && applicationData.resumeFile) {
        try {
          // Re-upload to candidate's folder if we have the file
          if (CloudinaryService.isConfigured() && applicationData.resumeFile) {
            const uploadResult = await CloudinaryService.uploadFile(
              applicationData.resumeFile.buffer,
              applicationData.resumeFile.originalname,
              {
                folder: `hrm8/candidates/${candidate.id}/resumes`,
                resourceType: 'raw',
              }
            );
            resumeUrl = uploadResult.secureUrl;
          }

          const resumeDoc = await CandidateDocumentService.uploadResume(
            candidate.id,
            applicationData.resumeFile.originalname,
            resumeUrl,
            applicationData.resumeFile.size,
            applicationData.resumeFile.mimetype,
            resumeText
          );

          // Set as default if it's the first resume
          const { prisma } = await import('../../lib/prisma');
          const resumeCount = await prisma.candidateResume.count({
            where: { candidate_id: candidate.id },
          });
          if (resumeCount === 1) {
            await CandidateDocumentService.setDefaultResume(candidate.id, resumeDoc.id);
          }
        } catch (error) {
          console.error('Failed to save resume to documents:', error);
        }
      }

      // Save cover letter
      if (applicationData.coverLetterFile && applicationData.coverLetterUrl) {
        try {
          if (CloudinaryService.isConfigured()) {
            const uploadResult = await CloudinaryService.uploadFile(
              applicationData.coverLetterFile.buffer,
              applicationData.coverLetterFile.originalname,
              {
                folder: `hrm8/candidates/${candidate.id}/cover-letters`,
                resourceType: 'raw',
              }
            );
            await CandidateDocumentService.createCoverLetter(candidate.id, {
              title: applicationData.coverLetterFile.originalname,
              fileUrl: uploadResult.secureUrl,
              fileName: applicationData.coverLetterFile.originalname,
              fileSize: applicationData.coverLetterFile.size,
              fileType: applicationData.coverLetterFile.mimetype,
            });
          }
        } catch (error) {
          console.error('Failed to save cover letter to documents:', error);
        }
      } else if (applicationData.coverLetterUrl && applicationData.questionnaireData?.coverLetterMarkdown) {
        // Save cover letter as text content
        try {
          await CandidateDocumentService.createCoverLetter(candidate.id, {
            title: 'Cover Letter',
            content: applicationData.questionnaireData.coverLetterMarkdown,
          });
        } catch (error) {
          console.error('Failed to save cover letter content:', error);
        }
      }

      // Save portfolio
      if (applicationData.portfolioFile && applicationData.portfolioUrl) {
        try {
          if (CloudinaryService.isConfigured()) {
            const uploadResult = await CloudinaryService.uploadFile(
              applicationData.portfolioFile.buffer,
              applicationData.portfolioFile.originalname,
              {
                folder: `hrm8/candidates/${candidate.id}/portfolio`,
                resourceType: 'raw',
              }
            );
            await CandidateDocumentService.createPortfolioItem(candidate.id, {
              title: applicationData.portfolioFile.originalname,
              type: 'file',
              fileUrl: uploadResult.secureUrl,
              fileName: applicationData.portfolioFile.originalname,
              fileSize: applicationData.portfolioFile.size,
              fileType: applicationData.portfolioFile.mimetype,
            });
          }
        } catch (error) {
          console.error('Failed to save portfolio to documents:', error);
        }
      }

      // Step 8: Create application
      const application = await ApplicationModel.create({
        candidateId: candidate.id,
        jobId: applicationData.jobId,
        resumeUrl: resumeUrl,
        coverLetterUrl: applicationData.coverLetterUrl,
        portfolioUrl: applicationData.portfolioUrl,
        linkedInUrl: applicationData.linkedInUrl,
        websiteUrl: applicationData.websiteUrl,
        customAnswers: applicationData.customAnswers,
        questionnaireData: applicationData.questionnaireData,
        tags: applicationData.tags,
      });

      // Step 9: Create session for auto-login
      const { generateSessionId, getSessionExpiration } = await import('../../utils/session');
      const { CandidateSessionModel } = await import('../../models/CandidateSession');
      const sessionId = generateSessionId();
      const expiresAt = getSessionExpiration(24); // 24 hours

      await CandidateSessionModel.create(
        sessionId,
        candidate.id,
        candidate.email,
        expiresAt
      );

      // Auto-create conversation for candidate ↔ job owner/consultant
      try {
        const { prisma } = await import('../../lib/prisma');
        const existingConversation = await prisma.conversation.findFirst({
          where: { job_id: job.id, candidate_id: candidate.id },
        });

        if (!existingConversation) {
          const owner = job.createdBy
            ? await prisma.user.findUnique({ where: { id: job.createdBy } })
            : null;
          const consultant = job.assignedConsultantId
            ? await prisma.consultant.findUnique({ where: { id: job.assignedConsultantId } })
            : null;

          // Build participants array
          const participants: Array<{
            participantType: ParticipantType;
            participantId: string;
            participantEmail: string;
            displayName: string;
          }> = [
              {
                participantType: ParticipantType.CANDIDATE,
                participantId: candidate.id,
                participantEmail: candidate.email,
                displayName: `${candidate.firstName} ${candidate.lastName}`.trim(),
              },
            ];

          if (owner) {
            participants.push({
              participantType: ParticipantType.EMPLOYER,
              participantId: owner.id,
              participantEmail: owner.email,
              displayName: owner.name || owner.email,
            });
          }

          if (consultant) {
            participants.push({
              participantType: ParticipantType.CONSULTANT,
              participantId: consultant.id,
              participantEmail: consultant.email,
              displayName: `${consultant.first_name} ${consultant.last_name}`.trim(),
            });
          }

          // Only create conversation if we have at least one other participant (owner or consultant)
          if (owner || consultant) {
            console.log(`💬 Creating conversation for anonymous application - Job: ${job.id}, Candidate: ${candidate.id}, Owner: ${owner?.id || 'none'}, Consultant: ${consultant?.id || 'none'}`);

            const newConversation = await prisma.conversation.create({
              data: {
                job_id: job.id,
                candidate_id: candidate.id,
                employer_user_id: owner?.id,
                consultant_id: consultant?.id,
                channel_type: consultant ? 'CANDIDATE_CONSULTANT' : 'CANDIDATE_EMPLOYER',
                status: 'ACTIVE',
                participants: {
                  create: participants.map(p => ({
                    participant_type: p.participantType,
                    participant_id: p.participantId,
                    participant_email: p.participantEmail,
                    display_name: p.displayName,
                  })),
                },
              },
            });

            console.log(`✅ Conversation created: ${newConversation.id}`);

            // Create initial system message
            try {
              const { ConversationService } = await import('../messaging/ConversationService');
              await ConversationService.createMessage({
                conversationId: newConversation.id,
                senderType: ParticipantType.SYSTEM,
                senderId: 'system',
                senderEmail: 'system@hrm8.com',
                content: `Your application for "${job.title}" has been submitted successfully! 🎉\n\nYou can use this conversation to communicate with ${consultant ? 'your HRM8 consultant' : 'the employer'} about your application. We'll keep you updated on any status changes.`,
              });
              console.log(`✅ Initial system message created for conversation ${newConversation.id}`);
            } catch (msgError) {
              console.error('❌ Failed to create initial system message:', msgError);
              // Don't fail the application submission if message creation fails
            }
          } else {
            console.warn(`⚠️ Skipping conversation creation - no owner or consultant for job ${job.id}`);
          }
        } else {
          console.log(`ℹ️ Conversation already exists for job ${job.id} and candidate ${candidate.id}`);
        }
      } catch (convError) {
        console.error('❌ Failed to auto-create conversation on anonymous application submit:', convError);
      }

      return {
        application,
        candidate: {
          id: candidate.id,
          email: candidate.email,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
        },
        sessionId,
        password: applicationData.password, // Return password for email notification
      };
    } catch (error: any) {
      console.error('Failed to submit anonymous application:', error);
      if (error.message.includes('already exists')) {
        return { error: 'You have already applied to this job', code: 'APPLICATION_EXISTS' };
      }
      return { error: error.message || 'Failed to submit application', code: 'SUBMIT_FAILED' };
    }
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
        application_id_job_round_id: {
          application_id: applicationId,
          job_round_id: jobRoundId,
        },
      },
      create: {
        application_id: applicationId,
        job_round_id: jobRoundId,
        completed: false,
        updated_at: new Date(),
      },
      update: {
        // Reset completion if moving to a round
        completed: false,
        completed_at: null,
        updated_at: new Date(),
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

    // Trigger email automations for round entry
    try {
      const { EmailAutomationService } = await import('../email/EmailAutomationService');
      await EmailAutomationService.handleApplicationRoundEntry(applicationId, jobRoundId, userId);
    } catch (error) {
      // Log error but don't fail the move operation
      console.error('Failed to trigger email automations:', error);
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