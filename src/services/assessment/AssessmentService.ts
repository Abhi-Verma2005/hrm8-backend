/**
 * Assessment Service
 * Handles assessment creation, assignment, and auto-assignment logic
 */

import { AssessmentModel } from '../../models/Assessment';
import { AssessmentConfigurationModel } from '../../models/AssessmentConfiguration';
import { JobRoundModel } from '../../models/JobRound';
import { ApplicationModel } from '../../models/Application';
import { AssessmentType, AssessmentStatus } from '@prisma/client';
import { emailService } from '../email/EmailService';
import { prisma } from '../../lib/prisma';
import crypto from 'crypto';

export interface CreateAssessmentRequest {
  applicationId: string;
  jobRoundId: string;
  invitedBy: string;
  assessmentType?: AssessmentType;
  questions?: any[];
}

export interface ConfigureAssessmentRequest {
  jobRoundId: string;
  enabled: boolean;
  autoAssign?: boolean;
  deadlineDays?: number;
  timeLimitMinutes?: number;
  passThreshold?: number;
  provider?: string;
  providerConfig?: any;
  questions?: any[];
  instructions?: string;
}

export class AssessmentService {
  /**
   * Auto-assign assessment when candidate enters an assessment round
   */
  static async autoAssignAssessment(
    applicationId: string,
    jobRoundId: string,
    invitedBy: string
  ): Promise<void> {
    // Get the job round and check if it's an assessment round
    const round = await JobRoundModel.findById(jobRoundId);
    if (!round || round.type !== 'ASSESSMENT') {
      return; // Not an assessment round, skip
    }

    // Get assessment configuration for this round
    const config = await AssessmentConfigurationModel.findByJobRoundId(jobRoundId);
    
    // Only auto-assign if enabled and autoAssign is true
    if (!config || !config.enabled || !config.autoAssign) {
      return; // Auto-assignment not enabled
    }

    // Check if assessment already exists for this application and round
    const existingAssessment = await prisma.assessment.findFirst({
      where: {
        application_id: applicationId,
        job_round_id: jobRoundId,
      },
    });

    if (existingAssessment) {
      return; // Assessment already assigned
    }

    // Get application details
    const application = await ApplicationModel.findById(applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    // Calculate expiry date based on deadlineDays
    let expiryDate: Date | undefined;
    if (config.deadlineDays) {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + config.deadlineDays);
    }

    // Create assessment
    const assessment = await AssessmentModel.create({
      applicationId,
      candidateId: application.candidateId,
      jobId: application.jobId,
      jobRoundId,
      assessmentType: AssessmentType.SKILLS_BASED, // Default, can be configured
      provider: config.provider || 'native',
      invitedBy,
      expiryDate,
      passThreshold: config.passThreshold || undefined,
    });

    // Create questions if provided in config
    if (config.questions && Array.isArray(config.questions)) {
      await this.createQuestions(assessment.id, config.questions);
    }

    // Send invitation email and update status to INVITED
    await this.sendAssessmentInvitation(assessment.id, assessment.invitationToken!);
    
    // Update assessment status to INVITED after sending email
    await AssessmentModel.update(assessment.id, {
      status: AssessmentStatus.INVITED,
    });

    // Update ApplicationRoundProgress to link the assessment
    await prisma.applicationRoundProgress.updateMany({
      where: {
        applicationId: applicationId,
        jobRoundId: jobRoundId,
      },
      data: {
        assessmentId: assessment.id,
      },
    });
  }

  /**
   * Create assessment configuration for a job round
   */
  static async configureAssessment(
    request: ConfigureAssessmentRequest
  ): Promise<void> {
    const existing = await AssessmentConfigurationModel.findByJobRoundId(request.jobRoundId);
    
    if (existing) {
      await AssessmentConfigurationModel.update(request.jobRoundId, {
        enabled: request.enabled,
        autoAssign: request.autoAssign ?? true,
        deadlineDays: request.deadlineDays,
        timeLimitMinutes: request.timeLimitMinutes,
        passThreshold: request.passThreshold,
        provider: request.provider,
        providerConfig: request.providerConfig,
        questions: request.questions,
        instructions: request.instructions,
      });
    } else {
      await AssessmentConfigurationModel.create({
        jobRoundId: request.jobRoundId,
        enabled: request.enabled,
        autoAssign: request.autoAssign ?? true,
        deadlineDays: request.deadlineDays,
        timeLimitMinutes: request.timeLimitMinutes,
        passThreshold: request.passThreshold,
        provider: request.provider || 'native',
        providerConfig: request.providerConfig,
        questions: request.questions,
        instructions: request.instructions,
      });
    }
  }

  /**
   * Create questions for an assessment
   */
  static async createQuestions(assessmentId: string, questions: any[]): Promise<void> {
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      await prisma.assessmentQuestion.create({
        data: {
          id: crypto.randomUUID(),
          assessment_id: assessmentId,
          question_text: question.questionText || question.text,
          question_type: question.type || 'MULTIPLE_CHOICE',
          options: question.options || null,
          correct_answer: question.correctAnswer || null,
          points: question.points || 1,
          order: question.order ?? i,
        },
      });
    }
  }

  /**
   * Send assessment invitation email
   */
  static async sendAssessmentInvitation(
    assessmentId: string,
    invitationToken: string
  ): Promise<void> {
    const assessment = await AssessmentModel.findById(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Get application with candidate and job details
    const application = await prisma.application.findUnique({
      where: { id: assessment.applicationId },
      include: {
        candidate: true,
        job: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!application || !application.candidate || !application.job) {
      throw new Error('Application details not found');
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const assessmentUrl = `${baseUrl}/assessment/${invitationToken}`;

    await emailService.sendAssessmentInvitationEmail({
      to: application.candidate.email,
      candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
      jobTitle: application.job.title,
      companyName: application.job.company?.name || 'Our Company',
      assessmentUrl,
      expiryDate: assessment.expiryDate,
      deadlineDays: assessment.expiryDate 
        ? Math.ceil((assessment.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : undefined,
    });
  }

  /**
   * Mark assessment as started when candidate clicks the link
   */
  static async markAssessmentStarted(assessmentId: string): Promise<void> {
    const assessment = await AssessmentModel.findById(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Only update if currently in INVITED or PENDING_INVITATION status
    if (assessment.status === AssessmentStatus.INVITED || assessment.status === AssessmentStatus.PENDING_INVITATION) {
      await AssessmentModel.update(assessmentId, {
        status: AssessmentStatus.IN_PROGRESS,
      });
    }
  }

  /**
   * Submit assessment with candidate responses
   */
  static async submitAssessment(
    assessmentId: string,
    responses: Array<{
      questionId: string;
      response: any;
    }>
  ): Promise<void> {
    const assessment = await AssessmentModel.findById(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Check if assessment is expired
    if (assessment.expiryDate && new Date() > assessment.expiryDate) {
      throw new Error('Assessment has expired');
    }

    // Save responses
    for (const responseData of responses) {
      await prisma.assessmentResponse.create({
        data: {
          id: crypto.randomUUID(),
          assessment_id: assessmentId,
          question_id: responseData.questionId,
          candidate_id: assessment.candidateId,
          response: responseData.response,
        },
      });
    }

    // Update assessment status and completion time
    const completedAt = new Date();
    await AssessmentModel.update(assessmentId, {
      status: AssessmentStatus.COMPLETED,
      completedAt,
    });

    // Auto-score the assessment
    await this.scoreAssessment(assessmentId);

    // Send completion email to candidate
    await this.sendAssessmentCompletion(assessmentId, completedAt);
  }

  /**
   * Auto-score assessment based on correct answers
   */
  static async scoreAssessment(assessmentId: string): Promise<{
    totalScore: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
  }> {
    const assessment = await AssessmentModel.findById(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Get all questions with correct answers
    const questions = await prisma.assessmentQuestion.findMany({
      where: { assessment_id: assessmentId },
      orderBy: { order: 'asc' },
    });

    // Get all responses
    const responses = await prisma.assessmentResponse.findMany({
      where: { assessment_id: assessmentId },
    });

    let totalScore = 0;
    let maxScore = 0;

    // Score each question
    for (const question of questions) {
      maxScore += question.points;
      const response = responses.find(r => r.question_id === question.id);

      if (response && question.correct_answer) {
        const isCorrect = this.checkAnswer(question.question_type, response.response, question.correct_answer);
        if (isCorrect) {
          totalScore += question.points;
        }
      }
    }

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const passed = assessment.passThreshold 
      ? percentage >= assessment.passThreshold 
      : undefined;

    // Update assessment with results
    await AssessmentModel.update(assessmentId, {
      results: {
        totalScore,
        maxScore,
        percentage: Math.round(percentage * 100) / 100,
        passed,
        scoredAt: new Date().toISOString(),
      },
    });

    // Send results notification to recruiter if scored
    if (passed !== undefined) {
      await this.sendAssessmentResultsNotification(assessmentId, {
        totalScore,
        maxScore,
        percentage,
        passed,
      });
    }

    return { totalScore, maxScore, percentage, passed: passed || false };
  }

  /**
   * Check if an answer is correct based on question type
   */
  private static checkAnswer(questionType: string, response: any, correctAnswer: any): boolean {
    switch (questionType) {
      case 'MULTIPLE_CHOICE':
        return response === correctAnswer;
      
      case 'MULTIPLE_SELECT':
        if (!Array.isArray(response) || !Array.isArray(correctAnswer)) {
          return false;
        }
        const responseSet = new Set(response);
        const correctSet = new Set(correctAnswer);
        return responseSet.size === correctSet.size && 
               [...responseSet].every(item => correctSet.has(item));
      
      case 'SHORT_ANSWER':
      case 'LONG_ANSWER':
        // For text answers, do a case-insensitive comparison
        const responseText = String(response).trim().toLowerCase();
        const correctText = String(correctAnswer).trim().toLowerCase();
        return responseText === correctText;
      
      default:
        return false;
    }
  }

  /**
   * Send completion email to candidate
   */
  private static async sendAssessmentCompletion(
    assessmentId: string,
    completedAt: Date
  ): Promise<void> {
    const assessment = await AssessmentModel.findById(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const application = await prisma.application.findUnique({
      where: { id: assessment.applicationId },
      include: {
        candidate: true,
        job: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!application || !application.candidate || !application.job) {
      throw new Error('Application details not found');
    }

    await emailService.sendAssessmentCompletionEmail({
      to: application.candidate.email,
      candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
      jobTitle: application.job.title,
      companyName: application.job.company?.name || 'Our Company',
      completedAt,
    });
  }

  /**
   * Send results notification to recruiter
   */
  private static async sendAssessmentResultsNotification(
    assessmentId: string,
    scoringResult: {
      totalScore: number;
      maxScore: number;
      percentage: number;
      passed: boolean;
    }
  ): Promise<void> {
    const assessment = await AssessmentModel.findById(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const application = await prisma.application.findUnique({
      where: { id: assessment.applicationId },
      include: {
        candidate: true,
        job: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!application || !application.candidate || !application.job) {
      throw new Error('Application details not found');
    }

    // Get recruiter (user who invited)
    const recruiter = await prisma.user.findUnique({
      where: { id: assessment.invitedBy },
    });

    if (!recruiter) {
      console.warn(`Recruiter not found for assessment ${assessmentId}`);
      return;
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const assessmentUrl = `${baseUrl}/jobs/${application.job.id}/applications/${application.id}?tab=assessments`;
    const candidateProfileUrl = `${baseUrl}/jobs/${application.job.id}/applications/${application.id}`;

    await emailService.sendAssessmentResultsNotification({
      to: recruiter.email,
      recruiterName: recruiter.name,
      candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
      jobTitle: application.job.title,
      companyName: application.job.company?.name || 'Our Company',
      assessmentScore: scoringResult.totalScore,
      passThreshold: assessment.passThreshold || undefined,
      passed: scoringResult.passed,
      assessmentUrl,
      candidateProfileUrl,
    });
  }
}

