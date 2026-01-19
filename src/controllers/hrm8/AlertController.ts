/**
 * Alert Controller
 * Handles HTTP requests for system alerts endpoints
 */

import { Response } from 'express';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import { AlertService } from '../../services/hrm8/AlertService';

export class AlertController {
    /**
     * Get active alerts
     * GET /api/hrm8/alerts
     */
    static async getActiveAlerts(_req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const result = await AlertService.getActiveAlerts();

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            console.error('Get alerts error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch alerts',
            });
        }
    }
}
