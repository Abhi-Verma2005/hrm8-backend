/**
 * Withdrawal Service
 * Handles commission withdrawal logic and balance calculations
 */

import { CommissionWithdrawalModel, CommissionWithdrawalData } from '../../models/CommissionWithdrawal';
import { CommissionModel } from '../../models/Commission';
import prisma from '../../lib/prisma';
import { WithdrawalStatus } from '@prisma/client';

export interface WithdrawalBalance {
    availableBalance: number;
    pendingBalance: number;
    totalEarned: number;
    totalWithdrawn: number;
    availableCommissions: Array<{
        id: string;
        amount: number;
        description: string;
        createdAt: Date;
    }>;
}

export class WithdrawalService {
    /**
     * Calculate withdrawal balance for a consultant
     */
    static async calculateBalance(consultantId: string): Promise<WithdrawalBalance> {
        // Get all commissions for consultant
        const allCommissions = await CommissionModel.findByConsultantId(consultantId);

        // Get all withdrawals for consultant
        const allWithdrawals = await CommissionWithdrawalModel.findByConsultantId(consultantId);

        // Get commission IDs that are already included in withdrawals (except REJECTED/CANCELLED)
        const withdrawnCommissionIds = new Set<string>();
        allWithdrawals
            .filter((w) => w.status !== 'REJECTED' && w.status !== 'CANCELLED')
            .forEach((w) => {
                w.commissionIds.forEach((id) => withdrawnCommissionIds.add(id));
            });

        // Calculate available balance (CONFIRMED commissions not yet withdrawn)
        const availableCommissions = allCommissions.filter(
            (c) => c.status === 'CONFIRMED' && !withdrawnCommissionIds.has(c.id)
        );
        const availableBalance = availableCommissions.reduce((sum, c) => sum + c.amount, 0);

        // Calculate pending balance (PENDING commissions)
        const pendingBalance = allCommissions
            .filter((c) => c.status === 'PENDING')
            .reduce((sum, c) => sum + c.amount, 0);

        // Calculate total earned (all non-cancelled commissions)
        const totalEarned = allCommissions
            .filter((c) => c.status !== 'CANCELLED')
            .reduce((sum, c) => sum + c.amount, 0);

        // Calculate total withdrawn (completed withdrawals)
        const totalWithdrawn = allWithdrawals
            .filter((w) => w.status === 'COMPLETED')
            .reduce((sum, w) => sum + w.amount, 0);

        return {
            availableBalance: Math.round(availableBalance * 100) / 100,
            pendingBalance: Math.round(pendingBalance * 100) / 100,
            totalEarned: Math.round(totalEarned * 100) / 100,
            totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
            availableCommissions: availableCommissions.map((c) => ({
                id: c.id,
                amount: c.amount,
                description: c.description || 'Commission',
                createdAt: c.createdAt,
            })),
        };
    }

    /**
     * Create a withdrawal request
     */
    static async createWithdrawal(data: {
        consultantId: string;
        amount: number;
        paymentMethod: string;
        paymentDetails?: any;
        commissionIds: string[];
        notes?: string;
    }): Promise<{ success: boolean; withdrawal?: CommissionWithdrawalData; error?: string }> {
        try {
            // Validate amount
            if (data.amount <= 0) {
                return { success: false, error: 'Amount must be greater than zero' };
            }

            // Calculate available balance
            const balance = await this.calculateBalance(data.consultantId);

            // Check if amount exceeds available balance
            if (data.amount > balance.availableBalance) {
                return {
                    success: false,
                    error: `Insufficient balance. Available: $${balance.availableBalance}`,
                };
            }

            // Verify all commission IDs belong to consultant and are available
            const commissions = await CommissionModel.findAll({
                consultantId: data.consultantId,
            });

            const availableCommissionIds = new Set(balance.availableCommissions.map((c) => c.id));
            const invalidIds = data.commissionIds.filter((id) => !availableCommissionIds.has(id));

            if (invalidIds.length > 0) {
                return {
                    success: false,
                    error: 'Some commission IDs are not available for withdrawal',
                };
            }

            // Verify total amount matches selected commissions
            const selectedCommissions = commissions.filter((c) => data.commissionIds.includes(c.id));
            const totalSelected = selectedCommissions.reduce((sum, c) => sum + c.amount, 0);

            if (Math.abs(totalSelected - data.amount) > 0.01) {
                return {
                    success: false,
                    error: 'Amount does not match selected commissions',
                };
            }

            // Create withdrawal
            const withdrawal = await CommissionWithdrawalModel.create({
                consultantId: data.consultantId,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                paymentDetails: data.paymentDetails,
                commissionIds: data.commissionIds,
                notes: data.notes,
            });

            return { success: true, withdrawal };
        } catch (error: any) {
            console.error('Create withdrawal error:', error);
            return { success: false, error: error.message || 'Failed to create withdrawal' };
        }
    }

    /**
     * Get withdrawal history for consultant
     */
    static async getWithdrawals(
        consultantId: string,
        filters?: { status?: WithdrawalStatus }
    ): Promise<CommissionWithdrawalData[]> {
        return await CommissionWithdrawalModel.findByConsultantId(consultantId, filters);
    }

    /**
     * Cancel withdrawal (only if PENDING)
     */
    static async cancelWithdrawal(
        withdrawalId: string,
        consultantId: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const withdrawal = await CommissionWithdrawalModel.findById(withdrawalId);

            if (!withdrawal) {
                return { success: false, error: 'Withdrawal not found' };
            }

            if (withdrawal.consultantId !== consultantId) {
                return { success: false, error: 'Unauthorized' };
            }

            if (withdrawal.status !== 'PENDING') {
                return { success: false, error: 'Can only cancel pending withdrawals' };
            }

            await CommissionWithdrawalModel.cancel(withdrawalId);

            return { success: true };
        } catch (error: any) {
            console.error('Cancel withdrawal error:', error);
            return { success: false, error: error.message || 'Failed to cancel withdrawal' };
        }
    }

    /**
     * Approve withdrawal (Admin only)
     */
    static async approveWithdrawal(
        withdrawalId: string,
        adminId: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const withdrawal = await CommissionWithdrawalModel.findById(withdrawalId);

            if (!withdrawal) {
                return { success: false, error: 'Withdrawal not found' };
            }

            if (withdrawal.status !== 'PENDING') {
                return { success: false, error: 'Can only approve pending withdrawals' };
            }

            await CommissionWithdrawalModel.approve(withdrawalId, adminId);

            return { success: true };
        } catch (error: any) {
            console.error('Approve withdrawal error:', error);
            return { success: false, error: error.message || 'Failed to approve withdrawal' };
        }
    }

    /**
     * Process payment (Admin only)
     */
    static async processPayment(
        withdrawalId: string,
        paymentReference: string,
        adminNotes?: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const withdrawal = await CommissionWithdrawalModel.findById(withdrawalId);

            if (!withdrawal) {
                return { success: false, error: 'Withdrawal not found' };
            }

            if (withdrawal.status !== 'APPROVED' && withdrawal.status !== 'PROCESSING') {
                return { success: false, error: 'Withdrawal must be approved first' };
            }

            // Mark as processing if not already
            if (withdrawal.status === 'APPROVED') {
                await CommissionWithdrawalModel.markAsProcessing(withdrawalId);
            }

            // Complete withdrawal
            await CommissionWithdrawalModel.complete(withdrawalId, paymentReference, adminNotes);

            // Update commission statuses to PAID
            await prisma.commission.updateMany({
                where: {
                    id: { in: withdrawal.commissionIds },
                },
                data: {
                    status: 'PAID',
                    paid_at: new Date(),
                    payment_reference: paymentReference,
                },
            });

            return { success: true };
        } catch (error: any) {
            console.error('Process payment error:', error);
            return { success: false, error: error.message || 'Failed to process payment' };
        }
    }

    /**
     * Reject withdrawal (Admin only)
     */
    static async rejectWithdrawal(
        withdrawalId: string,
        adminId: string,
        reason: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const withdrawal = await CommissionWithdrawalModel.findById(withdrawalId);

            if (!withdrawal) {
                return { success: false, error: 'Withdrawal not found' };
            }

            if (withdrawal.status !== 'PENDING') {
                return { success: false, error: 'Can only reject pending withdrawals' };
            }

            await CommissionWithdrawalModel.reject(withdrawalId, adminId, reason);

            return { success: true };
        } catch (error: any) {
            console.error('Reject withdrawal error:', error);
            return { success: false, error: error.message || 'Failed to reject withdrawal' };
        }
    }

    /**
     * Get all pending withdrawals (Admin only)
     * Optionally filter by region for regional admins
     */
    static async getPendingWithdrawals(regionId?: string): Promise<CommissionWithdrawalData[]> {
        if (regionId) {
            // Regional admin - only show withdrawals from consultants in their region
            const withdrawals = await prisma.commissionWithdrawal.findMany({
                where: {
                    status: 'PENDING',
                    consultant: {
                        region_id: regionId
                    }
                },
                orderBy: { created_at: 'desc' },
            });
            return withdrawals.map((w) => CommissionWithdrawalModel['mapPrismaToWithdrawal'](w));
        }
        // Global admin - show all pending withdrawals
        return await CommissionWithdrawalModel.findAll({ status: 'PENDING' });
    }
}
