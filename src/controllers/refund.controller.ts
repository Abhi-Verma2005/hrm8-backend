/**
 * Refund Controller
 * Handles company refund requests and admin approval workflow
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { PrismaClient } from '@prisma/client';
import { RefundService } from '../services/refundService';

const prisma = new PrismaClient();
const refundService = new RefundService(prisma);

/**
 * Create refund request
 * POST /api/wallet/refund/request
 */
export const createRefundRequest = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const companyId = req.user?.companyId || req.user?.id;

        if (!companyId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { transactionId, transactionType, amount, reason } = req.body;

        if (!transactionId || !transactionType || !amount || !reason) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const refundRequest = await refundService.createRefundRequest({
            companyId,
            transactionId,
            transactionType,
            amount,
            reason,
        });

        return res.json({
            success: true,
            data: refundRequest,
            message: `Refund request for $${amount.toFixed(2)} submitted successfully. It will be reviewed by admin.`,
        });
    } catch (error: any) {
        console.error('Error creating refund request:', error);
        return res.status(500).json({ error: error.message || 'Failed to create refund request' });
    }
};

/**
 * Get company refund history
 * GET /api/wallet/refund/history
 */
export const getCompanyRefunds = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const companyId = req.user?.companyId || req.user?.id;

        if (!companyId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const result = await refundService.getCompanyRefunds(companyId, { limit, offset });

        return res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('Error getting company refunds:', error);
        return res.status(500).json({ error: error.message || 'Failed to get refund history' });
    }
};

// ==================== ADMIN ENDPOINTS ====================

/**
 * Admin: Get pending refund requests
 * GET /api/wallet/admin/refunds/pending
 */
export const getPendingRefunds = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // TODO: Add admin authorization check
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const companyId = req.query.companyId as string;

        const result = await refundService.getPendingRefunds({
            companyId,
            limit,
            offset,
        });

        return res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('Error getting pending refunds:', error);
        return res.status(500).json({ error: error.message || 'Failed to get pending refunds' });
    }
};

/**
 * Admin: Approve refund
 * POST /api/wallet/admin/refunds/:refundId/approve
 */
export const approveRefund = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // TODO: Add admin authorization check
        const { refundId } = req.params;
        const { adminNotes } = req.body;
        const adminId = req.user?.id;

        if (!adminId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await refundService.approveRefund({
            refundRequestId: refundId,
            adminId,
            adminNotes,
        });

        return res.json({
            success: true,
            data: result,
            message: `Refund approved and $${result.refundRequest.amount.toFixed(2)} credited to company's wallet.`,
        });
    } catch (error: any) {
        console.error('Error approving refund:', error);
        return res.status(500).json({ error: error.message || 'Failed to approve refund' });
    }
};

/**
 * Admin: Reject refund
 * POST /api/wallet/admin/refunds/:refundId/reject
 */
export const rejectRefund = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // TODO: Add admin authorization check
        const { refundId } = req.params;
        const { reason } = req.body;
        const adminId = req.user?.id;

        if (!adminId || !reason) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const refund = await refundService.rejectRefund({
            refundRequestId: refundId,
            adminId,
            reason,
        });

        return res.json({
            success: true,
            data: refund,
            message: 'Refund request rejected.',
        });
    } catch (error: any) {
        console.error('Error rejecting refund:', error);
        return res.status(500).json({ error: error.message || 'Failed to reject refund' });
    }
};

/**
 * Admin: Get refund statistics
 * GET /api/wallet/admin/refunds/stats
 */
export const getRefundStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // TODO: Add admin authorization check
        const companyId = req.query.companyId as string;
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const stats = await refundService.getRefundStats({
            companyId,
            startDate,
            endDate,
        });

        return res.json({
            success: true,
            data: stats,
        });
    } catch (error: any) {
        console.error('Error getting refund stats:', error);
        return res.status(500).json({ error: error.message || 'Failed to get refund statistics' });
    }
};
