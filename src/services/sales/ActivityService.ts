/**
 * Activity Service
 * Handles sales activity logging and retrieval
 */

import prisma from '../../lib/prisma';
import { ActivityType, ActorType } from '@prisma/client';

export class ActivityService {
  /**
   * Log a new activity
   */
  static async logActivity(data: {
    companyId: string;
    leadId?: string;
    opportunityId?: string;
    type: ActivityType;
    subject: string;
    description?: string;
    createdBy: string;
    actorType?: ActorType;
    scheduledAt?: Date;
    dueDate?: Date;
    completedAt?: Date;
    duration?: number; // minutes
    metadata?: any;
  }) {
    return await prisma.activity.create({
      data: {
        company_id: data.companyId,
        lead_id: data.leadId,
        opportunity_id: data.opportunityId,
        type: data.type,
        subject: data.subject,
        description: data.description,
        created_by: data.createdBy,
        actor_type: data.actorType || 'CONSULTANT',
        scheduled_at: data.scheduledAt,
        due_date: data.dueDate,
        completed_at: data.completedAt,
        call_duration: data.duration,
        // Using existing fields or if metadata is needed we can map to attachments or create new field
        // Schema has `attachments` Json?
        attachments: data.metadata,
      }
    });
  }

  /**
   * Get activities
   */
  static async getActivities(filters: {
    companyId?: string;
    leadId?: string;
    opportunityId?: string;
    consultantId?: string; // created_by
    limit?: number;
  }) {
    const where: any = {};
    if (filters.companyId) where.company_id = filters.companyId;
    if (filters.leadId) where.lead_id = filters.leadId;
    if (filters.opportunityId) where.opportunity_id = filters.opportunityId;
    if (filters.consultantId) where.created_by = filters.consultantId;

    return await prisma.activity.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: filters.limit || 50,
      include: {
        lead: { select: { id: true, company_name: true } },
        opportunity: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } }
      }
    });
  }

  /**
   * Mark activity as completed
   */
  static async completeActivity(id: string) {
    return await prisma.activity.update({
      where: { id },
      data: {
        completed_at: new Date()
      }
    });
  }
}
