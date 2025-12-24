/**
 * Candidate Notification Controller
 * Handles HTTP requests for candidate notifications
 */

import { Request, Response } from 'express';
import { CandidateNotificationService } from '../../services/candidate/CandidateNotificationService';
import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';

export class CandidateNotificationController {
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

            const result = await CandidateNotificationService.getNotifications(candidateId, {
                unreadOnly: unreadOnly === 'true',
                limit: limit ? parseInt(limit as string) : undefined,
                offset: offset ? parseInt(offset as string) : undefined
            });

            return res.json({
                success: true,
                data: result
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

            const count = await CandidateNotificationService.getUnreadCount(candidateId);

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

            const notification = await CandidateNotificationService.markAsRead(id, candidateId);

            return res.json({
                success: true,
                data: notification
            });
        } catch (error: any) {
            console.error('Error marking notification as read:', error);
            return res.status(error.message === 'Notification not found' ? 404 : 500).json({
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

            const result = await CandidateNotificationService.markAllAsRead(candidateId);

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

            await CandidateNotificationService.deleteNotification(id, candidateId);

            return res.json({
                success: true,
                message: 'Notification deleted'
            });
        } catch (error: any) {
            console.error('Error deleting notification:', error);
            return res.status(error.message === 'Notification not found' ? 404 : 500).json({
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
