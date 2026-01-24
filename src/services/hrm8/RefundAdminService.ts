import { TransactionRefundRequestModel, TransactionRefundRequestData } from '../../models/TransactionRefundRequest';
import { RefundStatus, VirtualTransactionType, VirtualAccountOwner } from '@prisma/client';
import { RefundNotificationHelper } from '../company/RefundNotificationHelper';
import prisma from '../../lib/prisma';
import { VirtualWalletService } from '../virtualWalletService';

export class RefundAdminService {
    /**
     * Get all refund requests with optional filters
     * Regional admins see only their region's requests
     */
    static async getAllRefundRequests(filters?: {
        status?: RefundStatus;
        regionIds?: string[];
    }): Promise<TransactionRefundRequestData[]> {
        return await TransactionRefundRequestModel.findAll(filters);
    }

    /**
     * Approve a refund request
     */
    static async approveRefund(
        refundId: string,
        adminId: string,
        adminNotes?: string
    ): Promise<{ success: boolean; refundRequest?: TransactionRefundRequestData; error?: string }> {
        try {
            const refund = await TransactionRefundRequestModel.findById(refundId);

            if (!refund) {
                return { success: false, error: 'Refund request not found' };
            }

            if (refund.status !== 'PENDING') {
                return { success: false, error: 'Can only approve pending requests' };
            }

            const approved = await TransactionRefundRequestModel.approve(refundId, adminId, adminNotes);

            // Notify company of approval
            await RefundNotificationHelper.notifyCompanyOfRefundStatus(
                refundId,
                refund.companyId,
                refund.amount,
                'APPROVED',
                adminNotes
            );

            return { success: true, refundRequest: approved };
        } catch (error: any) {
            console.error('Approve refund error:', error);
            return { success: false, error: error.message || 'Failed to approve refund' };
        }
    }

    /**
     * Reject a refund request
     */
    static async rejectRefund(
        refundId: string,
        adminId: string,
        rejectionReason: string
    ): Promise<{ success: boolean; refundRequest?: TransactionRefundRequestData; error?: string }> {
        try {
            if (!rejectionReason || rejectionReason.trim().length < 10) {
                return { success: false, error: 'Rejection reason must be at least 10 characters' };
            }

            const refund = await TransactionRefundRequestModel.findById(refundId);

            if (!refund) {
                return { success: false, error: 'Refund request not found' };
            }

            if (refund.status !== 'PENDING') {
                return { success: false, error: 'Can only reject pending requests' };
            }

            const rejected = await TransactionRefundRequestModel.reject(refundId, adminId, rejectionReason);

            // Notify company of rejection
            await RefundNotificationHelper.notifyCompanyOfRefundStatus(
                refundId,
                refund.companyId,
                refund.amount,
                'REJECTED',
                rejectionReason
            );

            return { success: true, refundRequest: rejected };
        } catch (error: any) {
            console.error('Reject refund error:', error);
            return { success: false, error: error.message || 'Failed to reject refund' };
        }
    }

    /**
     * Mark refund as completed (after payment has been processed)
     */
    static async completeRefund(
        refundId: string,
        paymentReference?: string
    ): Promise<{ success: boolean; refundRequest?: TransactionRefundRequestData; error?: string }> {
        try {
            const refund = await TransactionRefundRequestModel.findById(refundId);

            if (!refund) {
                return { success: false, error: 'Refund request not found' };
            }

            if (refund.status !== 'APPROVED') {
                return { success: false, error: 'Can only complete approved requests' };
            }

            return await prisma.$transaction(async (tx) => {
                console.log(`[RefundAdminService.completeRefund] Admin starting completion for Refund: ${refundId}`);

                // Mark as completed - PASS THE TRANSACTION CLIENT
                const completed = await TransactionRefundRequestModel.complete(refundId, paymentReference, tx);

                // Initialize wallet service with the transaction client
                const walletService = new VirtualWalletService(tx as any);

                // Get or create virtual account for company
                const virtualAccount = await walletService.getOrCreateAccount({
                    ownerType: VirtualAccountOwner.COMPANY,
                    ownerId: refund.companyId,
                });

                console.log(`[RefundAdminService.completeRefund] Wallet: ${virtualAccount.id}, Old Balance: ${virtualAccount.balance}`);

                // Get transaction context info for description
                let description = `Refund for ${refund.transactionType.toLowerCase().replace('_', ' ')}`;
                if (refund.transactionType === 'JOB_PAYMENT') {
                    const job = await tx.job.findUnique({ where: { id: refund.transactionId }, select: { title: true } });
                    if (job) description = `Refund for job: ${job.title}`;
                } else if (refund.transactionType === 'SUBSCRIPTION_BILL') {
                    const bill = await tx.bill.findUnique({ where: { id: refund.transactionId }, select: { bill_number: true } });
                    if (bill) description = `Refund for bill: ${bill.bill_number}`;
                }

                // Credit the company's virtual wallet
                const creditResult = await walletService.creditAccount({
                    accountId: virtualAccount.id,
                    amount: refund.amount,
                    type: refund.transactionType === 'JOB_PAYMENT' ? VirtualTransactionType.JOB_REFUND : VirtualTransactionType.SUBSCRIPTION_REFUND,
                    description: description,
                    referenceType: 'REFUND_REQUEST',
                    referenceId: refundId,
                });

                console.log(`[RefundAdminService.completeRefund] Credit successful. New Balance: ${creditResult.account.balance}`);

                // Process revenue deduction/reversal
                const { FinanceService } = await import('./FinanceService');
                await FinanceService.processRefundRevenue(refund.transactionId, refund.amount, tx);

                console.log(`[RefundAdminService.completeRefund] Complete: Refund fully credited and closed.`);
                return { success: true, refundRequest: completed };
            }, {
                timeout: 30000,
            });
        } catch (error: any) {
            console.error('Complete refund error:', error);
            return { success: false, error: error.message || 'Failed to complete refund' };
        }
    }

    /**
     * Get refund statistics
     */
    static async getRefundStats(filters?: { companyId?: string; startDate?: Date; endDate?: Date }) {
        const { companyId, startDate, endDate } = filters || {};
        const where: any = {};

        if (companyId) {
            where.company_id = companyId;
        }

        if (startDate || endDate) {
            where.created_at = {};
            if (startDate) where.created_at.gte = startDate;
            if (endDate) where.created_at.lte = endDate;
        }

        const [total, approved, rejected, pending, totalAmount, approvedAmount] = await Promise.all([
            prisma.transactionRefundRequest.count({ where }),
            prisma.transactionRefundRequest.count({
                where: { ...where, status: RefundStatus.APPROVED },
            }),
            prisma.transactionRefundRequest.count({
                where: { ...where, status: RefundStatus.REJECTED },
            }),
            prisma.transactionRefundRequest.count({
                where: { ...where, status: RefundStatus.PENDING },
            }),
            prisma.transactionRefundRequest.aggregate({
                where,
                _sum: { amount: true },
            }),
            prisma.transactionRefundRequest.aggregate({
                where: { ...where, status: RefundStatus.APPROVED },
                _sum: { amount: true },
            }),
        ]);

        return {
            total,
            approved,
            rejected,
            pending,
            totalAmount: totalAmount._sum.amount || 0,
            approvedAmount: approvedAmount._sum.amount || 0,
            approvalRate: total > 0 ? (approved / total) * 100 : 0,
        };
    }
}
