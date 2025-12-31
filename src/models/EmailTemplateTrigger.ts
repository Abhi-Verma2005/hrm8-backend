import { prisma } from '../lib/prisma';
import { TriggerType } from '@prisma/client';

export interface EmailTemplateTriggerData {
  id: string;
  templateId: string;
  jobRoundId: string;
  triggerType: TriggerType;
  triggerCondition: any | null;
  delayDays: number | null;
  delayHours: number | null;
  scheduledTime: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class EmailTemplateTriggerModel {
  static async findById(id: string): Promise<EmailTemplateTriggerData | null> {
    const trigger = await prisma.emailTemplateTrigger.findUnique({
      where: { id },
    });
    return trigger ? this.mapPrismaToEmailTemplateTrigger(trigger) : null;
  }

  static async findByJobRoundId(jobRoundId: string): Promise<EmailTemplateTriggerData[]> {
    const triggers = await prisma.emailTemplateTrigger.findMany({
      where: { job_round_id: jobRoundId },
      orderBy: { created_at: 'desc' },
    });
    return triggers.map((t) => this.mapPrismaToEmailTemplateTrigger(t));
  }

  static async findByTemplateId(templateId: string): Promise<EmailTemplateTriggerData[]> {
    const triggers = await prisma.emailTemplateTrigger.findMany({
      where: { template_id: templateId },
      orderBy: { created_at: 'desc' },
    });
    return triggers.map((t) => this.mapPrismaToEmailTemplateTrigger(t));
  }

  static async findActiveByJobRoundId(jobRoundId: string): Promise<EmailTemplateTriggerData[]> {
    const triggers = await prisma.emailTemplateTrigger.findMany({
      where: {
        job_round_id: jobRoundId,
        is_active: true,
      },
      orderBy: { created_at: 'desc' },
    });
    return triggers.map((t) => this.mapPrismaToEmailTemplateTrigger(t));
  }

  static async create(data: {
    templateId: string;
    jobRoundId: string;
    triggerType: TriggerType;
    triggerCondition?: any;
    delayDays?: number | null;
    delayHours?: number | null;
    scheduledTime?: string | null;
    isActive?: boolean;
  }): Promise<EmailTemplateTriggerData> {
    const trigger = await prisma.emailTemplateTrigger.create({
      data: {
        template_id: data.templateId,
        job_round_id: data.jobRoundId,
        trigger_type: data.triggerType,
        trigger_condition: data.triggerCondition || null,
        delay_days: data.delayDays ?? 0,
        delay_hours: data.delayHours ?? 0,
        scheduled_time: data.scheduledTime || null,
        is_active: data.isActive ?? true,
        updated_at: new Date(),
      },
    });
    return this.mapPrismaToEmailTemplateTrigger(trigger);
  }

  static async update(
    id: string,
    data: Partial<Pick<EmailTemplateTriggerData, 'triggerType' | 'triggerCondition' | 'delayDays' | 'delayHours' | 'scheduledTime' | 'isActive'>>
  ): Promise<EmailTemplateTriggerData | null> {
    try {
      const updateData: any = {};
      if (data.triggerType !== undefined) updateData.trigger_type = data.triggerType;
      if (data.triggerCondition !== undefined) updateData.trigger_condition = data.triggerCondition;
      if (data.delayDays !== undefined) updateData.delay_days = data.delayDays;
      if (data.delayHours !== undefined) updateData.delay_hours = data.delayHours;
      if (data.scheduledTime !== undefined) updateData.scheduled_time = data.scheduledTime;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;
      updateData.updated_at = new Date();

      const trigger = await prisma.emailTemplateTrigger.update({
        where: { id },
        data: updateData,
      });
      return this.mapPrismaToEmailTemplateTrigger(trigger);
    } catch {
      return null;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await prisma.emailTemplateTrigger.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  private static mapPrismaToEmailTemplateTrigger(t: any): EmailTemplateTriggerData {
    return {
      id: t.id,
      templateId: t.template_id,
      jobRoundId: t.job_round_id,
      triggerType: t.trigger_type,
      triggerCondition: t.trigger_condition,
      delayDays: t.delay_days,
      delayHours: t.delay_hours,
      scheduledTime: t.scheduled_time,
      isActive: t.is_active,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    };
  }
}

