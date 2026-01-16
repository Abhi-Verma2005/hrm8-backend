/**
 * Universal Notification Controller
 * Handles notification endpoints for all user types
 */

import { Request, Response } from 'express';
import { UniversalNotificationService } from '../services/notification/UniversalNotificationService';
import { NotificationRecipientType } from '@prisma/client';

/**
 * Helper to extract user info from different session types
 */
function extractUserInfo(req: Request): { recipientType: NotificationRecipientType; recipientId: string } | null {
    // Check for Company HR User (from standard auth)
    if ((req as any).user?.id) {
        return {
            recipientType: NotificationRecipientType.USER,
            recipientId: (req as any).user.id,
        };
    }

    // Check for Candidate (from candidate auth)
    if ((req as any).candidate?.id) {
        return {
            recipientType: NotificationRecipientType.CANDIDATE,
            recipientId: (req as any).candidate.id,
        };
    }

    // Check for Consultant (from consultant auth)
    if ((req as any).consultant?.id) {
        return {
            recipientType: NotificationRecipientType.CONSULTANT,
            recipientId: (req as any).consultant.id,
        };
    }

    // Check for HRM8 User (from hrm8 auth)
    if ((req as any).hrm8User?.id) {
        return {
            recipientType: NotificationRecipientType.HRM8_USER,
            recipientId: (req as any).hrm8User.id,
        };
    }

    return null;
}

import { UniversalNotificationType } from '@prisma/client';

export class NotificationController {
    /**
     * Create a test notification (Dev/Admin only)
     * POST /api/notifications/test
     */
    static async createTestNotification(req: Request, res: Response) {
        try {
            const userInfo = extractUserInfo(req);
            if (!userInfo) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { title, message, type } = req.body;

            const notification = await UniversalNotificationService.createNotification({
                recipientType: userInfo.recipientType,
                recipientId: userInfo.recipientId,
                type: (type as UniversalNotificationType) || UniversalNotificationType.SYSTEM_ANNOUNCEMENT,
                title: title || 'Test Notification',
                message: message || 'This is a test notification sent at ' + new Date().toLocaleTimeString(),
                data: {
                    source: 'manual_test',
                    timestamp: Date.now(),
                },
            });

            return res.json({
                success: true,
                data: notification,
                message: 'Test notification created and broadcasted',
            });
        } catch (error) {
            console.error('Error creating test notification:', error);
            return res.status(500).json({ error: 'Failed to create test notification' });
        }
    }

    /**
     * Get notifications for the authenticated user
     * GET /api/notifications
     */
    static async getNotifications(req: Request, res: Response) {
        try {
            const userInfo = extractUserInfo(req);
            if (!userInfo) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { unreadOnly, limit, offset, types } = req.query;

            const result = await UniversalNotificationService.getNotifications(
                userInfo.recipientType,
                userInfo.recipientId,
                {
                    unreadOnly: unreadOnly === 'true',
                    limit: limit ? parseInt(limit as string, 10) : 50,
                    offset: offset ? parseInt(offset as string, 10) : 0,
                    types: types ? (types as string).split(',') as any : undefined,
                }
            );

            return res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    }

    /**
     * Get unread notification count
     * GET /api/notifications/count
     */
    static async getUnreadCount(req: Request, res: Response) {
        try {
            const userInfo = extractUserInfo(req);
            if (!userInfo) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const unreadCount = await UniversalNotificationService.getUnreadCount(
                userInfo.recipientType,
                userInfo.recipientId
            );

            return res.json({
                success: true,
                data: { unreadCount },
            });
        } catch (error) {
            console.error('Error fetching unread count:', error);
            return res.status(500).json({ error: 'Failed to fetch unread count' });
        }
    }

    /**
     * Mark a notification as read
     * PATCH /api/notifications/:id/read
     */
    static async markAsRead(req: Request, res: Response) {
        try {
            const userInfo = extractUserInfo(req);
            if (!userInfo) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { id } = req.params;

            const notification = await UniversalNotificationService.markAsRead(
                id,
                userInfo.recipientType,
                userInfo.recipientId
            );

            if (!notification) {
                return res.status(404).json({ error: 'Notification not found' });
            }

            return res.json({
                success: true,
                data: notification,
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return res.status(500).json({ error: 'Failed to mark notification as read' });
        }
    }

    /**
     * Mark all notifications as read
     * PATCH /api/notifications/read-all
     */
    static async markAllAsRead(req: Request, res: Response) {
        try {
            const userInfo = extractUserInfo(req);
            if (!userInfo) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const result = await UniversalNotificationService.markAllAsRead(
                userInfo.recipientType,
                userInfo.recipientId
            );

            return res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            return res.status(500).json({ error: 'Failed to mark all notifications as read' });
        }
    }

    /**
     * Delete a notification
     * DELETE /api/notifications/:id
     */
    static async deleteNotification(req: Request, res: Response) {
        try {
            const userInfo = extractUserInfo(req);
            if (!userInfo) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { id } = req.params;

            const deleted = await UniversalNotificationService.deleteNotification(
                id,
                userInfo.recipientType,
                userInfo.recipientId
            );

            if (!deleted) {
                return res.status(404).json({ error: 'Notification not found' });
            }

            return res.json({
                success: true,
                message: 'Notification deleted',
            });
        } catch (error) {
            console.error('Error deleting notification:', error);
            return res.status(500).json({ error: 'Failed to delete notification' });
        }
    }
    /**
     * Push a pulse notification (Regional Admin broadcast)
     * POST /api/notifications/pulse
     */
    static async pushPulse(req: Request, res: Response) {
        try {
            const hrm8User = (req as any).hrm8User;

            if (!hrm8User) {
                return res.status(403).json({ error: 'Only HRM8 Admins can push pulse notifications' });
            }

            const { title, message, targetRole, regionId, companyId, type, actionUrl } = req.body;

            // Security: If REGIONAL_LICENSEE, enforce their regionId
            // Note: assignedRegionIds from middleware could also be checked
            const effectiveRegionId = hrm8User.role === 'REGIONAL_LICENSEE'
                ? (hrm8User.region_id || (req as any).assignedRegionIds?.[0])
                : regionId;

            const recipients = await UniversalNotificationService.getRecipientsByFilters({
                role: targetRole as NotificationRecipientType,
                regionId: effectiveRegionId,
                companyId
            });

            if (recipients.length === 0) {
                return res.json({
                    success: true,
                    count: 0,
                    message: 'No recipients matching filters found',
                });
            }

            const notifications = await UniversalNotificationService.createBulkNotifications({
                recipients,
                type: (type as UniversalNotificationType) || UniversalNotificationType.SYSTEM_ANNOUNCEMENT,
                title,
                message,
                actionUrl,
                regionId: effectiveRegionId,
                companyId
            });

            return res.json({
                success: true,
                count: notifications.length,
                message: `Pulse notification sent to ${notifications.length} recipients`,
            });
        } catch (error) {
            console.error('Error pushing pulse notification:', error);
            return res.status(500).json({ error: 'Failed to push pulse notification' });
        }
    }
}
