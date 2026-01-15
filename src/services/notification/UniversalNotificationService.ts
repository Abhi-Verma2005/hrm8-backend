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
     * Create a single notification
     */
    static async createNotification(params: CreateNotificationParams): Promise<UniversalNotification> {
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

        const notifications = await Promise.all(
            params.recipients.map(recipient =>
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
