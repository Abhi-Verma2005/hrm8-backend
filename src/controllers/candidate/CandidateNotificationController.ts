/**
 * Candidate Notification Controller
 * Handles HTTP requests for candidate notifications
 */

import { Request, Response } from 'express';

import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';

export class CandidateNotificationController {
    /**
     * Get notifications for authenticated candidate
     */
    /**
     * Get notifications for authenticated candidate
     */
    static async getNotifications(req: Request, res: Response) {
        try {
            const candidateId = (req as CandidateAuthenticatedRequest).candidate?.id;

            if (!candidateId) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
            }

            const { unreadOnly, limit, offset } = req.query;

            // Use UniversalNotificationService
            const { UniversalNotificationService } = await import('../../services/notification/UniversalNotificationService');
            const { NotificationRecipientType } = await import('@prisma/client');

            const result = await UniversalNotificationService.getNotifications(
                NotificationRecipientType.CANDIDATE,
                candidateId,
                {
                    unreadOnly: unreadOnly === 'true',
                    limit: limit ? parseInt(limit as string) : undefined,
                    offset: offset ? parseInt(offset as string) : undefined
                }
            );

            // Map standard notifications to expected legacy format if needed
            // The frontend expects data inside 'data' property
            const mappedNotifications = result.notifications.map((n: any) => ({
                id: n.id,
                type: n.type,
                title: n.title,
                message: n.message,
                read: n.read,
                createdAt: n.created_at || n.createdAt,
                // Merge explicit columns into data object for frontend compatibility
                data: {
                    ...(n.data as object || {}),
                    jobId: n.job_id || n.jobId,
                    applicationId: n.application_id || n.applicationId,
                    companyId: n.company_id || n.companyId,
                    actionUrl: n.action_url || n.actionUrl
                }
            }));

            return res.json({
                success: true,
                data: {
                    notifications: mappedNotifications,
                    total: result.total,
                    unreadCount: result.unreadCount
                }
            });
        } catch (error) {
            console.error('Error getting notifications:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get notifications'
            });
        }
    }

    /**
     * Get unread count
     */
    static async getUnreadCount(req: Request, res: Response) {
        try {
            const candidateId = (req as CandidateAuthenticatedRequest).candidate?.id;

            if (!candidateId) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
            }

            const { UniversalNotificationService } = await import('../../services/notification/UniversalNotificationService');
            const { NotificationRecipientType } = await import('@prisma/client');

            const count = await UniversalNotificationService.getUnreadCount(
                NotificationRecipientType.CANDIDATE,
                candidateId
            );

            return res.json({
                success: true,
                data: { count }
            });
        } catch (error) {
            console.error('Error getting unread count:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get unread count'
            });
        }
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(req: Request, res: Response) {
        try {
            const candidateId = (req as CandidateAuthenticatedRequest).candidate?.id;
            const { id } = req.params;

            if (!candidateId) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
            }

            const { UniversalNotificationService } = await import('../../services/notification/UniversalNotificationService');
            const { NotificationRecipientType } = await import('@prisma/client');

            const notification = await UniversalNotificationService.markAsRead(
                id,
                NotificationRecipientType.CANDIDATE,
                candidateId
            );

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    error: 'Notification not found'
                });
            }

            return res.json({
                success: true,
                data: notification
            });
        } catch (error: any) {
            console.error('Error marking notification as read:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to mark notification as read'
            });
        }
    }

    /**
     * Mark all notifications as read
     */
    static async markAllAsRead(req: Request, res: Response) {
        try {
            const candidateId = (req as CandidateAuthenticatedRequest).candidate?.id;

            if (!candidateId) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
            }

            const { UniversalNotificationService } = await import('../../services/notification/UniversalNotificationService');
            const { NotificationRecipientType } = await import('@prisma/client');

            const result = await UniversalNotificationService.markAllAsRead(
                NotificationRecipientType.CANDIDATE,
                candidateId
            );

            return res.json({
                success: true,
                data: { updated: result.count }
            });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to mark all notifications as read'
            });
        }
    }

    /**
     * Delete notification
     */
    static async deleteNotification(req: Request, res: Response) {
        try {
            const candidateId = (req as CandidateAuthenticatedRequest).candidate?.id;
            const { id } = req.params;

            if (!candidateId) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
            }

            const { UniversalNotificationService } = await import('../../services/notification/UniversalNotificationService');
            const { NotificationRecipientType } = await import('@prisma/client');

            const success = await UniversalNotificationService.deleteNotification(
                id,
                NotificationRecipientType.CANDIDATE,
                candidateId
            );

            if (!success) {
                return res.status(404).json({
                    success: false,
                    error: 'Notification not found'
                });
            }

            return res.json({
                success: true,
                message: 'Notification deleted'
            });
        } catch (error: any) {
            console.error('Error deleting notification:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to delete notification'
            });
        }
    }

    /**
     * Get notification preferences
     */
    static async getPreferences(req: Request, res: Response) {
        try {
            const candidateId = (req as CandidateAuthenticatedRequest).candidate?.id;

            if (!candidateId) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
            }

            const { CandidateNotificationPreferencesService } = await import('../../services/candidate/CandidateNotificationPreferencesService');
            const preferences = await CandidateNotificationPreferencesService.getPreferences(candidateId);

            return res.json({
                success: true,
                data: preferences
            });
        } catch (error) {
            console.error('Error getting notification preferences:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get notification preferences'
            });
        }
    }

    /**
     * Update notification preferences
     */
    static async updatePreferences(req: Request, res: Response) {
        try {
            const candidateId = (req as CandidateAuthenticatedRequest).candidate?.id;

            if (!candidateId) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
            }

            const { CandidateNotificationPreferencesService } = await import('../../services/candidate/CandidateNotificationPreferencesService');
            const preferences = await CandidateNotificationPreferencesService.updatePreferences(candidateId, req.body);

            return res.json({
                success: true,
                data: preferences
            });
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update notification preferences'
            });
        }
    }

    /**
     * Get upcoming interviews
     */
    static async getUpcomingInterviews(req: Request, res: Response) {
        try {
            const candidateId = (req as CandidateAuthenticatedRequest).candidate?.id;

            if (!candidateId) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authenticated'
                });
            }

            const { InterviewReminderService } = await import('../../services/notification/InterviewReminderService');
            const daysAhead = req.query.daysAhead ? parseInt(req.query.daysAhead as string) : 7;
            const interviews = await InterviewReminderService.getUpcomingInterviews(candidateId, daysAhead);

            return res.json({
                success: true,
                data: interviews
            });
        } catch (error) {
            console.error('Error getting upcoming interviews:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get upcoming interviews'
            });
        }
    }
}
