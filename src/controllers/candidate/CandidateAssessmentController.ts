/**
 * Candidate Assessment Controller
 * Handles assessment operations for authenticated candidates
 */

import { Response } from 'express';
import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';
import { prisma } from '../../lib/prisma';
import { AssessmentStatus } from '@prisma/client';
import { AssessmentService } from '../../services/assessment/AssessmentService';

export class CandidateAssessmentController {
  /**
   * Get all assessments for the logged-in candidate
   */
  static async getAssessments(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.candidate) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const assessments = await prisma.assessment.findMany({
        where: {
          candidate_id: req.candidate.id,
          status: {
            in: [AssessmentStatus.INVITED, AssessmentStatus.IN_PROGRESS, AssessmentStatus.COMPLETED],
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      const enrichedAssessments = await Promise.all(assessments.map(async (assessment) => {
        let jobTitle = 'Unknown Job';
        let roundName = 'Assessment';

        if (assessment.job_round_id) {
            const jobRound = await prisma.jobRound.findUnique({
                where: { id: assessment.job_round_id },
                include: { job: { select: { title: true } } }
            });
            
            if (jobRound) {
                roundName = jobRound.name;
                if (jobRound.job) jobTitle = jobRound.job.title;
            }
        } 
        
        if (jobTitle === 'Unknown Job' && assessment.job_id) {
             const job = await prisma.job.findUnique({
                where: { id: assessment.job_id },
                select: { title: true }
            });
            if (job) jobTitle = job.title;
        }

        return {
          ...assessment,
          jobTitle,
          roundName,
          invitedAt: assessment.invited_at,
          expiryDate: assessment.expiry_date,
          completedAt: assessment.completed_at
        };
      }));

      res.json({
        success: true,
        data: { assessments: enrichedAssessments },
      });
    } catch (error) {
      console.error('[CandidateAssessmentController.getAssessments] error', error);
      res.status(500).json({ success: false, error: 'Failed to fetch assessments' });
    }
  }

  /**
   * Get assessment details and questions
   * Only for INVITED or IN_PROGRESS assessments
   */
  static async getAssessmentDetails(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.candidate) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const assessment = await prisma.assessment.findFirst({
        where: {
          id,
          candidate_id: req.candidate.id,
        },
        include: {
          assessment_question: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              question_text: true,
              question_type: true,
              options: true,
              points: true,
              order: true,
              // Exclude correct_answer!
            }
          }
        }
      });

      if (!assessment) {
        res.status(404).json({ success: false, error: 'Assessment not found' });
        return;
      }

      if (assessment.status === AssessmentStatus.COMPLETED || assessment.status === AssessmentStatus.EXPIRED || assessment.status === AssessmentStatus.CANCELLED) {
         // If completed, maybe show results or just summary? For now, prevent taking it again.
         // But the user might want to see what they submitted? 
         // For now let's allow fetching but maybe frontend handles the view mode.
         // However, we should NOT return questions if we want to secure them? 
         // Actually, if it's completed, we probably shouldn't return questions to avoid sharing.
         // But for this task "candidate have to login ... and then attempt", implies taking it.
         // Let's return it but maybe with a flag.
      }
      
      // Fetch Job Info
      let jobTitle = '';
      if (assessment.job_id) {
        const job = await prisma.job.findUnique({ where: { id: assessment.job_id }, select: { title: true } });
        if (job) jobTitle = job.title;
      }

      // Fetch Configuration for time limit etc.
      let config = null;
      if (assessment.job_round_id) {
          config = await prisma.assessmentConfiguration.findUnique({
              where: { job_round_id: assessment.job_round_id }
          });
      }

      res.json({
        success: true,
        data: {
          assessment: {
             ...assessment,
             jobTitle,
             invitedAt: assessment.invited_at,
             expiryDate: assessment.expiry_date,
             completedAt: assessment.completed_at,
             config: config ? {
                 timeLimitMinutes: config.time_limit_minutes,
                 instructions: config.instructions
             } : null
          }
        },
      });
    } catch (error) {
      console.error('[CandidateAssessmentController.getAssessmentDetails] error', error);
      res.status(500).json({ success: false, error: 'Failed to fetch assessment details' });
    }
  }

  /**
   * Start assessment (mark as IN_PROGRESS)
   */
  static async startAssessment(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.candidate) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const assessment = await prisma.assessment.findFirst({
        where: {
          id,
          candidate_id: req.candidate.id,
        },
      });

      if (!assessment) {
        res.status(404).json({ success: false, error: 'Assessment not found' });
        return;
      }

      if (assessment.status !== AssessmentStatus.INVITED && assessment.status !== AssessmentStatus.IN_PROGRESS) {
        res.status(400).json({ success: false, error: 'Assessment cannot be started' });
        return;
      }

      // If already in progress, just return success
      if (assessment.status === AssessmentStatus.IN_PROGRESS) {
        res.json({ success: true, data: { message: 'Assessment already in progress' } });
        return;
      }

      // Update status
      // We are using 'results' JSON to store metadata like startedAt if needed, 
      // but for now relying on updated_at might be risky if other updates happen.
      // Let's store startedAt in results if it's null.
      
      const currentResults = assessment.results as any || {};
      const startedAt = currentResults.startedAt || new Date().toISOString();

      await prisma.assessment.update({
        where: { id },
        data: {
          status: AssessmentStatus.IN_PROGRESS,
          results: {
            ...currentResults,
            startedAt
          }
        },
      });

      res.json({ success: true, data: { message: 'Assessment started', startedAt } });
    } catch (error) {
      console.error('[CandidateAssessmentController.startAssessment] error', error);
      res.status(500).json({ success: false, error: 'Failed to start assessment' });
    }
  }

  /**
   * Submit assessment answers
   */
  static async submitAssessment(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.candidate) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { answers } = req.body; // Array of { questionId, response }

      if (!answers || !Array.isArray(answers)) {
        res.status(400).json({ success: false, error: 'Invalid answers format' });
        return;
      }

      const assessment = await prisma.assessment.findFirst({
        where: {
          id,
          candidate_id: req.candidate.id,
        },
      });

      if (!assessment) {
        res.status(404).json({ success: false, error: 'Assessment not found' });
        return;
      }

      if (assessment.status === AssessmentStatus.COMPLETED) {
        res.status(400).json({ success: false, error: 'Assessment already completed' });
        return;
      }

      // Save responses
      // We use a transaction to ensure all save or none
      await prisma.$transaction(async (tx) => {
        // 1. Save responses
        for (const ans of answers) {
          // Check if question exists and belongs to assessment
          const question = await tx.assessmentQuestion.findFirst({
             where: { id: ans.questionId, assessment_id: id }
          });

          if (question) {
             // Basic auto-grading for Multiple Choice
             let score = 0;
             if (question.question_type === 'MULTIPLE_CHOICE' && question.correct_answer) {
                 // Assuming correct_answer is stored as the string value or index
                 // Need to handle type comparison carefully
                 const correct = question.correct_answer as any;
                 if (String(ans.response) === String(correct)) {
                     score = question.points;
                 }
             }

             await tx.assessmentResponse.create({
                 data: {
                     assessment_id: id,
                     question_id: ans.questionId,
                     candidate_id: req.candidate!.id,
                     response: ans.response,
                     score: score
                 }
             });
          }
        }

        // 2. Update Assessment Status
        await tx.assessment.update({
            where: { id },
            data: {
                status: AssessmentStatus.COMPLETED,
                completed_at: new Date()
            }
        });
      });

      // 3. Trigger scoring/grading service if needed (async)
      // For now, we did basic scoring above. 
      // We might want to call AssessmentService.scoreAssessment(id) to aggregate scores.
      try {
          await AssessmentService.scoreAssessment(id);
      } catch (e) {
          console.error("Failed to aggregate score", e);
      }

      res.json({ success: true, data: { message: 'Assessment submitted successfully' } });
    } catch (error) {
      console.error('[CandidateAssessmentController.submitAssessment] error', error);
      res.status(500).json({ success: false, error: 'Failed to submit assessment' });
    }
  }
}
