/**
 * Candidate Notification Preferences Service
 * Handles notification preferences for candidates
 */

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
      where: { candidateId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await prisma.notificationPreferences.create({
        data: {
          candidateId,
          applicationStatusChanges: true,
          interviewReminders: true,
          jobMatchAlerts: true,
          messages: true,
          systemUpdates: true,
          emailEnabled: true,
          inAppEnabled: true,
          reminderHoursBefore: 24,
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
      where: { candidateId },
    });

    if (existing) {
      return await prisma.notificationPreferences.update({
        where: { candidateId },
        data: {
          applicationStatusChanges: data.applicationStatusChanges ?? existing.applicationStatusChanges,
          interviewReminders: data.interviewReminders ?? existing.interviewReminders,
          jobMatchAlerts: data.jobMatchAlerts ?? existing.jobMatchAlerts,
          messages: data.messages ?? existing.messages,
          systemUpdates: data.systemUpdates ?? existing.systemUpdates,
          emailEnabled: data.emailEnabled ?? existing.emailEnabled,
          inAppEnabled: data.inAppEnabled ?? existing.inAppEnabled,
          reminderHoursBefore: data.reminderHoursBefore ?? existing.reminderHoursBefore,
        },
      });
    } else {
      return await prisma.notificationPreferences.create({
        data: {
          candidateId,
          applicationStatusChanges: data.applicationStatusChanges ?? true,
          interviewReminders: data.interviewReminders ?? true,
          jobMatchAlerts: data.jobMatchAlerts ?? true,
          messages: data.messages ?? true,
          systemUpdates: data.systemUpdates ?? true,
          emailEnabled: data.emailEnabled ?? true,
          inAppEnabled: data.inAppEnabled ?? true,
          reminderHoursBefore: data.reminderHoursBefore ?? 24,
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
    if (channel === 'email' && !preferences.emailEnabled) {
      return false;
    }
    if (channel === 'inApp' && !preferences.inAppEnabled) {
      return false;
    }

    // Check type-specific preferences
    switch (notificationType) {
      case 'APPLICATION_UPDATE':
        return preferences.applicationStatusChanges;
      case 'INTERVIEW_SCHEDULED':
        return preferences.interviewReminders;
      case 'JOB_ALERT':
        return preferences.jobMatchAlerts;
      case 'MESSAGE':
        return preferences.messages;
      case 'SYSTEM':
        return preferences.systemUpdates;
      default:
        return true;
    }
  }
}

