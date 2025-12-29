/**
 * Assessment Controller
 * Handles HTTP requests for assessment management
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { AssessmentService, ConfigureAssessmentRequest } from '../../services/assessment/AssessmentService';
import { AssessmentConfigurationModel } from '../../models/AssessmentConfiguration';
import { AssessmentModel } from '../../models/Assessment';
import { prisma } from '../../lib/prisma';

export class AssessmentController {
  /**
   * Get assessment configuration for a job round
   * GET /api/jobs/:jobId/rounds/:roundId/assessment-config
   */
  static async getAssessmentConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { roundId } = req.params;

      if (!roundId) {
        res.status(400).json({
          success: false,
          error: 'Round ID is required',
        });
        return;
      }

      const config = await AssessmentConfigurationModel.findByJobRoundId(roundId);

      res.json({
        success: true,
        data: { config: config || null },
      });
    } catch (error) {
      console.error('[AssessmentController.getAssessmentConfig] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get assessment configuration',
      });
    }
  }

  /**
   * Configure assessment for a job round
   * POST /api/jobs/:jobId/rounds/:roundId/assessment-config
   */
  static async configureAssessment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { roundId } = req.params;
      const configData: ConfigureAssessmentRequest = {
        jobRoundId: roundId,
        enabled: req.body.enabled ?? false,
        autoAssign: req.body.autoAssign ?? true,
        deadlineDays: req.body.deadlineDays,
        timeLimitMinutes: req.body.timeLimitMinutes,
        passThreshold: req.body.passThreshold,
        provider: req.body.provider || 'native',
        providerConfig: req.body.providerConfig,
        questions: req.body.questions,
        instructions: req.body.instructions,
      };

      if (!roundId) {
        res.status(400).json({
          success: false,
          error: 'Round ID is required',
        });
        return;
      }

      await AssessmentService.configureAssessment(configData);

      res.json({
        success: true,
        data: { message: 'Assessment configuration saved successfully' },
      });
    } catch (error) {
      console.error('[AssessmentController.configureAssessment] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to configure assessment',
      });
    }
  }

  /**
   * Get assessment by invitation token (for candidate portal)
   * GET /api/public/assessment/:token
   */
  static async getAssessmentByToken(req: any, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Token is required',
        });
        return;
      }

      const assessment = await AssessmentModel.findByInvitationToken(token);

      if (!assessment) {
        res.status(404).json({
          success: false,
          error: 'Assessment not found',
        });
        return;
      }

      // Get questions for the assessment
      const questions = await prisma.assessmentQuestion.findMany({
        where: { assessment_id: assessment.id },
        orderBy: { order: 'asc' },
      });

      // Get configuration if it exists (for time limit and instructions)
      let config = null;
      if (assessment.jobRoundId) {
        config = await prisma.assessmentConfiguration.findUnique({
          where: { job_round_id: assessment.jobRoundId }
        });
      }

      res.json({
        success: true,
        data: {
          assessment: {
            id: assessment.id,
            status: assessment.status,
            expiryDate: assessment.expiryDate,
            passThreshold: assessment.passThreshold,
            timeLimitMinutes: config?.time_limit_minutes || null,
            instructions: config?.instructions || null,
          },
          questions: questions.map(q => ({
            id: q.id,
            questionText: q.question_text,
            questionType: q.question_type,
            options: q.options,
            points: q.points,
            order: q.order,
          })),
        },
      });
    } catch (error) {
      console.error('[AssessmentController.getAssessmentByToken] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get assessment',
      });
    }
  }

  /**
   * Mark assessment as started (candidate portal)
   * POST /api/public/assessment/:token/start
   */
  static async startAssessment(req: any, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Token is required',
        });
        return;
      }

      const assessment = await AssessmentModel.findByInvitationToken(token);

      if (!assessment) {
        res.status(404).json({
          success: false,
          error: 'Assessment not found',
        });
        return;
      }

      await AssessmentService.markAssessmentStarted(assessment.id);

      res.json({
        success: true,
        data: { message: 'Assessment started successfully' },
      });
    } catch (error) {
      console.error('[AssessmentController.startAssessment] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start assessment',
      });
    }
  }

  /**
   * Submit assessment (candidate portal)
   * POST /api/public/assessment/:token/submit
   */
  static async submitAssessment(req: any, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const { responses } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'Token is required',
        });
        return;
      }

      if (!responses || !Array.isArray(responses)) {
        res.status(400).json({
          success: false,
          error: 'Responses array is required',
        });
        return;
      }

      const assessment = await AssessmentModel.findByInvitationToken(token);

      if (!assessment) {
        res.status(404).json({
          success: false,
          error: 'Assessment not found',
        });
        return;
      }

      await AssessmentService.submitAssessment(assessment.id, responses);

      res.json({
        success: true,
        data: { message: 'Assessment submitted successfully' },
      });
    } catch (error) {
      console.error('[AssessmentController.submitAssessment] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit assessment',
      });
    }
  }

  /**
   * Get assessment results (recruiter)
   * GET /api/assessments/:id/results
   */
  static async getAssessmentResults(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;

      const assessment = await AssessmentModel.findById(id);

      if (!assessment) {
        res.status(404).json({
          success: false,
          error: 'Assessment not found',
        });
        return;
      }

      // Get questions and responses
      const questions = await prisma.assessmentQuestion.findMany({
        where: { assessment_id: id },
        orderBy: { order: 'asc' },
      });

      const responses = await prisma.assessmentResponse.findMany({
        where: { assessment_id: id },
        include: {
          assessment_question: true,
        },
      });

      res.json({
        success: true,
        data: {
          assessment: {
            id: assessment.id,
            status: assessment.status,
            results: assessment.results,
            completedAt: assessment.completedAt,
            passThreshold: assessment.passThreshold,
          },
          questions: questions.map(q => ({
            id: q.id,
            questionText: q.question_text,
            questionType: q.question_type,
            options: q.options,
            correctAnswer: q.correct_answer,
            points: q.points,
            order: q.order,
          })),
          responses: responses.map(r => ({
            id: r.id,
            questionId: r.question_id,
            response: r.response,
            score: r.score,
            answeredAt: r.answered_at,
          })),
        },
      });
    } catch (error) {
      console.error('[AssessmentController.getAssessmentResults] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get assessment results',
      });
    }
  }

  /**
   * Manually score assessment (recruiter)
   * POST /api/assessments/:id/score
   */
  static async scoreAssessment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;

      const assessment = await AssessmentModel.findById(id);

      if (!assessment) {
        res.status(404).json({
          success: false,
          error: 'Assessment not found',
        });
        return;
      }

      const result = await AssessmentService.scoreAssessment(id);

      res.json({
        success: true,
        data: {
          scoringResult: result,
          message: 'Assessment scored successfully',
        },
      });
    } catch (error) {
      console.error('[AssessmentController.scoreAssessment] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to score assessment',
      });
    }
  }

  /**
   * Get all assessments for a job round
   * GET /api/jobs/:jobId/rounds/:roundId/assessments
   */
  static async getRoundAssessments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const { roundId } = req.params;

      // Get current round order to check for progression
      const currentRound = await prisma.jobRound.findUnique({
        where: { id: roundId },
        select: { order: true }
      });

      if (!currentRound) {
        res.status(404).json({ success: false, error: 'Round not found' });
        return;
      }

      // Get application details for these assessments
      const assessmentsRaw = await prisma.assessment.findMany({
        where: { job_round_id: roundId },
        orderBy: { created_at: 'desc' }
      });

      const applicationIds = Array.from(new Set(assessmentsRaw.map(a => a.application_id)));
      const applications = await prisma.application.findMany({
        where: { id: { in: applicationIds } },
        include: {
          candidate: {
            select: { first_name: true, last_name: true, email: true }
          },
          application_round_progress: {
            include: {
              job_round: {
                select: { order: true }
              }
            }
          }
        }
      });
      const appMap = new Map(applications.map(app => [app.id, app]));

      // Compute average score per assessment from all AssessmentGrade entries
      const assessmentIds = assessmentsRaw.map(a => a.id);
      const grades = await prisma.assessmentGrade.findMany({
        where: {
          assessment_response: {
            assessment_id: { in: assessmentIds }
          }
        },
        select: {
          score: true,
          assessment_response: { select: { assessment_id: true } }
        }
      });
      const avgMap = new Map<string, { sum: number; count: number }>();
      for (const g of grades) {
        if (g.score === null || g.score === undefined) continue;
        const aid = g.assessment_response.assessment_id;
        const prev = avgMap.get(aid) || { sum: 0, count: 0 };
        prev.sum += g.score;
        prev.count += 1;
        avgMap.set(aid, prev);
      }
      // Map to friendly format
      const mappedAssessments = assessmentsRaw.map(a => {
        const app = appMap.get(a.application_id);
        const name = app?.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : '';
        const email = app?.candidate?.email || '';
        
        // Check if candidate has moved to next round:
        // 1. Explicitly marked as completed in this round
        // 2. Has a progress record for a round with a higher order
        const currentRoundProgress = app?.application_round_progress?.find(p => p.job_round_id === roundId);
        const hasLaterRound = app?.application_round_progress?.some(p => p.job_round && p.job_round.order > currentRound.order) || false;
        const isMovedToNextRound = (currentRoundProgress?.completed || false) || hasLaterRound;
        
        return {
          id: a.id,
          applicationId: a.application_id,
          candidateName: name,
          candidateEmail: email,
          status: a.status,
          score: a.results ? (a.results as any).score : null,
          averageScore: (() => {
            const agg = avgMap.get(a.id);
            if (!agg || agg.count === 0) return null;
            return Number((agg.sum / agg.count).toFixed(2));
          })(),
          invitedAt: a.invited_at,
          completedAt: a.completed_at,
          invitationToken: a.invitation_token,
          isMovedToNextRound: isMovedToNextRound,
          applicationStage: app?.stage
        };
      });

      res.json({
        success: true,
        data: mappedAssessments
      });
    } catch (error) {
      console.error('[AssessmentController.getRoundAssessments] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get round assessments',
      });
    }
  }

  /**
   * Resend assessment invitation
   * POST /api/assessments/:id/resend
   */
  static async resendAssessmentInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const { id } = req.params;

      const assessmentData = await AssessmentModel.findById(id);
      if (!assessmentData) {
        res.status(404).json({ success: false, error: 'Assessment not found' });
        return;
      }

      let token = assessmentData.invitationToken;
      if (!token) {
        token = AssessmentModel.generateInvitationToken();
        await AssessmentModel.update(id, { invitationToken: token });
      }

      await prisma.assessment.update({
        where: { id },
        data: { invited_at: new Date() }
      });

      await AssessmentService.sendAssessmentInvitation(id, token);

      res.json({
        success: true,
        data: { message: 'Invitation resent successfully' }
      });
    } catch (error) {
       console.error('[AssessmentController.resendAssessmentInvitation] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resend invitation',
      });
    }
  }

  /**
   * Get full assessment details for grading (including grades and comments)
   * GET /api/assessments/:id/grading
   */
  static async getAssessmentForGrading(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const { id } = req.params;

      const assessment = await prisma.assessment.findUnique({
        where: { id },
        include: {
          application: {
            select: {
              candidate: {
                select: {
                  first_name: true,
                  last_name: true,
                  email: true
                }
              }
            }
          },
          assessment_question: {
            orderBy: { order: 'asc' }
          },
          assessment_response: {
            include: {
              assessment_grade: {
                include: {
                  user: { select: { id: true, name: true } }
                }
              }
            }
          },
          assessment_comment: {
            include: {
              user: { select: { id: true, name: true } }
            },
            orderBy: { created_at: 'desc' }
          }
        }
      });

      if (!assessment) {
        res.status(404).json({ success: false, error: 'Assessment not found' });
        return;
      }

      res.json({
        success: true,
        data: assessment
      });
    } catch (error) {
      console.error('[AssessmentController.getAssessmentForGrading] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get assessment details',
      });
    }
  }

  /**
   * Grade a specific question response
   * POST /api/assessments/grade
   */
  static async gradeResponse(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      const { responseId, score, comment } = req.body;
      
      if (!responseId) {
        res.status(400).json({ success: false, error: 'Response ID is required' });
        return;
      }

      const grade = await prisma.assessmentGrade.upsert({
        where: {
          assessment_response_id_user_id: {
            assessment_response_id: responseId,
            user_id: req.user.id
          }
        },
        update: {
          score: score,
          comment: comment,
          updated_at: new Date()
        },
        create: {
          assessment_response_id: responseId,
          user_id: req.user.id,
          score: score,
          comment: comment,
          updated_at: new Date()
        }
      });

      res.json({
        success: true,
        data: grade
      });
    } catch (error) {
      console.error('[AssessmentController.gradeResponse] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save grade',
      });
    }
  }

  /**
   * Add overall comment to assessment
   * POST /api/assessments/:id/comment
   */
  static async addAssessmentComment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      const { id } = req.params;
      const { comment } = req.body;
      
      if (!comment) {
        res.status(400).json({ success: false, error: 'Comment is required' });
        return;
      }

      const newComment = await prisma.assessmentComment.create({
        data: {
          assessment_id: id,
          user_id: req.user.id,
          comment: comment,
          updated_at: new Date()
        },
        include: {
          user: { select: { id: true, name: true } }
        }
      });

      res.json({
        success: true,
        data: newComment
      });
    } catch (error) {
      console.error('[AssessmentController.addAssessmentComment] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add comment',
      });
    }
  }
}
