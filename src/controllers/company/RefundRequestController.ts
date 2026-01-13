/**
 * RefundRequestController
 * Handles refund request endpoints for employers
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { RefundRequestService } from '../../services/company/RefundRequestService';

export class RefundRequestController {
    /**
     * Create a refund request
     * POST /api/companies/refund-requests
     */
    static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { transactionId, transactionType, amount, reason } = req.body;

            // Validation
            if (!transactionId || !transactionType || !amount || !reason) {
                res.status(400).json({ success: false, error: 'All fields are required' });
                return;
            }

            if (transactionType !== 'JOB_PAYMENT' && transactionType !== 'SUBSCRIPTION_BILL') {
                res.status(400).json({ success: false, error: 'Invalid transaction type' });
                return;
            }

            const result = await RefundRequestService.createRefundRequest({
                companyId,
                transactionId,
                transactionType,
                amount,
                reason,
            });

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.status(201).json({
                success: true,
                data: { refundRequest: result.refundRequest },
                message: 'Refund request submitted successfully',
            });
        } catch (error: any) {
            console.error('Create refund request error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to create refund request',
            });
        }
    }

    /**
     * Get all refund requests for the company
     * GET /api/companies/refund-requests
     */
    static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const refundRequests = await RefundRequestService.getCompanyRefundRequests(companyId);

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
     * Cancel a refund request
     * DELETE /api/companies/refund-requests/:id
     */
    static async cancel(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;

            const result = await RefundRequestService.cancelRefundRequest(id, companyId);

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.json({
                success: true,
                message: 'Refund request cancelled successfully',
            });
        } catch (error: any) {
            console.error('Cancel refund request error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to cancel refund request',
            });
        }
    }

    /**
     * Withdraw an approved refund
     * PUT /api/companies/refund-requests/:id/withdraw
     */
    static async withdraw(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;

            const result = await RefundRequestService.withdrawRefund(id, companyId);

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.json({
                success: true,
                data: { refundRequest: result.refundRequest },
                message: 'Refund withdrawn successfully',
            });
        } catch (error: any) {
            console.error('Withdraw refund error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to withdraw refund',
            });
        }
    }
}
