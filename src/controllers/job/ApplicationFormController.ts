/**
 * Application Form Controller
 * Handles application form configuration and question generation
 */

import { Request, Response } from 'express';
import { JobModel } from '../../models/Job';
import { QuestionGenerationService, QuestionGenerationRequest } from '../../services/ai/QuestionGenerationService';

export class ApplicationFormController {
  /**
   * Get application form configuration for a job
   */
  static async getApplicationForm(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const job = await JobModel.findById(id);

      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }

      // Check if user has permission (same company)
      // This should be enhanced with proper permission checks
      if (job.companyId !== (req as any).user?.companyId) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      return res.json({
        success: true,
        data: {
          applicationForm: job.applicationForm || null,
        },
      });
    } catch (error) {
      console.error('Error fetching application form:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch application form',
      });
    }
  }

  /**
   * Update application form configuration for a job
   */
  static async updateApplicationForm(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { applicationForm } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const job = await JobModel.findById(id);

      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }

      // Check if user has permission
      if (job.companyId !== (req as any).user?.companyId) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      // Update job with application form
      const updatedJob = await JobModel.update(id, {
        applicationForm: applicationForm || null,
      });

      return res.json({
        success: true,
        data: {
          job: updatedJob,
        },
      });
    } catch (error) {
      console.error('Error updating application form:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update application form',
      });
    }
  }

  /**
   * Generate questions using AI
   * Supports both saved jobs (via jobId) and unsaved jobs (via jobData in body)
   */
  static async generateQuestions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userNotes, questionCount, jobData } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      let jobTitle: string;
      let jobDescription: string;
      let requirements: string[] = [];
      let responsibilities: string[] = [];

      // If jobId is provided, fetch from database
      if (id && id !== '') {
        const job = await JobModel.findById(id);

        if (!job) {
          return res.status(404).json({ success: false, error: 'Job not found' });
        }

        // Check if user has permission
        if (job.companyId !== (req as any).user?.companyId) {
          return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        jobTitle = job.title;
        jobDescription = job.description;
        requirements = job.requirements || [];
        responsibilities = job.responsibilities || [];
      } else if (jobData) {
        // Use job data from request body (for unsaved jobs)
        jobTitle = jobData.title || '';
        jobDescription = jobData.description || '';
        requirements = jobData.requirements || [];
        responsibilities = jobData.responsibilities || [];
      } else {
        return res.status(400).json({
          success: false,
          error: 'Either jobId or jobData must be provided',
        });
      }

      // Validate required fields
      if (!jobTitle || !jobDescription) {
        return res.status(400).json({
          success: false,
          error: 'Job title and description are required',
        });
      }

      // Prepare request for question generation
      const generationRequest: QuestionGenerationRequest = {
        jobTitle,
        jobDescription,
        requirements: Array.isArray(requirements) ? requirements : [],
        responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
        userNotes: userNotes || '',
        questionCount: questionCount || 8,
      };

      // Generate questions
      const generatedQuestions = await QuestionGenerationService.generateWithAI(generationRequest);

      return res.json({
        success: true,
        data: {
          questions: generatedQuestions,
        },
      });
    } catch (error) {
      console.error('Error generating questions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate questions',
      });
    }
  }
}

