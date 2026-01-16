/**
 * System Settings Controller
 * Manages system-wide configurations for Integrations, Branding, and Email
 */

import { Request, Response } from 'express';
import { SystemSettingsService } from '../services/hrm8/SystemSettingsService';
import { AuthenticatedRequest } from '../types';

export class SystemSettingsController {
    /**
     * Get all system settings
     * GET /api/system-settings
     * Access: Admin only
     */
    static async getAllSettings(_req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            // TODO: Add refined admin check here if needed beyond just authentication
            // e.g., if (!req.user.isAdmin) return res.status(403)...

            const settings = await SystemSettingsService.getAllSettings();

            // Transform to object for easier frontend consumption
            const settingsMap: Record<string, any> = {};
            settings.forEach((s: any) => {
                settingsMap[s.key] = s.value;
            });

            res.json({
                success: true,
                data: settingsMap
            });
        } catch (error: any) {
            console.error('[SystemSettingsController] getAllSettings error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch settings'
            });
        }
    }

    /**
     * Update or Create a setting
     * POST /api/system-settings
     * Access: Admin only
     */
    static async updateSetting(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { key, value, isPublic } = req.body;

            if (!key) {
                res.status(400).json({
                    success: false,
                    error: 'Key is required'
                });
                return;
            }

            const updatedBy = req.user?.id || 'admin';

            const setting = await SystemSettingsService.setSetting(
                key,
                value,
                isPublic !== undefined ? isPublic : false,
                updatedBy
            );

            res.json({
                success: true,
                message: 'Setting updated successfully',
                data: setting
            });
        } catch (error: any) {
            console.error('[SystemSettingsController] updateSetting error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to update setting'
            });
        }
    }

    /**
     * Get public settings (e.g. Branding)
     * GET /api/system-settings/public
     * Access: Public/Anyone
     */
    static async getPublicSettings(_req: Request, res: Response): Promise<void> {
        try {
            const settings = await SystemSettingsService.getPublicSettings();

            // Transform to object
            const settingsMap: Record<string, any> = {};
            settings.forEach((s: any) => {
                settingsMap[s.key] = s.value;
            });

            res.json({
                success: true,
                data: settingsMap
            });
        } catch (error: any) {
            console.error('[SystemSettingsController] getPublicSettings error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch public settings'
            });
        }
    }

    /**
     * Bulk update settings
     * POST /api/system-settings/bulk
     * Access: Admin only
     */
    static async bulkUpdateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { settings } = req.body; // Expects array of { key, value, isPublic }

            if (!settings || !Array.isArray(settings)) {
                res.status(400).json({
                    success: false,
                    error: 'Settings array is required'
                });
                return;
            }

            const updatedBy = req.user?.id || 'admin';
            const results = [];

            for (const item of settings) {
                if (item.key) {
                    const result = await SystemSettingsService.setSetting(
                        item.key,
                        item.value,
                        item.isPublic !== undefined ? item.isPublic : false,
                        updatedBy
                    );
                    results.push(result);
                }
            }

            res.json({
                success: true,
                message: `Updated ${results.length} settings`,
                data: results
            });
        } catch (error: any) {
            console.error('[SystemSettingsController] bulkUpdateSettings error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to bulk update settings'
            });
        }
    }
}
