/**
 * Capacity Controller
 * Handles HTTP requests for capacity monitoring endpoints
 */

import { Response } from 'express';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import { CapacityService } from '../../services/hrm8/CapacityService';

export class CapacityController {
    /**
     * Get capacity warnings
     * GET /api/hrm8/consultants/capacity-warnings
     */
    static async getCapacityWarnings(_req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const warnings = await CapacityService.getCapacityWarnings();

            res.json({
                success: true,
                data: warnings,
            });
        } catch (error) {
            console.error('Get capacity warnings error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch capacity warnings',
            });
        }
    }
}
