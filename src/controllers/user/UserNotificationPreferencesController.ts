/**
 * User Notification Preferences Controller
 * API endpoints for managing HR Admin notification preferences and alert rules
 */

import { Request, Response } from 'express';
import { UserNotificationPreferencesService } from '../../services/user/UserNotificationPreferencesService';
import { UserAlertRulesService } from '../../services/user/UserAlertRulesService';
import { AuthenticatedRequest } from '../../types';

export class UserNotificationPreferencesController {
    /**
     * GET /api/user/notifications/preferences
     * Get notification preferences for the authenticated user
     */
    static async getPreferences(req: Request, res: Response) {
        try {
            const authReq = req as AuthenticatedRequest;
            const userId = authReq.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const preferences = await UserNotificationPreferencesService.getPreferences(userId);

            return res.json({
                success: true,
                data: preferences,
            });
        } catch (error) {
            console.error('Error getting preferences:', error);
            return res.status(500).json({ error: 'Failed to get preferences' });
        }
    }

    /**
     * PUT /api/user/notifications/preferences
     * Update notification preferences for the authenticated user
     */
    static async updatePreferences(req: Request, res: Response) {
        try {
            const authReq = req as AuthenticatedRequest;
            const userId = authReq.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { eventPreferences, quietHours } = req.body;

            const preferences = await UserNotificationPreferencesService.updatePreferences(userId, {
                eventPreferences,
                quietHours,
            });

            return res.json({
                success: true,
                data: preferences,
            });
        } catch (error) {
            console.error('Error updating preferences:', error);
            return res.status(500).json({ error: 'Failed to update preferences' });
        }
    }

    /**
     * GET /api/user/notifications/alert-rules
     * Get all alert rules for the authenticated user
     */
    static async getAlertRules(req: Request, res: Response) {
        try {
            const authReq = req as AuthenticatedRequest;
            const userId = authReq.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const rules = await UserAlertRulesService.getAlertRules(userId);

            return res.json({
                success: true,
                data: rules,
            });
        } catch (error) {
            console.error('Error getting alert rules:', error);
            return res.status(500).json({ error: 'Failed to get alert rules' });
        }
    }

    /**
     * POST /api/user/notifications/alert-rules
     * Create a new alert rule
     */
    static async createAlertRule(req: Request, res: Response) {
        try {
            const authReq = req as AuthenticatedRequest;
            const userId = authReq.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { name, description, enabled, eventType, conditions, actions } = req.body;

            if (!name || !eventType || !actions) {
                return res.status(400).json({ error: 'Missing required fields: name, eventType, actions' });
            }

            const rule = await UserAlertRulesService.createAlertRule(userId, {
                name,
                description,
                enabled,
                eventType,
                conditions: conditions || [],
                actions,
            });

            return res.status(201).json({
                success: true,
                data: rule,
            });
        } catch (error) {
            console.error('Error creating alert rule:', error);
            return res.status(500).json({ error: 'Failed to create alert rule' });
        }
    }

    /**
     * PUT /api/user/notifications/alert-rules/:id
     * Update an existing alert rule
     */
    static async updateAlertRule(req: Request, res: Response) {
        try {
            const authReq = req as AuthenticatedRequest;
            const userId = authReq.user?.id;
            const ruleId = req.params.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const updates = req.body;

            const rule = await UserAlertRulesService.updateAlertRule(ruleId, userId, updates);

            if (!rule) {
                return res.status(404).json({ error: 'Alert rule not found' });
            }

            return res.json({
                success: true,
                data: rule,
            });
        } catch (error) {
            console.error('Error updating alert rule:', error);
            return res.status(500).json({ error: 'Failed to update alert rule' });
        }
    }

    /**
     * DELETE /api/user/notifications/alert-rules/:id
     * Delete an alert rule
     */
    static async deleteAlertRule(req: Request, res: Response) {
        try {
            const authReq = req as AuthenticatedRequest;
            const userId = authReq.user?.id;
            const ruleId = req.params.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const deleted = await UserAlertRulesService.deleteAlertRule(ruleId, userId);

            if (!deleted) {
                return res.status(404).json({ error: 'Alert rule not found' });
            }

            return res.json({
                success: true,
                message: 'Alert rule deleted',
            });
        } catch (error) {
            console.error('Error deleting alert rule:', error);
            return res.status(500).json({ error: 'Failed to delete alert rule' });
        }
    }
}
