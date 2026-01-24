/**
 * Application Notification Service
 * Handles in-app notifications for application-related events in candidate portal
 */

import { randomUUID } from 'crypto';
import { ApplicationStatus, ApplicationStage, NotificationType } from '@prisma/client';
import { CandidateModel } from '../../models/Candidate';
import { JobModel } from '../../models/Job';

interface NotificationData {
  candidateId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}

export class ApplicationNotificationService {
  /**
   * Create notification for candidate (In-App + Email)
   * Checks notification preferences before sending
   */
  private static async createInAppNotification(data: NotificationData): Promise<void> {
    const { prisma } = await import('../../lib/prisma');
    const { CandidateNotificationPreferencesService } = await import('../candidate/CandidateNotificationPreferencesService');
    const { EmailService } = await import('../email/EmailService');

    try {
      // 1. In-App Notification
      const shouldSendInApp = await CandidateNotificationPreferencesService.shouldSendNotification(
        data.candidateId,
        data.type,
        'inApp'
      );

      if (shouldSendInApp) {
        await prisma.notification.create({
          data: {
            id: randomUUID(),
            candidate_id: data.candidateId,
            type: data.type,
            title: data.title,
            message: data.message,
            data: data.data || {},
            read: false,
          },
        });
        console.log(`✅ In-app notification created for candidate ${data.candidateId}: ${data.title}`);
      } else {
        console.log(`⏭️ In-app notification skipped for candidate ${data.candidateId}`);
      }

      // 2. Email Notification
      const shouldSendEmail = await CandidateNotificationPreferencesService.shouldSendNotification(
        data.candidateId,
        data.type,
        'email'
      );

      if (shouldSendEmail) {
        const candidate = await prisma.candidate.findUnique({
          where: { id: data.candidateId },
          select: { email: true }
        });

        if (candidate?.email) {
          // Use the generic notification email method
          // data.data.actionUrl or similar might be useful if available, otherwise just generic link
          const actionUrl = data.data?.actionUrl || '/candidate/dashboard';

          await EmailService.getInstance().sendNotificationEmail(
            candidate.email,
            data.title,
            data.message,
            actionUrl
          );
          console.log(`✅ Email notification sent to candidate ${data.candidateId}`);
        }
      }

    } catch (error) {
      console.error('❌ Failed to process notifications:', error);
    }
  }

  /**
   * Notify candidate when application status changes
   */
  static async notifyStatusChange(
    applicationId: string,
    candidateId: string,
    jobId: string,
    oldStatus: ApplicationStatus,
    newStatus: ApplicationStatus,
    stage?: ApplicationStage
  ): Promise<void> {
    try {
      // Get candidate and job details
      const candidate = await CandidateModel.findById(candidateId);
      const job = await JobModel.findById(jobId);

      if (!candidate || !job) {
        console.error('❌ Candidate or job not found for notification');
        return;
      }

      // Fetch company separately since JobModel.findById doesn't include it
      const { prisma } = await import('../../lib/prisma');
      const company = await prisma.company.findUnique({
        where: { id: job.companyId },
        select: { name: true },
      });

      const statusLabels: Record<ApplicationStatus, string> = {
        NEW: 'New',
        SCREENING: 'Under Review',
        INTERVIEW: 'Interview',
        OFFER: 'Offer',
        HIRED: 'Hired',
        REJECTED: 'Rejected',
        WITHDRAWN: 'Withdrawn',
      };

      const oldStatusLabel = statusLabels[oldStatus] || oldStatus;
      const newStatusLabel = statusLabels[newStatus] || newStatus;

      // Create in-app notification
      await this.createInAppNotification({
        candidateId,
        type: 'APPLICATION_UPDATE',
        title: 'Application Status Updated',
        message: `Your application for ${job.title} at ${company?.name || 'the company'} has been updated from "${oldStatusLabel}" to "${newStatusLabel}".`,
        data: {
          applicationId,
          jobId,
          jobTitle: job.title,
          companyName: company?.name,
          oldStatus,
          newStatus,
          stage,
        },
      });
    } catch (error) {
      console.error('❌ Error in notifyStatusChange:', error);
    }

    // Notify Job Owner (Recruiter)
    try {
      if (job && job.createdBy) {
        const { UniversalNotificationService } = await import('../notification/UniversalNotificationService');
        const { NotificationRecipientType } = await import('@prisma/client');

        await UniversalNotificationService.createNotification({
          recipientType: NotificationRecipientType.USER,
          recipientId: job.createdBy,
          type: 'APPLICATION_STATUS_CHANGED' as any,
          title: 'Application Status Updated',
          message: `Application for ${candidate.firstName} ${candidate.lastName} has been updated to "${newStatusLabel}".`,
          jobId: job.id,
          applicationId: applicationId,
          actionUrl: `/jobs/${job.id}/applications/${applicationId}`,
          data: {
            oldStatus,
            newStatus,
            candidateId,
            candidateName: `${candidate.firstName} ${candidate.lastName}`
          }
        });

        // Email Notification for Recruiter
        const { prisma } = await import('../../lib/prisma');
        const { EmailService } = await import('../email/EmailService');
        const { UserNotificationPreferencesService } = await import('../user/UserNotificationPreferencesService');

        const recruiter = await prisma.user.findUnique({ where: { id: job.createdBy } });

        if (recruiter && recruiter.email) {
          // Check recruiter preferences
          const shouldEmailRecruiter = await UserNotificationPreferencesService.shouldSendNotification(
            recruiter.id,
            'application_status_change',
            'email'
          );

          if (shouldEmailRecruiter) {
            await EmailService.getInstance().sendNotificationEmail(
              recruiter.email,
              `Application Status Updated: ${candidate.firstName} ${candidate.lastName}`,
              `The status for ${candidate.firstName} ${candidate.lastName}'s application has been updated to "${newStatusLabel}".`,
              `/jobs/${job.id}/applications/${applicationId}`
            );
            console.log(`✅ Status update email sent to recruiter ${recruiter.email}`);
          } else {
            console.log(`Kiip Recruiter email skipped (preferences): ${recruiter.email}`);
          }
        }
      }
    } catch (recruiterNotifyError) {
      console.error('Failed to notify recruiter of status change:', recruiterNotifyError);
    }
  }

  /**
   * Notify candidate when application stage changes
   */
  static async notifyStageChange(
    applicationId: string,
    candidateId: string,
    jobId: string,
    oldStage: ApplicationStage | null,
    newStage: ApplicationStage,
    status: ApplicationStatus
  ): Promise<void> {
    try {
      // Get candidate and job details
      const candidate = await CandidateModel.findById(candidateId);
      const job = await JobModel.findById(jobId);

      if (!candidate || !job) {
        console.error('❌ Candidate or job not found for notification');
        return;
      }

      // Fetch company separately since JobModel.findById doesn't include it
      const { prisma } = await import('../../lib/prisma');
      const company = await prisma.company.findUnique({
        where: { id: job.companyId },
        select: { name: true },
      });

      const stageLabels: Record<ApplicationStage, string> = {
        NEW_APPLICATION: 'New Application',
        RESUME_REVIEW: 'Resume Review',
        PHONE_SCREEN: 'Phone Screen',
        TECHNICAL_INTERVIEW: 'Technical Interview',
        ONSITE_INTERVIEW: 'Onsite Interview',
        OFFER_EXTENDED: 'Offer Extended',
        OFFER_ACCEPTED: 'Offer Accepted',
        REJECTED: 'Rejected',
      };

      const newStageLabel = stageLabels[newStage] || newStage;

      // Create in-app notification
      await this.createInAppNotification({
        candidateId,
        type: 'APPLICATION_UPDATE',
        title: 'Application Progress Update',
        message: `Your application for ${job.title} at ${company?.name || 'the company'} has moved to the "${newStageLabel}" stage.`,
        data: {
          applicationId,
          jobId,
          jobTitle: job.title,
          companyName: company?.name,
          oldStage,
          newStage,
          status,
        },
      });
    } catch (error) {
      console.error('❌ Error in notifyStageChange:', error);
    }

    // Notify Job Owner (Recruiter)
    try {
      if (job && job.createdBy) {
        const { UniversalNotificationService } = await import('../notification/UniversalNotificationService');
        const { NotificationRecipientType } = await import('@prisma/client');

        await UniversalNotificationService.createNotification({
          recipientType: NotificationRecipientType.USER,
          recipientId: job.createdBy,
          type: 'APPLICATION_STATUS_CHANGED' as any, // Reusing status change type or generic
          title: 'Application Stage Updated',
          message: `Application for ${candidate.firstName} ${candidate.lastName} has moved to "${newStageLabel}".`,
          jobId: job.id,
          applicationId: applicationId,
          actionUrl: `/jobs/${job.id}/applications/${applicationId}`,
          data: {
            oldStage,
            newStage,
            candidateId,
            candidateName: `${candidate.firstName} ${candidate.lastName}`
          }
        });

        // Email Notification
        const { prisma } = await import('../../lib/prisma');
        const { EmailService } = await import('../email/EmailService');
        const { UserNotificationPreferencesService } = await import('../user/UserNotificationPreferencesService');

        const recruiter = await prisma.user.findUnique({ where: { id: job.createdBy } });

        if (recruiter && recruiter.email) {
          // Check recruiter preferences
          const shouldEmailRecruiter = await UserNotificationPreferencesService.shouldSendNotification(
            recruiter.id,
            'application_status_change', // Using status change preference for stage too, or create new type
            'email'
          );

          if (shouldEmailRecruiter) {
            await EmailService.getInstance().sendNotificationEmail(
              recruiter.email,
              `Application Stage Updated: ${candidate.firstName} ${candidate.lastName}`,
              `The stage for ${candidate.firstName} ${candidate.lastName}'s application has been updated to "${newStageLabel}".`,
              `/jobs/${job.id}/applications/${applicationId}`
            );
            console.log(`✅ Stage update email sent to recruiter ${recruiter.email}`);
          } else {
            console.log(`Kiip Recruiter email skipped (preferences): ${recruiter.email}`);
          }
        }
      }
    } catch (recruiterNotifyError) {
      console.error('Failed to notify recruiter of stage change:', recruiterNotifyError);
    }
  }

  /**
   * Notify candidate when they are shortlisted
   */
  static async notifyShortlisted(
    applicationId: string,
    candidateId: string,
    jobId: string,
    shortlistedBy: string
  ): Promise<void> {
    try {
      const candidate = await CandidateModel.findById(candidateId);
      const job = await JobModel.findById(jobId);

      if (!candidate || !job) {
        console.error('❌ Candidate or job not found for notification');
        return;
      }

      // Fetch company separately since JobModel.findById doesn't include it
      const { prisma } = await import('../../lib/prisma');
      const company = await prisma.company.findUnique({
        where: { id: job.companyId },
        select: { name: true },
      });

      // Create in-app notification
      await this.createInAppNotification({
        candidateId,
        type: 'APPLICATION_UPDATE',
        title: 'You\'ve Been Shortlisted!',
        message: `Congratulations! Your application for ${job.title} at ${company?.name || 'the company'} has been shortlisted.`,
        data: {
          applicationId,
          jobId,
          jobTitle: job.title,
          companyName: company?.name,
          shortlistedBy,
        },
      });
    } catch (error) {
      console.error('❌ Error in notifyShortlisted:', error);
    }
  }

  /**
   * Notify candidate when interview is scheduled
   */
  static async notifyInterviewScheduled(
    applicationId: string,
    candidateId: string,
    jobId: string,
    interviewDate: Date,
    interviewType: string,
    location?: string,
    meetingLink?: string
  ): Promise<void> {
    try {
      const candidate = await CandidateModel.findById(candidateId);
      const job = await JobModel.findById(jobId);

      if (!candidate || !job) {
        console.error('❌ Candidate or job not found for notification');
        return;
      }

      // Fetch company separately since JobModel.findById doesn't include it
      const { prisma } = await import('../../lib/prisma');
      const company = await prisma.company.findUnique({
        where: { id: job.companyId },
        select: { name: true },
      });

      // Create in-app notification
      const formattedDate = new Date(interviewDate).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

      let notificationMessage = `An interview has been scheduled for your application to ${job.title} at ${company?.name || 'the company'} on ${formattedDate}.`;
      if (location) {
        notificationMessage += ` Location: ${location}.`;
      }
      if (meetingLink) {
        notificationMessage += ` Meeting link available in details.`;
      }

      await this.createInAppNotification({
        candidateId,
        type: 'INTERVIEW_SCHEDULED',
        title: 'Interview Scheduled',
        message: notificationMessage,
        data: {
          applicationId,
          jobId,
          jobTitle: job.title,
          companyName: company?.name,
          interviewDate: interviewDate.toISOString(),
          interviewType,
          location,
          meetingLink,
          formattedDate,
        },
      });
    } catch (error) {
      console.error('❌ Error in notifyInterviewScheduled:', error);
    }
  }

  /**
   * Notify candidate when application is rejected
   */
  static async notifyRejected(
    applicationId: string,
    candidateId: string,
    jobId: string,
    rejectionReason?: string
  ): Promise<void> {
    try {
      const candidate = await CandidateModel.findById(candidateId);
      const job = await JobModel.findById(jobId);

      if (!candidate || !job) {
        console.error('❌ Candidate or job not found for notification');
        return;
      }

      // Fetch company separately since JobModel.findById doesn't include it
      const { prisma } = await import('../../lib/prisma');
      const company = await prisma.company.findUnique({
        where: { id: job.companyId },
        select: { name: true },
      });

      // Create in-app notification
      let message = `We regret to inform you that your application for ${job.title} at ${company?.name || 'the company'} was not successful at this time.`;
      if (rejectionReason) {
        message += ` ${rejectionReason}`;
      }

      await this.createInAppNotification({
        candidateId,
        type: 'APPLICATION_UPDATE',
        title: 'Application Update',
        message,
        data: {
          applicationId,
          jobId,
          jobTitle: job.title,
          companyName: company?.name,
          rejectionReason,
        },
      });
    } catch (error) {
      console.error('❌ Error in notifyRejected:', error);
    }
  }

  /**
   * Notify candidate when offer is extended
   */
  static async notifyOfferExtended(
    applicationId: string,
    candidateId: string,
    jobId: string,
    offerDetails?: any
  ): Promise<void> {
    try {
      const candidate = await CandidateModel.findById(candidateId);
      const job = await JobModel.findById(jobId);

      if (!candidate || !job) {
        console.error('❌ Candidate or job not found for notification');
        return;
      }

      // Fetch company separately since JobModel.findById doesn't include it
      const { prisma } = await import('../../lib/prisma');
      const company = await prisma.company.findUnique({
        where: { id: job.companyId },
        select: { name: true },
      });

      // Create in-app notification
      await this.createInAppNotification({
        candidateId,
        type: 'APPLICATION_UPDATE',
        title: '🎉 Offer Extended!',
        message: `Congratulations! An offer has been extended for ${job.title} at ${company?.name || 'the company'}. Please review the offer details in your dashboard.`,
        data: {
          applicationId,
          jobId,
          jobTitle: job.title,
          companyName: company?.name,
          offerDetails,
        },
      });
    } catch (error) {
      console.error('❌ Error in notifyOfferExtended:', error);
    }
  }
}

