/**
 * User Notification Preferences Routes
 * API routes for HR Admin notification preferences and alert rules
 */

import { Router } from 'express';
import { UserNotificationPreferencesController } from '../controllers/user/UserNotificationPreferencesController';
import { authenticate } from '../middleware/auth';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/user/notifications/preferences
 * @desc Get notification preferences for the authenticated user
 */
router.get('/preferences', UserNotificationPreferencesController.getPreferences);

/**
 * @route PUT /api/user/notifications/preferences
 * @desc Update notification preferences for the authenticated user
 */
router.put('/preferences', UserNotificationPreferencesController.updatePreferences);

/**
 * @route GET /api/user/notifications/alert-rules
 * @desc Get all alert rules for the authenticated user
 */
router.get('/alert-rules', UserNotificationPreferencesController.getAlertRules);

/**
 * @route POST /api/user/notifications/alert-rules
 * @desc Create a new alert rule
 */
router.post('/alert-rules', UserNotificationPreferencesController.createAlertRule);

/**
 * @route PUT /api/user/notifications/alert-rules/:id
 * @desc Update an existing alert rule
 */
router.put('/alert-rules/:id', UserNotificationPreferencesController.updateAlertRule);

/**
 * @route DELETE /api/user/notifications/alert-rules/:id
 * @desc Delete an alert rule
 */
router.delete('/alert-rules/:id', UserNotificationPreferencesController.deleteAlertRule);

export default router;
