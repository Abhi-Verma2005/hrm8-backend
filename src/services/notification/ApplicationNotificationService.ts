/**
 * Application Notification Service
 * Handles in-app notifications for application-related events in candidate portal
 */

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
   * Create in-app notification for candidate
   */
  private static async createInAppNotification(data: NotificationData): Promise<void> {
    const { prisma } = await import('../../lib/prisma');

    try {
      await prisma.notification.create({
        data: {
          candidateId: data.candidateId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data || {},
          read: false,
        },
      });

      console.log(`✅ In-app notification created for candidate ${data.candidateId}: ${data.title}`);
    } catch (error) {
      console.error('❌ Failed to create in-app notification:', error);
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
        message: `Your application for ${job.title} at ${job.company?.name || 'the company'} has been updated from "${oldStatusLabel}" to "${newStatusLabel}".`,
        data: {
          applicationId,
          jobId,
          jobTitle: job.title,
          companyName: job.company?.name,
          oldStatus,
          newStatus,
          stage,
        },
      });
    } catch (error) {
      console.error('❌ Error in notifyStatusChange:', error);
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

      const oldStageLabel = oldStage ? stageLabels[oldStage] || oldStage : 'Previous Stage';
      const newStageLabel = stageLabels[newStage] || newStage;

      // Create in-app notification
      await this.createInAppNotification({
        candidateId,
        type: 'APPLICATION_UPDATE',
        title: 'Application Progress Update',
        message: `Your application for ${job.title} at ${job.company?.name || 'the company'} has moved to the "${newStageLabel}" stage.`,
        data: {
          applicationId,
          jobId,
          jobTitle: job.title,
          companyName: job.company?.name,
          oldStage,
          newStage,
          status,
        },
      });
    } catch (error) {
      console.error('❌ Error in notifyStageChange:', error);
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

      // Create in-app notification
      await this.createInAppNotification({
        candidateId,
        type: 'APPLICATION_UPDATE',
        title: 'You\'ve Been Shortlisted!',
        message: `Congratulations! Your application for ${job.title} at ${job.company?.name || 'the company'} has been shortlisted.`,
        data: {
          applicationId,
          jobId,
          jobTitle: job.title,
          companyName: job.company?.name,
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

      // Create in-app notification
      const formattedDate = new Date(interviewDate).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

      let notificationMessage = `An interview has been scheduled for your application to ${job.title} at ${job.company?.name || 'the company'} on ${formattedDate}.`;
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
          companyName: job.company?.name,
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

      // Create in-app notification
      let message = `We regret to inform you that your application for ${job.title} at ${job.company?.name || 'the company'} was not successful at this time.`;
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
          companyName: job.company?.name,
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

      // Create in-app notification
      await this.createInAppNotification({
        candidateId,
        type: 'APPLICATION_UPDATE',
        title: '🎉 Offer Extended!',
        message: `Congratulations! An offer has been extended for ${job.title} at ${job.company?.name || 'the company'}. Please review the offer details in your dashboard.`,
        data: {
          applicationId,
          jobId,
          jobTitle: job.title,
          companyName: job.company?.name,
          offerDetails,
        },
      });
    } catch (error) {
      console.error('❌ Error in notifyOfferExtended:', error);
    }
  }
}

