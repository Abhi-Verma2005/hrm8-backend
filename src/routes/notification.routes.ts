/**
 * Universal Notification Routes
 * Provides notification endpoints for all authenticated user types
 */

import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';

const router: Router = Router();

/**
 * @route GET /api/notifications
 * @desc Get notifications for authenticated user
 * @query unreadOnly - Filter to only unread notifications
 * @query limit - Number of notifications to return (default: 50)
 * @query offset - Pagination offset
 * @query types - Comma-separated list of notification types to filter
 */
router.get('/', NotificationController.getNotifications);

/**
 * @route GET /api/notifications/count
 * @desc Get unread notification count
 */
router.get('/count', NotificationController.getUnreadCount);

/**
 * @route PATCH /api/notifications/read-all
 * @desc Mark all notifications as read
 */
router.patch('/read-all', NotificationController.markAllAsRead);

/**
 * @route PATCH /api/notifications/:id/read
 * @desc Mark specific notification as read
 */
router.patch('/:id/read', NotificationController.markAsRead);

/**
 * @route DELETE /api/notifications/:id
 * @desc Delete a notification
 */
router.delete('/:id', NotificationController.deleteNotification);

export default router;
