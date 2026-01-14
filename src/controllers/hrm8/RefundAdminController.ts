/**
 * RefundAdminController
 * Handles refund request admin operations for HRM8 dashboard
 */

import { Response } from 'express';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import { RefundAdminService } from '../../services/hrm8/RefundAdminService';
import { RefundStatus } from '@prisma/client';

export class RefundAdminController {
    /**
     * Get all refund requests (with regional filtering for licensees)
     * GET /api/hrm8/refund-requests
     */
    static async getAll(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const hrm8User = req.hrm8User;

            if (!hrm8User) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const filters: { status?: RefundStatus; regionIds?: string[] } = {};

            // Status filter from query
            if (req.query.status) {
                filters.status = req.query.status as RefundStatus;
            }

            // Regional filtering for licensees
            if (hrm8User.role === 'REGIONAL_LICENSEE' && req.assignedRegionIds) {
                filters.regionIds = req.assignedRegionIds;
            }

            const refundRequests = await RefundAdminService.getAllRefundRequests(filters);

            res.json({
                success: true,
                data: { refundRequests },
            });
        } catch (error: any) {
            console.error('Get refund requests error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch refund requests',
            });
        }
    }

    /**
     * Approve a refund request
     * PUT /api/hrm8/refund-requests/:id/approve
     */
    static async approve(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const hrm8User = req.hrm8User;

            if (!hrm8User) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;
            const { adminNotes } = req.body;

            const result = await RefundAdminService.approveRefund(id, hrm8User.id, adminNotes);

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.json({
                success: true,
                data: { refundRequest: result.refundRequest },
                message: 'Refund request approved successfully',
            });
        } catch (error: any) {
            console.error('Approve refund error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to approve refund request',
            });
        }
    }

    /**
     * Reject a refund request
     * PUT /api/hrm8/refund-requests/:id/reject
     */
    static async reject(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const hrm8User = req.hrm8User;

            if (!hrm8User) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;
            const { rejectionReason } = req.body;

            if (!rejectionReason) {
                res.status(400).json({ success: false, error: 'Rejection reason is required' });
                return;
            }

            const result = await RefundAdminService.rejectRefund(id, hrm8User.id, rejectionReason);

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.json({
                success: true,
                data: { refundRequest: result.refundRequest },
                message: 'Refund request rejected',
            });
        } catch (error: any) {
            console.error('Reject refund error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to reject refund request',
            });
        }
    }

    /**
     * Mark refund as completed
     * PUT /api/hrm8/refund-requests/:id/complete
     */
    static async complete(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const hrm8User = req.hrm8User;

            if (!hrm8User) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;
            const { paymentReference } = req.body;

            const result = await RefundAdminService.completeRefund(id, paymentReference);

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.json({
                success: true,
                data: { refundRequest: result.refundRequest },
                message: 'Refund marked as completed',
            });
        } catch (error: any) {
            console.error('Complete refund error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to complete refund',
            });
        }
    }
}
