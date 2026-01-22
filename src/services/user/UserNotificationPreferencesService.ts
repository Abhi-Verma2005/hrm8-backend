/**
 * User Notification Preferences Service
 * Handles notification preferences for HR Admin users
 * Implements rules engine for evaluating notification settings
 */

import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

// Event types that can be configured
export type NotificationEventType =
    | 'new_application'
    | 'application_status_change'
    | 'interview_scheduled'
    | 'job_posted'
    | 'payment_received'
    | 'payment_failed'
    | 'subscription_change'
    | 'system_announcement'
    | 'user_signup'
    | 'support_ticket'
    | 'new_message';

export type NotificationChannel = 'email' | 'in-app' | 'sms' | 'slack';

export interface EventPreference {
    enabled: boolean;
    channels: NotificationChannel[];
}

export interface QuietHours {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;
}

export interface UserNotificationPreferencesData {
    eventPreferences: Record<NotificationEventType, EventPreference>;
    quietHours?: QuietHours;
}

// Default preferences for new users
const DEFAULT_EVENT_PREFERENCES: Record<NotificationEventType, EventPreference> = {
    new_application: { enabled: true, channels: ['email', 'in-app'] },
    application_status_change: { enabled: true, channels: ['in-app'] },
    interview_scheduled: { enabled: true, channels: ['email', 'in-app'] },
    job_posted: { enabled: true, channels: ['in-app'] },
    payment_received: { enabled: true, channels: ['email', 'in-app'] },
    payment_failed: { enabled: true, channels: ['email', 'in-app'] },
    subscription_change: { enabled: true, channels: ['email', 'in-app'] },
    system_announcement: { enabled: true, channels: ['email', 'in-app'] },
    user_signup: { enabled: true, channels: ['in-app'] },
    support_ticket: { enabled: true, channels: ['email', 'in-app'] },
    new_message: { enabled: true, channels: ['email', 'in-app'] },
};

export class UserNotificationPreferencesService {
    /**
     * Get notification preferences for a user
     */
    static async getPreferences(userId: string): Promise<UserNotificationPreferencesData> {
        let preferences = await prisma.userNotificationPreferences.findUnique({
            where: { user_id: userId },
        });

        // Create default preferences if they don't exist
        if (!preferences) {
            preferences = await prisma.userNotificationPreferences.create({
                data: {
                    id: randomUUID(),
                    user_id: userId,
                    event_preferences: DEFAULT_EVENT_PREFERENCES as any,
                    quiet_hours: Prisma.DbNull,
                },
            });
        }

        return {
            eventPreferences: preferences.event_preferences as unknown as Record<NotificationEventType, EventPreference>,
            quietHours: preferences.quiet_hours as unknown as QuietHours | undefined,
        };
    }

    /**
     * Update notification preferences
     */
    static async updatePreferences(
        userId: string,
        data: Partial<UserNotificationPreferencesData>
    ): Promise<UserNotificationPreferencesData> {
        const existing = await prisma.userNotificationPreferences.findUnique({
            where: { user_id: userId },
        });

        if (existing) {
            const updated = await prisma.userNotificationPreferences.update({
                where: { user_id: userId },
                data: {
                    event_preferences: data.eventPreferences
                        ? { ...(existing.event_preferences as any), ...data.eventPreferences }
                        : existing.event_preferences,
                    quiet_hours: data.quietHours !== undefined ? (data.quietHours as any) : existing.quiet_hours,
                },
            });

            return {
                eventPreferences: updated.event_preferences as unknown as Record<NotificationEventType, EventPreference>,
                quietHours: updated.quiet_hours as unknown as QuietHours | undefined,
            };
        } else {
            // Create new preferences
            const created = await prisma.userNotificationPreferences.create({
                data: {
                    id: randomUUID(),
                    user_id: userId,
                    event_preferences: data.eventPreferences
                        ? { ...DEFAULT_EVENT_PREFERENCES, ...data.eventPreferences }
                        : (DEFAULT_EVENT_PREFERENCES as any),
                    quiet_hours: data.quietHours ? (data.quietHours as any) : null,
                },
            });

            return {
                eventPreferences: created.event_preferences as unknown as Record<NotificationEventType, EventPreference>,
                quietHours: created.quiet_hours as unknown as QuietHours | undefined,
            };
        }
    }

    /**
     * Check if a notification should be sent based on preferences
     */
    static async shouldSendNotification(
        userId: string,
        eventType: NotificationEventType,
        channel: NotificationChannel
    ): Promise<boolean> {
        const preferences = await this.getPreferences(userId);

        // Check if in quiet hours
        if (this.isQuietHours(preferences.quietHours)) {
            // Only send critical notifications during quiet hours
            const criticalEvents: NotificationEventType[] = ['payment_failed', 'system_announcement'];
            if (!criticalEvents.includes(eventType)) {
                return false;
            }
        }

        // Check event-specific preferences
        const eventPref = preferences.eventPreferences[eventType];
        if (!eventPref) {
            return true; // Default to sending if no preference set
        }

        if (!eventPref.enabled) {
            return false;
        }

        return eventPref.channels.includes(channel);
    }

    /**
     * Check if currently in quiet hours
     */
    static isQuietHours(quietHours?: QuietHours): boolean {
        if (!quietHours?.enabled) {
            return false;
        }

        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTime = currentHours * 60 + currentMinutes;

        const [startHours, startMinutes] = quietHours.start.split(':').map(Number);
        const [endHours, endMinutes] = quietHours.end.split(':').map(Number);
        const startTime = startHours * 60 + startMinutes;
        const endTime = endHours * 60 + endMinutes;

        // Handle overnight quiet hours (e.g., 22:00 - 08:00)
        if (startTime > endTime) {
            return currentTime >= startTime || currentTime <= endTime;
        }

        return currentTime >= startTime && currentTime <= endTime;
    }

    /**
     * Get channels to use for a specific event
     */
    static async getEnabledChannels(
        userId: string,
        eventType: NotificationEventType
    ): Promise<NotificationChannel[]> {
        const preferences = await this.getPreferences(userId);

        // Check if in quiet hours
        if (this.isQuietHours(preferences.quietHours)) {
            const criticalEvents: NotificationEventType[] = ['payment_failed', 'system_announcement'];
            if (!criticalEvents.includes(eventType)) {
                return [];
            }
        }

        const eventPref = preferences.eventPreferences[eventType];
        if (!eventPref?.enabled) {
            return [];
        }

        // Filter out channels that are not yet implemented (sms, slack)
        return eventPref.channels.filter(ch => ch === 'email' || ch === 'in-app');
    }
}
