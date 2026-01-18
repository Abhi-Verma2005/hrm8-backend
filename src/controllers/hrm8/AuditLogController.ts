/**
 * Audit Log Controller
 * Handles HTTP requests for audit log endpoints
 */

import { Response } from 'express';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import { AuditLogService } from '../../services/hrm8/AuditLogService';

export class AuditLogController {
    /**
     * Get recent audit logs
     * GET /api/hrm8/audit-logs
     */
    static async getRecent(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { entityType, action, actorId, limit, offset } = req.query;

            const result = await AuditLogService.getRecent({
                entityType: entityType as string | undefined,
                action: action as string | undefined,
                actorId: actorId as string | undefined,
                limit: limit ? parseInt(limit as string, 10) : 50,
                offset: offset ? parseInt(offset as string, 10) : 0,
            });

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            console.error('Get audit logs error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch audit logs',
            });
        }
    }

    /**
     * Get audit logs for a specific entity
     * GET /api/hrm8/audit-logs/:entityType/:entityId
     */
    static async getByEntity(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { entityType, entityId } = req.params;
            const { limit } = req.query;

            const logs = await AuditLogService.getByEntity(
                entityType,
                entityId,
                limit ? parseInt(limit as string, 10) : 50
            );

            res.json({
                success: true,
                data: { logs },
            });
        } catch (error) {
            console.error('Get entity audit logs error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch entity audit logs',
            });
        }
    }

    /**
     * Get audit log stats
     * GET /api/hrm8/audit-logs/stats
     */
    static async getStats(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const stats = await AuditLogService.getStats();

            res.json({
                success: true,
                data: stats,
            });
        } catch (error) {
            console.error('Get audit stats error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch audit stats',
            });
        }
    }
}
