/**
 * Resume Annotation Service
 * Handles CRUD operations for resume annotations (highlights, comments)
 */

import { ResumeAnnotation } from '@prisma/client';

export interface CreateAnnotationRequest {
  resume_id: string;
  user_id: string;
  user_name: string;
  user_color: string;
  type: string; // 'highlight' | 'comment'
  text: string;
  comment?: string;
  position: any; // JSON object {start: number, end: number}
}

export class ResumeAnnotationService {
  /**
   * Get all annotations for a resume
   */
  static async getAnnotations(resume_id: string) {
    const { prisma } = await import('../../lib/prisma');
    return await prisma.resumeAnnotation.findMany({
      where: { resume_id },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * Create a new annotation
   */
  static async createAnnotation(data: CreateAnnotationRequest) {
    const { prisma } = await import('../../lib/prisma');
    return await prisma.resumeAnnotation.create({
      data: {
        resume_id: data.resume_id,
        user_id: data.user_id,
        user_name: data.user_name,
        user_color: data.user_color,
        type: data.type,
        text: data.text,
        comment: data.comment,
        position: data.position,
      },
    });
  }

  /**
   * Delete an annotation
   */
  static async deleteAnnotation(annotationId: string, userId: string) {
    const { prisma } = await import('../../lib/prisma');
    
    // verify ownership
    const annotation = await prisma.resumeAnnotation.findUnique({
      where: { id: annotationId },
    });

    if (!annotation) {
      throw new Error('Annotation not found');
    }

    // In a real app, you might allow admins to delete anyone's annotation
    // For now, only allow the creator to delete
    if (annotation.user_id !== userId) {
      throw new Error('Unauthorized to delete this annotation');
    }

    return await prisma.resumeAnnotation.delete({
      where: { id: annotationId },
    });
  }
}
