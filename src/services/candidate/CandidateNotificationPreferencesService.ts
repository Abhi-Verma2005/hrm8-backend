/**
 * Candidate Notification Preferences Service
 * Handles notification preferences for candidates
 */

import { randomUUID } from 'crypto';

export interface NotificationPreferencesData {
  applicationStatusChanges?: boolean;
  interviewReminders?: boolean;
  jobMatchAlerts?: boolean;
  messages?: boolean;
  systemUpdates?: boolean;
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  reminderHoursBefore?: number;
}

export class CandidateNotificationPreferencesService {
  /**
   * Get notification preferences for a candidate
   */
  static async getPreferences(candidateId: string) {
    const { prisma } = await import('../../lib/prisma');

    let preferences = await prisma.notificationPreferences.findUnique({
      where: { candidate_id: candidateId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await prisma.notificationPreferences.create({
        data: {
          id: randomUUID(),
          candidate_id: candidateId,
          application_status_changes: true,
          interview_reminders: true,
          job_match_alerts: true,
          messages: true,
          system_updates: true,
          email_enabled: true,
          in_app_enabled: true,
          reminder_hours_before: 24,
          updated_at: new Date(),
        },
      });
    }

    return preferences;
  }

  /**
   * Update notification preferences
   */
  static async updatePreferences(
    candidateId: string,
    data: NotificationPreferencesData
  ) {
    const { prisma } = await import('../../lib/prisma');

    // Check if preferences exist
    const existing = await prisma.notificationPreferences.findUnique({
      where: { candidate_id: candidateId },
    });

    if (existing) {
      return await prisma.notificationPreferences.update({
        where: { candidate_id: candidateId },
        data: {
          application_status_changes: data.applicationStatusChanges ?? existing.application_status_changes,
          interview_reminders: data.interviewReminders ?? existing.interview_reminders,
          job_match_alerts: data.jobMatchAlerts ?? existing.job_match_alerts,
          messages: data.messages ?? existing.messages,
          system_updates: data.systemUpdates ?? existing.system_updates,
          email_enabled: data.emailEnabled ?? existing.email_enabled,
          in_app_enabled: data.inAppEnabled ?? existing.in_app_enabled,
          reminder_hours_before: data.reminderHoursBefore ?? existing.reminder_hours_before,
        },
      });
    } else {
      return await prisma.notificationPreferences.create({
        data: {
          id: randomUUID(),
          candidate_id: candidateId,
          application_status_changes: data.applicationStatusChanges ?? true,
          interview_reminders: data.interviewReminders ?? true,
          job_match_alerts: data.jobMatchAlerts ?? true,
          messages: data.messages ?? true,
          system_updates: data.systemUpdates ?? true,
          email_enabled: data.emailEnabled ?? true,
          in_app_enabled: data.inAppEnabled ?? true,
          reminder_hours_before: data.reminderHoursBefore ?? 24,
          updated_at: new Date(),
        },
      });
    }
  }

  /**
   * Check if a notification type should be sent based on preferences
   */
  static async shouldSendNotification(
    candidateId: string,
    notificationType: 'APPLICATION_UPDATE' | 'INTERVIEW_SCHEDULED' | 'JOB_ALERT' | 'MESSAGE' | 'SYSTEM',
    channel: 'email' | 'inApp'
  ): Promise<boolean> {
    const preferences = await this.getPreferences(candidateId);

    // Check channel preference
    if (channel === 'email' && !preferences.email_enabled) {
      return false;
    }
    if (channel === 'inApp' && !preferences.in_app_enabled) {
      return false;
    }

    // Check type-specific preferences
    switch (notificationType) {
      case 'APPLICATION_UPDATE':
        return preferences.application_status_changes;
      case 'INTERVIEW_SCHEDULED':
        return preferences.interview_reminders;
      case 'JOB_ALERT':
        return preferences.job_match_alerts;
      case 'MESSAGE':
        return preferences.messages;
      case 'SYSTEM':
        return preferences.system_updates;
      default:
        return true;
    }
  }
}


