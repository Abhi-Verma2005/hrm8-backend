/**
 * Commission Controller
 * Handles consultant commissions, earnings, and withdrawal requests
 */

import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CommissionService } from '../services/commissionService';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();
const commissionService = new CommissionService(prisma);

/**
 * Get consultant earnings summary
 * GET /api/wallet/earnings
 */
export const getConsultantEarnings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const consultantId = req.user?.id;

        if (!consultantId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const earnings = await commissionService.getConsultantEarnings(consultantId);

        res.json({
            success: true,
            data: earnings,
        });
    } catch (error: any) {
        console.error('Error getting consultant earnings:', error);
        res.status(500).json({ error: error.message || 'Failed to get earnings' });
    }
};

/**
 * Request withdrawal
 * POST /api/wallet/withdrawal/request
 */
export const requestWithdrawal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const consultantId = req.user?.id;

        if (!consultantId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { amount, paymentMethod, paymentDetails, notes } = req.body;

        if (!amount || !paymentMethod || !paymentDetails) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const withdrawal = await commissionService.requestWithdrawal({
            consultantId,
            amount,
            paymentMethod,
            paymentDetails,
            notes,
        });

        res.json({
            success: true,
            data: withdrawal,
            message: `Withdrawal request for $${amount.toFixed(2)} submitted successfully. It will be processed by admin.`,
        });
    } catch (error: any) {
        console.error('Error requesting withdrawal:', error);

        if (error.message.includes('Insufficient balance')) {
            res.status(400).json({
                error: 'INSUFFICIENT_BALANCE',
                message: error.message,
            });
            return;
        }

        res.status(500).json({ error: error.message || 'Failed to request withdrawal' });
    }
};

/**
 * Get withdrawal history
 * GET /api/wallet/withdrawal/history
 */
export const getWithdrawalHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const consultantId = req.user?.id;

        if (!consultantId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const [withdrawals, total] = await Promise.all([
            prisma.commissionWithdrawal.findMany({
                where: { consultant_id: consultantId },
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.commissionWithdrawal.count({
                where: { consultant_id: consultantId },
            }),
        ]);

        res.json({
            success: true,
            data: {
                withdrawals,
                total,
                limit,
                offset,
                hasMore: offset + limit < total,
            },
        });
    } catch (error: any) {
        console.error('Error getting withdrawal history:', error);
        res.status(500).json({ error: error.message || 'Failed to get withdrawal history' });
    }
};

// ==================== ADMIN ENDPOINTS ====================

/**
 * Admin: Get pending withdrawal requests
 * GET /api/wallet/admin/withdrawals/pending
 */
export const getPendingWithdrawals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // TODO: Add admin authorization check
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const consultantId = req.query.consultantId as string;

        const result = await commissionService.getPendingWithdrawals({
            consultantId,
            limit,
            offset,
        });

        res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('Error getting pending withdrawals:', error);
        res.status(500).json({ error: error.message || 'Failed to get pending withdrawals' });
    }
};

/**
 * Admin: Approve withdrawal
 * POST /api/wallet/admin/withdrawals/:withdrawalId/approve
 */
export const approveWithdrawal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // TODO: Add admin authorization check
        const { withdrawalId } = req.params;
        const { paymentReference, adminNotes } = req.body;
        const adminId = req.user?.id;

        if (!adminId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const result = await commissionService.approveWithdrawal({
            withdrawalId,
            adminId,
            paymentReference,
            adminNotes,
        });

        res.json({
            success: true,
            data: result,
            message: `Withdrawal approved and $${result.withdrawal.amount.toFixed(2)} debited from consultant's wallet.`,
        });
    } catch (error: any) {
        console.error('Error approving withdrawal:', error);

        if (error.message.includes('Insufficient balance')) {
            res.status(400).json({
                error: 'INSUFFICIENT_BALANCE',
                message: error.message,
            });
            return;
        }

        res.status(500).json({ error: error.message || 'Failed to approve withdrawal' });
    }
};

/**
 * Admin: Reject withdrawal
 * POST /api/wallet/admin/withdrawals/:withdrawalId/reject
 */
export const rejectWithdrawal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // TODO: Add admin authorization check
        const { withdrawalId } = req.params;
        const { reason } = req.body;
        const adminId = req.user?.id;

        if (!adminId || !reason) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const withdrawal = await commissionService.rejectWithdrawal({
            withdrawalId,
            adminId,
            reason,
        });

        res.json({
            success: true,
            data: withdrawal,
            message: 'Withdrawal request rejected.',
        });
    } catch (error: any) {
        console.error('Error rejecting withdrawal:', error);
        res.status(500).json({ error: error.message || 'Failed to reject withdrawal' });
    }
};

/**
 * Admin: Get withdrawal statistics
 * GET /api/wallet/admin/withdrawals/stats
 */
export const getWithdrawalStats = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        // TODO: Add admin authorization check
        const stats = await Promise.all([
            prisma.commissionWithdrawal.aggregate({
                _sum: { amount: true },
                _count: true,
            }),
            prisma.commissionWithdrawal.groupBy({
                by: ['status'],
                _sum: { amount: true },
                _count: true,
            }),
            prisma.commissionWithdrawal.count({
                where: { status: 'PENDING' },
            }),
        ]);

        res.json({
            success: true,
            data: {
                overall: stats[0],
                byStatus: stats[1],
                pendingCount: stats[2],
            },
        });
    } catch (error: any) {
        console.error('Error getting withdrawal stats:', error);
        res.status(500).json({ error: error.message || 'Failed to get withdrawal statistics' });
    }
};
