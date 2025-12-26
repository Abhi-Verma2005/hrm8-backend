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
    return trigger;
  }

  static async findByJobRoundId(jobRoundId: string): Promise<EmailTemplateTriggerData[]> {
    const triggers = await prisma.emailTemplateTrigger.findMany({
      where: { jobRoundId },
      orderBy: { createdAt: 'desc' },
    });
    return triggers;
  }

  static async findByTemplateId(templateId: string): Promise<EmailTemplateTriggerData[]> {
    const triggers = await prisma.emailTemplateTrigger.findMany({
      where: { templateId },
      orderBy: { createdAt: 'desc' },
    });
    return triggers;
  }

  static async findActiveByJobRoundId(jobRoundId: string): Promise<EmailTemplateTriggerData[]> {
    const triggers = await prisma.emailTemplateTrigger.findMany({
      where: {
        jobRoundId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return triggers;
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
        templateId: data.templateId,
        jobRoundId: data.jobRoundId,
        triggerType: data.triggerType,
        triggerCondition: data.triggerCondition || null,
        delayDays: data.delayDays ?? 0,
        delayHours: data.delayHours ?? 0,
        scheduledTime: data.scheduledTime || null,
        isActive: data.isActive ?? true,
      },
    });
    return trigger;
  }

  static async update(
    id: string,
    data: Partial<Pick<EmailTemplateTriggerData, 'triggerType' | 'triggerCondition' | 'delayDays' | 'delayHours' | 'scheduledTime' | 'isActive'>>
  ): Promise<EmailTemplateTriggerData | null> {
    try {
      const trigger = await prisma.emailTemplateTrigger.update({
        where: { id },
        data,
      });
      return trigger;
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
}

