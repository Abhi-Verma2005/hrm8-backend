/**
 * LeadConversionAdminController
 * Admin endpoints for reviewing conversion requests
 */

import { Response } from 'express';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import { LeadConversionService } from '../../services/sales/LeadConversionService';

export class LeadConversionAdminController {
    /**
     * Get all conversion requests (with regional filtering for regional admins)
     * GET /api/hrm8/conversion-requests
     */
    static async getAll(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { status } = req.query;
            const regionIds = req.assignedRegionIds; // For regional admins

            const requests = await LeadConversionService.getAllRequests({
                status: status as any,
                regionIds,
            });

            res.json({
                success: true,
                data: { requests },
            });
        } catch (error: any) {
            console.error('Get conversion requests error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get conversion requests',
            });
        }
    }

    /**
     * Get a single conversion request
     * GET /api/hrm8/conversion-requests/:id
     */
    static async getOne(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const adminId = req.hrm8User?.id;

            if (!adminId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;

            const result = await LeadConversionService.getRequestById(id, adminId, 'admin');

            if (!result.success) {
                res.status(404).json(result);
                return;
            }

            res.json({
                success: true,
                data: { request: result.request },
            });
        } catch (error: any) {
            console.error('Get conversion request error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get conversion request',
            });
        }
    }

    /**
     * Approve a conversion request (auto-converts lead)
     * PUT /api/hrm8/conversion-requests/:id/approve
     */
    static async approve(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const adminId = req.hrm8User?.id;

            if (!adminId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;
            const { adminNotes } = req.body;

            const result = await LeadConversionService.approveRequest(id, adminId, adminNotes);

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.json({
                success: true,
                data: {
                    request: result.request,
                    company: result.company,
                },
                message: 'Conversion request approved and lead converted successfully',
            });
        } catch (error: any) {
            console.error('Approve conversion request error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to approve conversion request',
            });
        }
    }

    /**
     * Decline a conversion request
     * PUT /api/hrm8/conversion-requests/:id/decline
     */
    static async decline(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const adminId = req.hrm8User?.id;

            if (!adminId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;
            const { declineReason } = req.body;

            if (!declineReason) {
                res.status(400).json({
                    success: false,
                    error: 'Decline reason is required',
                });
                return;
            }

            const result = await LeadConversionService.declineRequest(id, adminId, declineReason);

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.json({
                success: true,
                data: { request: result.request },
                message: 'Conversion request declined',
            });
        } catch (error: any) {
            console.error('Decline conversion request error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to decline conversion request',
            });
        }
    }
}
