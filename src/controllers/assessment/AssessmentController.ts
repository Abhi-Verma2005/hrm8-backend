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

      res.json({
        success: true,
        data: {
          assessment: {
            id: assessment.id,
            status: assessment.status,
            expiryDate: assessment.expiryDate,
            passThreshold: assessment.passThreshold,
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
          AssessmentQuestion: true,
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
}

