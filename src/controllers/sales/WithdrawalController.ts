/**
 * Withdrawal Controller
 * Handles commission withdrawal requests for sales agents
 */

import { Response } from 'express';
import { ConsultantAuthenticatedRequest } from '../../middleware/consultantAuth';
import { WithdrawalService } from '../../services/sales/WithdrawalService';

export class WithdrawalController {
    /**
     * Get Withdrawal Balance
     * GET /api/sales/commissions/balance
     */
    static async getBalance(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const balance = await WithdrawalService.calculateBalance(consultantId);

            res.json({
                success: true,
                data: balance,
            });
        } catch (error: any) {
            console.error('Get balance error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch balance',
            });
        }
    }

    /**
     * Request Withdrawal
     * POST /api/sales/commissions/withdraw
     */
    static async requestWithdrawal(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { amount, paymentMethod, paymentDetails, commissionIds, notes } = req.body;

            // Validation
            if (!amount || amount <= 0) {
                res.status(400).json({ success: false, error: 'Valid amount is required' });
                return;
            }

            if (!paymentMethod) {
                res.status(400).json({ success: false, error: 'Payment method is required' });
                return;
            }

            if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
                res.status(400).json({ success: false, error: 'Commission IDs are required' });
                return;
            }

            const result = await WithdrawalService.createWithdrawal({
                consultantId,
                amount,
                paymentMethod,
                paymentDetails,
                commissionIds,
                notes,
            });

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.status(201).json({
                success: true,
                data: { withdrawal: result.withdrawal },
                message: 'Withdrawal request submitted successfully',
            });
        } catch (error: any) {
            console.error('Request withdrawal error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to create withdrawal request',
            });
        }
    }

    /**
     * Get Withdrawal History
     * GET /api/sales/commissions/withdrawals
     */
    static async getWithdrawals(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { status } = req.query;

            const withdrawals = await WithdrawalService.getWithdrawals(consultantId, {
                status: status as any,
            });

            res.json({
                success: true,
                data: { withdrawals },
            });
        } catch (error: any) {
            console.error('Get withdrawals error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch withdrawals',
            });
        }
    }

    /**
     * Cancel Withdrawal
     * POST /api/sales/commissions/withdrawals/:id/cancel
     */
    static async cancelWithdrawal(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;

            const result = await WithdrawalService.cancelWithdrawal(id, consultantId);

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.json({
                success: true,
                message: 'Withdrawal cancelled successfully',
            });
        } catch (error: any) {
            console.error('Cancel withdrawal error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to cancel withdrawal',
            });
        }
    }

    /**
     * Get Pending Withdrawals (Admin)
     * GET /api/admin/billing/withdrawals
     */
    /**
     * Get Pending Withdrawals (Admin)
     * GET /api/admin/billing/withdrawals
     */
    static async getPendingWithdrawals(req: any, res: Response): Promise<void> {
        try {
            // Check if user is HRM8 admin
            if (!req.hrm8User) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const withdrawals = await WithdrawalService.getPendingWithdrawals();

            res.json({
                success: true,
                data: { withdrawals },
            });
        } catch (error: any) {
            console.error('Get pending withdrawals error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch pending withdrawals',
            });
        }
    }

    /**
     * Approve Withdrawal (Admin)
     * POST /api/admin/billing/withdrawals/:id/approve
     */
    static async approveWithdrawal(req: any, res: Response): Promise<void> {
        try {
            const adminId = req.hrm8User?.id;
            if (!adminId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;

            const result = await WithdrawalService.approveWithdrawal(id, adminId);

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.json({
                success: true,
                message: 'Withdrawal approved successfully',
            });
        } catch (error: any) {
            console.error('Approve withdrawal error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to approve withdrawal',
            });
        }
    }

    /**
     * Process Payment (Admin)
     * POST /api/admin/billing/withdrawals/:id/process
     */
    static async processPayment(req: any, res: Response): Promise<void> {
        try {
            if (!req.hrm8User) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;
            const { paymentReference, adminNotes } = req.body;

            if (!paymentReference) {
                res.status(400).json({ success: false, error: 'Payment reference is required' });
                return;
            }

            const result = await WithdrawalService.processPayment(id, paymentReference, adminNotes);

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.json({
                success: true,
                message: 'Payment processed successfully',
            });
        } catch (error: any) {
            console.error('Process payment error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to process payment',
            });
        }
    }

    /**
     * Reject Withdrawal (Admin)
     * POST /api/admin/billing/withdrawals/:id/reject
     */
    static async rejectWithdrawal(req: any, res: Response): Promise<void> {
        try {
            const adminId = req.hrm8User?.id;
            if (!adminId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;
            const { reason } = req.body;

            if (!reason) {
                res.status(400).json({ success: false, error: 'Rejection reason is required' });
                return;
            }

            const result = await WithdrawalService.rejectWithdrawal(id, adminId, reason);

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.json({
                success: true,
                message: 'Withdrawal rejected successfully',
            });
        } catch (error: any) {
            console.error('Reject withdrawal error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to reject withdrawal',
            });
        }
    }
}
