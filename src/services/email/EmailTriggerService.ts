import { EmailTemplateTriggerModel, EmailTemplateTriggerData } from '../../models/EmailTemplateTrigger';
import { TriggerType } from '@prisma/client';

export interface CreateEmailTriggerRequest {
  templateId: string;
  jobRoundId: string;
  triggerType: TriggerType;
  triggerCondition?: any;
  delayDays?: number | null;
  delayHours?: number | null;
  scheduledTime?: string | null;
  isActive?: boolean;
}

export interface UpdateEmailTriggerRequest {
  triggerType?: TriggerType;
  triggerCondition?: any;
  delayDays?: number | null;
  delayHours?: number | null;
  scheduledTime?: string | null;
  isActive?: boolean;
}

export class EmailTriggerService {
  /**
   * Create a new email trigger
   */
  static async createTrigger(
    data: CreateEmailTriggerRequest
  ): Promise<EmailTemplateTriggerData> {
    return await EmailTemplateTriggerModel.create(data);
  }

  /**
   * Get trigger by ID
   */
  static async getTriggerById(id: string): Promise<EmailTemplateTriggerData | null> {
    return await EmailTemplateTriggerModel.findById(id);
  }

  /**
   * Get triggers by job round
   */
  static async getTriggersByJobRound(jobRoundId: string): Promise<EmailTemplateTriggerData[]> {
    return await EmailTemplateTriggerModel.findByJobRoundId(jobRoundId);
  }

  /**
   * Get active triggers by job round
   */
  static async getActiveTriggersByJobRound(jobRoundId: string): Promise<EmailTemplateTriggerData[]> {
    return await EmailTemplateTriggerModel.findActiveByJobRoundId(jobRoundId);
  }

  /**
   * Get triggers by template
   */
  static async getTriggersByTemplate(templateId: string): Promise<EmailTemplateTriggerData[]> {
    return await EmailTemplateTriggerModel.findByTemplateId(templateId);
  }

  /**
   * Update trigger
   */
  static async updateTrigger(
    id: string,
    data: UpdateEmailTriggerRequest
  ): Promise<EmailTemplateTriggerData | null> {
    return await EmailTemplateTriggerModel.update(id, data);
  }

  /**
   * Delete trigger
   */
  static async deleteTrigger(id: string): Promise<boolean> {
    return await EmailTemplateTriggerModel.delete(id);
  }

  /**
   * Check if triggers should fire for an application entering a round
   */
  static async checkAndTrigger(
    jobRoundId: string,
    applicationId: string
  ): Promise<{ triggered: boolean; triggerIds: string[] }> {
    const triggers = await this.getActiveTriggersByJobRound(jobRoundId);
    const triggerIds: string[] = [];

    for (const trigger of triggers) {
      if (trigger.triggerType === 'IMMEDIATE') {
        // For immediate triggers, we'll handle them in the automation service
        triggerIds.push(trigger.id);
      }
      // Scheduled and conditional triggers are handled separately
    }

    return {
      triggered: triggerIds.length > 0,
      triggerIds,
    };
  }
}

