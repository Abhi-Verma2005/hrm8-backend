import { EmailMessageModel, EmailMessageData } from '../../models/EmailMessage';
import { EmailStatus } from '@prisma/client';
import { emailService } from './EmailService';

export interface EmailFilters {
  candidateId?: string;
  applicationId?: string;
  jobId?: string;
  jobRoundId?: string;
  status?: EmailStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class EmailInboxService {
  /**
   * Get emails with filters
   */
  static async getEmails(filters: EmailFilters): Promise<EmailMessageData[]> {
    return await EmailMessageModel.findWithFilters(filters);
  }

  /**
   * Get email by ID
   */
  static async getEmailById(id: string): Promise<EmailMessageData | null> {
    return await EmailMessageModel.findById(id);
  }

  /**
   * Get emails for an application
   */
  static async getEmailsByApplication(applicationId: string): Promise<EmailMessageData[]> {
    return await EmailMessageModel.findByApplicationId(applicationId);
  }

  /**
   * Get emails for a candidate
   */
  static async getEmailsByCandidate(candidateId: string): Promise<EmailMessageData[]> {
    return await EmailMessageModel.findByCandidateId(candidateId);
  }

  /**
   * Get emails for a job
   */
  static async getEmailsByJob(jobId: string): Promise<EmailMessageData[]> {
    return await EmailMessageModel.findByJobId(jobId);
  }

  /**
   * Get emails for a job round
   */
  static async getEmailsByJobRound(jobRoundId: string): Promise<EmailMessageData[]> {
    return await EmailMessageModel.findByJobRoundId(jobRoundId);
  }

  /**
   * Track email open (pixel tracking)
   */
  static async trackEmailOpen(emailId: string): Promise<boolean> {
    try {
      const message = await EmailMessageModel.findById(emailId);
      if (!message) {
        return false;
      }

      // Only update if not already opened
      if (message.status !== 'OPENED') {
        await EmailMessageModel.updateStatus(emailId, 'OPENED', {
          openedAt: new Date(),
        });
      }
      return true;
    } catch (error) {
      console.error('Failed to track email open:', error);
      return false;
    }
  }

  /**
   * Resend failed email
   */
  static async resendEmail(emailId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const message = await EmailMessageModel.findById(emailId);
      if (!message) {
        return { success: false, error: 'Email not found' };
      }

      if (message.status !== 'FAILED' && message.status !== 'BOUNCED') {
        return { success: false, error: 'Email was not failed, cannot resend' };
      }

      // Get template if available
      if (message.templateId) {
        const result = await emailService.sendTemplateEmail({
          templateId: message.templateId,
          applicationId: message.applicationId || undefined,
          candidateId: message.candidateId,
          jobId: message.jobId,
          jobRoundId: message.jobRoundId || undefined,
          senderId: userId,
        });

        return result;
      } else {
        // If no template, we can't resend easily
        return { success: false, error: 'Cannot resend email without template' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resend email',
      };
    }
  }
}

