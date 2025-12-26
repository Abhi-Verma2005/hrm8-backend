/**
 * Resume Annotation Controller
 * Handles HTTP requests for resume annotations
 */

import { Request, Response } from 'express';
import { ResumeAnnotationService } from '../../services/candidate/ResumeAnnotationService';
import { CandidateDocumentService } from '../../services/candidate/CandidateDocumentService';

export class ResumeAnnotationController {
  /**
   * GET /api/resumes/:resumeId
   */
  static async getResume(req: Request, res: Response) {
    try {
      const { resumeId } = req.params;
      const resume = await CandidateDocumentService.getResume(resumeId);
      
      if (!resume) {
        res.status(404).json({ success: false, error: 'Resume not found' });
        return;
      }

      res.json({ success: true, data: resume });
    } catch (error: any) {
      console.error('Error fetching resume:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/resumes/:resumeId/annotations
   */
  static async getAnnotations(req: Request, res: Response) {
    try {
      const { resumeId } = req.params;
      const annotations = await ResumeAnnotationService.getAnnotations(resumeId);
      res.json({ success: true, data: annotations });
    } catch (error: any) {
      console.error('Error fetching annotations:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/resumes/:resumeId/annotations
   */
  static async createAnnotation(req: Request, res: Response) {
    try {
      const { resumeId } = req.params;
      const { userId, userName, userColor, type, text, comment, position } = req.body;

      // In a real app, userId/userName would come from req.user
      // For now, we accept them from body (assuming internal usage or trusting the client for this MVP)

      const annotation = await ResumeAnnotationService.createAnnotation({
        resumeId,
        userId,
        userName,
        userColor,
        type,
        text,
        comment,
        position,
      });

      res.json({ success: true, data: annotation });
    } catch (error: any) {
      console.error('Error creating annotation:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * DELETE /api/resumes/:resumeId/annotations/:id
   */
  static async deleteAnnotation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userId } = req.body; // Or from req.user

      await ResumeAnnotationService.deleteAnnotation(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting annotation:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
