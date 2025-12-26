import { EmailTriggerService } from './EmailTriggerService';
import { EmailTemplateModel } from '../../models/EmailTemplate';
import { emailService } from './EmailService';
import { JobRoundModel } from '../../models/JobRound';
import { TriggerType } from '@prisma/client';

export class EmailAutomationService {
  /**
   * Handle application entering a job round
   * This is called when an application is moved to a new round
   */
  static async handleApplicationRoundEntry(
    applicationId: string,
    jobRoundId: string,
    userId: string
  ): Promise<void> {
    try {
      // Get active triggers for this round
      const triggers = await EmailTriggerService.getActiveTriggersByJobRound(jobRoundId);

      for (const trigger of triggers) {
        if (trigger.triggerType === 'IMMEDIATE') {
          // Send email immediately
          await this.sendTriggeredEmail(trigger, applicationId, userId);
        } else if (trigger.triggerType === 'SCHEDULED') {
          // Schedule email for later (stored in a queue/job system)
          // For now, we'll calculate the delay and log it
          // In production, this would use a job queue like Bull or similar
          await this.scheduleDelayedEmail(trigger, applicationId, userId);
        }
        // Conditional triggers are handled separately when conditions are met
      }
    } catch (error) {
      console.error('Failed to handle application round entry:', error);
      // Don't throw - we don't want to fail the application move operation
    }
  }

  /**
   * Handle application stage change
   * This is called when an application stage is updated
   */
  static async handleApplicationStageChange(
    applicationId: string,
    oldStage: string,
    newStage: string
  ): Promise<void> {
    try {
      // Get application to find job and round
      const { ApplicationModel } = await import('../../models/Application');
      const application = await ApplicationModel.findById(applicationId);
      
      if (!application) {
        return;
      }

      // If we can map stage to a round, check for triggers
      // This is a simplified version - in production you'd want to map stages to rounds properly
      // For now, we'll just log the stage change
      console.log(`Application ${applicationId} stage changed from ${oldStage} to ${newStage}`);
    } catch (error) {
      console.error('Failed to handle application stage change:', error);
    }
  }

  /**
   * Send email triggered by a trigger
   */
  private static async sendTriggeredEmail(
    trigger: any,
    applicationId: string,
    userId: string
  ): Promise<void> {
    try {
      // Get template
      const template = await EmailTemplateModel.findById(trigger.templateId);
      if (!template || !template.isActive) {
        console.error(`Template ${trigger.templateId} not found or inactive`);
        return;
      }

      // Get application
      const { ApplicationModel } = await import('../../models/Application');
      const application = await ApplicationModel.findById(applicationId);
      if (!application) {
        console.error(`Application ${applicationId} not found`);
        return;
      }

      // Send email using emailService
      const result = await emailService.sendTemplateEmail({
        templateId: template.id,
        applicationId,
        candidateId: application.candidateId,
        jobId: application.jobId,
        jobRoundId: trigger.jobRoundId,
        senderId: userId,
      });

      if (!result.success) {
        console.error(`Failed to send triggered email: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending triggered email:', error);
    }
  }

  /**
   * Schedule delayed email
   * In production, this would use a job queue
   */
  private static async scheduleDelayedEmail(
    trigger: any,
    applicationId: string,
    userId: string
  ): Promise<void> {
    try {
      // Calculate delay in milliseconds
      const delayMs = (trigger.delayDays || 0) * 24 * 60 * 60 * 1000 + 
                      (trigger.delayHours || 0) * 60 * 60 * 1000;

      if (delayMs > 0) {
        // For now, just set a timeout
        // In production, use a proper job queue like Bull
        setTimeout(async () => {
          await this.sendTriggeredEmail(trigger, applicationId, userId);
        }, delayMs);

        console.log(`Scheduled email for application ${applicationId} with ${delayMs}ms delay`);
      } else {
        // No delay, send immediately
        await this.sendTriggeredEmail(trigger, applicationId, userId);
      }
    } catch (error) {
      console.error('Error scheduling delayed email:', error);
    }
  }

  /**
   * Process conditional triggers
   * This is called when a condition is met (e.g., assessment passed)
   */
  static async processConditionalTriggers(
    jobRoundId: string,
    applicationId: string,
    condition: any,
    userId: string
  ): Promise<void> {
    try {
      const triggers = await EmailTriggerService.getActiveTriggersByJobRound(jobRoundId);
      
      for (const trigger of triggers) {
        if (trigger.triggerType === 'CONDITIONAL') {
          // Evaluate condition
          const conditionMet = this.evaluateCondition(trigger.triggerCondition, condition);
          
          if (conditionMet) {
            await this.sendTriggeredEmail(trigger, applicationId, userId);
          }
        }
      }
    } catch (error) {
      console.error('Failed to process conditional triggers:', error);
    }
  }

  /**
   * Evaluate a condition against trigger condition
   */
  private static evaluateCondition(
    triggerCondition: any,
    currentCondition: any
  ): boolean {
    if (!triggerCondition || !currentCondition) {
      return false;
    }

    // Simple condition evaluation
    // In production, you'd want a more robust condition engine
    // For now, check if key-value pairs match
    for (const key in triggerCondition) {
      if (triggerCondition[key] !== currentCondition[key]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Process scheduled emails (cron job)
   * This would be called periodically to process scheduled emails
   */
  static async processScheduledEmails(): Promise<void> {
    // This would query a job queue or scheduled email table
    // For now, it's a placeholder
    console.log('Processing scheduled emails...');
  }
}

