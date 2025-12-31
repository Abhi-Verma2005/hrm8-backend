/**
 * Candidate Notification Service
 * Handles notification-related operations for candidates
 */

import { prisma } from '../../lib/prisma';

export class CandidateNotificationService {
    /**
     * Get all notifications for a candidate
     */
    static async getNotifications(candidateId: string, options?: {
        unreadOnly?: boolean;
        limit?: number;
        offset?: number;
    }) {
        const where: any = { candidate_id: candidateId };
        if (options?.unreadOnly) {
            where.read = false;
        }

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { created_at: 'desc' },
                take: options?.limit || 50,
                skip: options?.offset || 0,
            }),
            prisma.notification.count({ where })
        ]);

        return {
            notifications,
            total,
            unreadCount: await prisma.notification.count({
                where: { candidate_id: candidateId, read: false }
            })
        };
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(notificationId: string, candidateId: string) {
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, candidate_id: candidateId }
        });

        if (!notification) {
            throw new Error('Notification not found');
        }

        return await prisma.notification.update({
            where: { id: notificationId },
            data: {
                read: true,
                read_at: new Date()
            }
        });
    }

    /**
     * Mark all notifications as read
     */
    static async markAllAsRead(candidateId: string) {
        return await prisma.notification.updateMany({
            where: {
                candidate_id: candidateId,
                read: false
            },
            data: {
                read: true,
                read_at: new Date()
            }
        });
    }

    /**
     * Delete notification
     */
    static async deleteNotification(notificationId: string, candidateId: string) {
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, candidate_id: candidateId }
        });

        if (!notification) {
            throw new Error('Notification not found');
        }

        return await prisma.notification.delete({
            where: { id: notificationId }
        });
    }

    /**
     * Get unread count
     */
    static async getUnreadCount(candidateId: string) {
        return await prisma.notification.count({
            where: { candidate_id: candidateId, read: false }
        });
    }
}
