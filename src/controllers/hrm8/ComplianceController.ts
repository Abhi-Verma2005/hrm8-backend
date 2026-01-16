/**
 * Compliance Controller
 * Handles HTTP requests for compliance alerts and audit logs
 */

import { Response } from 'express';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import { ComplianceAlertService } from '../../services/hrm8/ComplianceAlertService';
import { AuditLogService, AuditEntityType } from '../../services/hrm8/AuditLogService';

export class ComplianceController {
    /**
     * Get all compliance alerts
     * GET /api/hrm8/compliance/alerts
     */
    static async getAlerts(_req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const alerts = await ComplianceAlertService.getAllAlerts();

            res.json({
                success: true,
                data: { alerts },
            });
        } catch (error) {
            console.error('Get compliance alerts error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch compliance alerts',
            });
        }
    }

    /**
     * Get alert summary
     * GET /api/hrm8/compliance/summary
     */
    static async getAlertSummary(_req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const summary = await ComplianceAlertService.getAlertSummary();

            res.json({
                success: true,
                data: summary,
            });
        } catch (error) {
            console.error('Get alert summary error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch alert summary',
            });
        }
    }

    /**
     * Get audit history for an entity
     * GET /api/hrm8/compliance/audit/:entityType/:entityId
     */
    static async getAuditHistory(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { entityType, entityId } = req.params;
            const limit = parseInt(req.query.limit as string) || 50;

            const validEntityTypes = ['LICENSEE', 'REGION', 'CONSULTANT', 'SETTLEMENT', 'JOB'];
            if (!validEntityTypes.includes(entityType.toUpperCase())) {
                res.status(400).json({
                    success: false,
                    error: `Invalid entity type. Must be one of: ${validEntityTypes.join(', ')}`,
                });
                return;
            }

            const history = await AuditLogService.getHistory(
                entityType.toUpperCase() as AuditEntityType,
                entityId,
                { limit }
            );

            res.json({
                success: true,
                data: { history },
            });
        } catch (error) {
            console.error('Get audit history error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch audit history',
            });
        }
    }

    /**
     * Get recent audit entries
     * GET /api/hrm8/compliance/audit/recent
     */
    static async getRecentAudit(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const limit = parseInt(req.query.limit as string) || 100;

            const entries = await AuditLogService.getRecent(limit);

            res.json({
                success: true,
                data: { entries },
            });
        } catch (error) {
            console.error('Get recent audit error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch recent audit entries',
            });
        }
    }
}
