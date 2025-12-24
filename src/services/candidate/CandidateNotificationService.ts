/**
 * Candidate Notification Service
 * Handles notification-related operations for candidates
 */

export class CandidateNotificationService {
    /**
     * Get all notifications for a candidate
     */
    static async getNotifications(candidateId: string, options?: {
        unreadOnly?: boolean;
        limit?: number;
        offset?: number;
    }) {
        const { prisma } = await import('../../lib/prisma');

        const where: any = { candidateId: candidateId };
        if (options?.unreadOnly) {
            where.read = false;
        }

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: options?.limit || 50,
                skip: options?.offset || 0,
            }),
            prisma.notification.count({ where })
        ]);

        return {
            notifications,
            total,
            unreadCount: await prisma.notification.count({
                where: { candidateId: candidateId, read: false }
            })
        };
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(notificationId: string, candidateId: string) {
        const { prisma } = await import('../../lib/prisma');

        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, candidateId: candidateId }
        });

        if (!notification) {
            throw new Error('Notification not found');
        }

        return await prisma.notification.update({
            where: { id: notificationId },
            data: {
                read: true,
                readAt: new Date()
            }
        });
    }

    /**
     * Mark all notifications as read
     */
    static async markAllAsRead(candidateId: string) {
        const { prisma } = await import('../../lib/prisma');

        return await prisma.notification.updateMany({
            where: {
                candidateId: candidateId,
                read: false
            },
            data: {
                read: true,
                readAt: new Date()
            }
        });
    }

    /**
     * Delete notification
     */
    static async deleteNotification(notificationId: string, candidateId: string) {
        const { prisma } = await import('../../lib/prisma');

        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, candidateId: candidateId }
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
        const { prisma } = await import('../../lib/prisma');

        return await prisma.notification.count({
            where: { candidateId: candidateId, read: false }
        });
    }
}
