/**
 * Universal Notification Service
 * Handles notification creation, fetching, and management for all user types
 */

import { prisma } from '../../lib/prisma';
import {
    NotificationRecipientType,
    UniversalNotificationType,
    UniversalNotification
} from '@prisma/client';
import {
    broadcastNotificationToUser,
    broadcastUnreadCount
} from './NotificationBroadcastService';
import { emailService } from '../email/EmailService';
import { UserNotificationPreferencesService } from '../user/UserNotificationPreferencesService';
import { NotificationEventType } from '../../types/notificationPreferences';

interface CreateNotificationParams {
    recipientType: NotificationRecipientType;
    recipientId: string;
    type: UniversalNotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    jobId?: string;
    applicationId?: string;
    companyId?: string;
    leadId?: string;
    regionId?: string;
    actionUrl?: string;
}

interface BulkCreateNotificationParams {
    recipients: Array<{
        recipientType: NotificationRecipientType;
        recipientId: string;
    }>;
    type: UniversalNotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    jobId?: string;
    applicationId?: string;
    companyId?: string;
    leadId?: string;
    regionId?: string;
    actionUrl?: string;
}

interface GetNotificationsOptions {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
    types?: UniversalNotificationType[];
}

interface NotificationsResult {
    notifications: UniversalNotification[];
    total: number;
    unreadCount: number;
}

const NOTIFICATION_EXPIRY_DAYS = 30;

export class UniversalNotificationService {
    /**
     * Map UniversalNotificationType to NotificationEventType
     */
    private static mapToEventType(type: UniversalNotificationType): NotificationEventType {
        switch (type) {
            case 'NEW_APPLICATION':
                return 'new_application';
            case 'APPLICATION_STATUS_CHANGED':
                return 'application_status_change';
            case 'INTERVIEW_SCHEDULED':
                return 'interview_scheduled';
            case 'JOB_ASSIGNED':
                return 'job_posted'; // Closest match
            case 'SUBSCRIPTION_PURCHASED':
                return 'subscription_change';
            case 'SYSTEM_ANNOUNCEMENT':
                return 'system_announcement';
            case 'JOB_CREATED':
                return 'job_posted';
            default:
                return 'system_announcement'; // Default fallback
        }
    }

    /**
     * Create a single notification
     */
    static async createNotification(params: CreateNotificationParams): Promise<UniversalNotification | null> {
        // Preference Check for Users
        if (params.recipientType === 'USER') {
            const eventType = this.mapToEventType(params.type);

            // Check if In-App notifications are enabled for this event
            const shouldSendInApp = await UserNotificationPreferencesService.shouldSendNotification(
                params.recipientId,
                eventType,
                'in-app'
            );

            // Check if Email notifications are enabled for this event
            const shouldSendEmail = await UserNotificationPreferencesService.shouldSendNotification(
                params.recipientId,
                eventType,
                'email'
            );

            if (shouldSendEmail) {
                // Fetch user email to send notification
                const user = await prisma.user.findUnique({
                    where: { id: params.recipientId },
                    select: { email: true }
                });

                if (user?.email) {
                    await emailService.sendNotificationEmail(
                        user.email,
                        params.title,
                        params.message,
                        params.actionUrl
                    );
                }
            }

            if (!shouldSendInApp) {
                // If in-app is disabled, we don't create the DB record
                return null;
            }
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + NOTIFICATION_EXPIRY_DAYS);

        const notification = await prisma.universalNotification.create({
            data: {
                recipient_type: params.recipientType,
                recipient_id: params.recipientId,
                type: params.type,
                title: params.title,
                message: params.message,
                data: (params.data as any) || undefined,
                job_id: params.jobId || null,
                application_id: params.applicationId || null,
                company_id: params.companyId || null,
                lead_id: params.leadId || null,
                region_id: params.regionId || null,
                action_url: params.actionUrl || null,
                expires_at: expiresAt,
            },
        });

        // Broadcast real-time notification
        broadcastNotificationToUser(notification);

        return notification;
    }

    /**
     * Create notifications for multiple recipients
     */
    static async createBulkNotifications(params: BulkCreateNotificationParams): Promise<UniversalNotification[]> {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + NOTIFICATION_EXPIRY_DAYS);

        // Filter recipients based on preferences
        const recipientsToNotify = await Promise.all(
            params.recipients.map(async (recipient) => {
                if (recipient.recipientType === 'USER') {
                    const eventType = this.mapToEventType(params.type);
                    const shouldSend = await UserNotificationPreferencesService.shouldSendNotification(
                        recipient.recipientId,
                        eventType,
                        'in-app'
                    );
                    return shouldSend ? recipient : null;
                }
                return recipient; // Always notify non-USER types (Candidates/Consultants) for now
            })
        );

        const validRecipients = recipientsToNotify.filter((r): r is NonNullable<typeof r> => r !== null);

        if (validRecipients.length === 0) {
            return [];
        }

        const notifications = await Promise.all(
            validRecipients.map(recipient =>
                prisma.universalNotification.create({
                    data: {
                        recipient_type: recipient.recipientType,
                        recipient_id: recipient.recipientId,
                        type: params.type,
                        title: params.title,
                        message: params.message,
                        data: (params.data as any) || undefined,
                        job_id: params.jobId || null,
                        application_id: params.applicationId || null,
                        company_id: params.companyId || null,
                        lead_id: params.leadId || null,
                        region_id: params.regionId || null,
                        action_url: params.actionUrl || null,
                        expires_at: expiresAt,
                    },
                })
            )
        );

        // Broadcast to all recipients
        notifications.forEach(notification => {
            broadcastNotificationToUser(notification);
        });

        return notifications;
    }

    /**
     * Get notifications for a specific user
     */
    static async getNotifications(
        recipientType: NotificationRecipientType,
        recipientId: string,
        options: GetNotificationsOptions = {}
    ): Promise<NotificationsResult> {
        const where: any = {
            recipient_type: recipientType,
            recipient_id: recipientId,
            expires_at: { gt: new Date() }, // Only get non-expired notifications
        };

        if (options.unreadOnly) {
            where.read = false;
        }

        if (options.types && options.types.length > 0) {
            where.type = { in: options.types };
        }

        const [notifications, total, unreadCount] = await Promise.all([
            prisma.universalNotification.findMany({
                where,
                orderBy: { created_at: 'desc' },
                take: options.limit || 50,
                skip: options.offset || 0,
            }),
            prisma.universalNotification.count({ where }),
            prisma.universalNotification.count({
                where: {
                    recipient_type: recipientType,
                    recipient_id: recipientId,
                    read: false,
                    expires_at: { gt: new Date() },
                },
            }),
        ]);

        return { notifications, total, unreadCount };
    }

    /**
     * Get unread count for a user
     */
    static async getUnreadCount(
        recipientType: NotificationRecipientType,
        recipientId: string
    ): Promise<number> {
        return await prisma.universalNotification.count({
            where: {
                recipient_type: recipientType,
                recipient_id: recipientId,
                read: false,
                expires_at: { gt: new Date() },
            },
        });
    }

    /**
     * Mark a notification as read
     */
    static async markAsRead(
        notificationId: string,
        recipientType: NotificationRecipientType,
        recipientId: string
    ): Promise<UniversalNotification | null> {
        // Verify ownership
        const notification = await prisma.universalNotification.findFirst({
            where: {
                id: notificationId,
                recipient_type: recipientType,
                recipient_id: recipientId,
            },
        });

        if (!notification) {
            return null;
        }

        const updatedNotification = await prisma.universalNotification.update({
            where: { id: notificationId },
            data: {
                read: true,
                read_at: new Date(),
            },
        });

        // Broadcast updated unread count
        const unreadCount = await this.getUnreadCount(recipientType, recipientId);
        broadcastUnreadCount(recipientType, recipientId, unreadCount);

        return updatedNotification;
    }

    /**
     * Mark all notifications as read for a user
     */
    static async markAllAsRead(
        recipientType: NotificationRecipientType,
        recipientId: string
    ): Promise<{ count: number }> {
        const result = await prisma.universalNotification.updateMany({
            where: {
                recipient_type: recipientType,
                recipient_id: recipientId,
                read: false,
            },
            data: {
                read: true,
                read_at: new Date(),
            },
        });

        // Broadcast updated unread count (should be 0)
        broadcastUnreadCount(recipientType, recipientId, 0);

        return { count: result.count };
    }

    /**
     * Delete a notification
     */
    static async deleteNotification(
        notificationId: string,
        recipientType: NotificationRecipientType,
        recipientId: string
    ): Promise<boolean> {
        // Verify ownership first
        const notification = await prisma.universalNotification.findFirst({
            where: {
                id: notificationId,
                recipient_type: recipientType,
                recipient_id: recipientId,
            },
        });

        if (!notification) {
            return false;
        }

        await prisma.universalNotification.delete({
            where: { id: notificationId },
        });

        return true;
    }

    /**
     * Cleanup expired notifications (to be called by scheduled job)
     */
    static async cleanupExpiredNotifications(): Promise<number> {
        const result = await prisma.universalNotification.deleteMany({
            where: {
                expires_at: { lt: new Date() },
            },
        });

        console.log(`🧹 Cleaned up ${result.count} expired notifications`);
        return result.count;
    }

    /**
     * Get target recipients based on filters (Role, Region, etc.)
     */
    static async getRecipientsByFilters(filters: {
        role?: NotificationRecipientType;
        regionId?: string;
        companyId?: string;
    }): Promise<Array<{ recipientType: NotificationRecipientType; recipientId: string }>> {
        const recipients: Array<{ recipientType: NotificationRecipientType; recipientId: string }> = [];

        // 1. Target Company HR Users
        if (!filters.role || filters.role === NotificationRecipientType.USER) {
            const userWhere: any = {};
            if (filters.regionId) {
                userWhere.company = { region_id: filters.regionId };
            }
            if (filters.companyId) {
                userWhere.company_id = filters.companyId;
            }

            const users = await prisma.user.findMany({
                where: userWhere,
                select: { id: true },
            });

            users.forEach(u => recipients.push({
                recipientType: NotificationRecipientType.USER,
                recipientId: u.id
            }));
        }

        // 2. Target Consultants
        if (!filters.role || filters.role === NotificationRecipientType.CONSULTANT) {
            const consultantWhere: any = {};
            if (filters.regionId) {
                consultantWhere.region_id = filters.regionId;
            }

            const consultants = await prisma.consultant.findMany({
                where: consultantWhere,
                select: { id: true },
            });

            consultants.forEach(c => recipients.push({
                recipientType: NotificationRecipientType.CONSULTANT,
                recipientId: c.id
            }));
        }

        // 3. Target Candidates
        // Candidates don't have direct region ownership, usually targeted globally or by some other criteria
        if (!filters.role || filters.role === NotificationRecipientType.CANDIDATE) {
            // If regional filter is applied, we might skip candidates or filter by their stated location (if implemented)
            // For now, if regionId is present and role isn't explicitly CANDIDATE, we skip them to avoid cross-region spam
            if (!filters.regionId || filters.role === NotificationRecipientType.CANDIDATE) {
                const candidates = await prisma.candidate.findMany({
                    select: { id: true },
                });

                candidates.forEach(can => recipients.push({
                    recipientType: NotificationRecipientType.CANDIDATE,
                    recipientId: can.id
                }));
            }
        }

        return recipients;
    }

    /**
     * Helper to resolve user type from different auth contexts
     */
    static resolveRecipientType(userType: 'USER' | 'CANDIDATE' | 'CONSULTANT' | 'HRM8'): NotificationRecipientType {
        switch (userType) {
            case 'USER':
                return NotificationRecipientType.USER;
            case 'CANDIDATE':
                return NotificationRecipientType.CANDIDATE;
            case 'CONSULTANT':
                return NotificationRecipientType.CONSULTANT;
            case 'HRM8':
                return NotificationRecipientType.HRM8_USER;
            default:
                throw new Error(`Unknown user type: ${userType}`);
        }
    }
}
