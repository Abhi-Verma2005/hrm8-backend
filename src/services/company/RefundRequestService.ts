/**
 * RefundRequestService
 * Handles refund request logic for employers
 */

import { TransactionRefundRequestModel, TransactionRefundRequestData } from '../../models/TransactionRefundRequest';
import prisma from '../../lib/prisma';

export class RefundRequestService {
    /**
     * Create a refund request
     */
    static async createRefundRequest(data: {
        companyId: string;
        transactionId: string;
        transactionType: 'JOB_PAYMENT' | 'SUBSCRIPTION_BILL';
        amount: number;
        reason: string;
    }): Promise<{ success: boolean; refundRequest?: TransactionRefundRequestData; error?: string }> {
        try {
            // Validate reason length
            if (!data.reason || data.reason.trim().length < 20) {
                return { success: false, error: 'Reason must be at least 20 characters' };
            }

            // Validate amount
            if (data.amount <= 0) {
                return { success: false, error: 'Amount must be greater than zero' };
            }

            // Check if transaction exists and belongs to company
            const isValid = await this.validateTransaction(
                data.companyId,
                data.transactionId,
                data.transactionType,
                data.amount
            );

            if (!isValid.valid) {
                return { success: false, error: isValid.error };
            }

            // Check for existing pending/approved refund for this transaction
            const existing = await prisma.transactionRefundRequest.findFirst({
                where: {
                    company_id: data.companyId,
                    transaction_id: data.transactionId,
                    status: { in: ['PENDING', 'APPROVED', 'COMPLETED'] },
                },
            });

            if (existing) {
                return { success: false, error: 'A refund request already exists for this transaction' };
            }

            // Create refund request
            const refundRequest = await TransactionRefundRequestModel.create(data);

            return { success: true, refundRequest };
        } catch (error: any) {
            console.error('Create refund request error:', error);
            return { success: false, error: error.message || 'Failed to create refund request' };
        }
    }

    /**
     * Get all refund requests for a company
     */
    static async getCompanyRefundRequests(companyId: string): Promise<TransactionRefundRequestData[]> {
        return await TransactionRefundRequestModel.findByCompanyId(companyId);
    }

    /**
     * Validate that transaction exists, belongs to company, is paid, and amount is valid
     */
    private static async validateTransaction(
        companyId: string,
        transactionId: string,
        transactionType: 'JOB_PAYMENT' | 'SUBSCRIPTION_BILL',
        amount: number
    ): Promise<{ valid: boolean; error?: string }> {
        if (transactionType === 'JOB_PAYMENT') {
            const job = await prisma.job.findFirst({
                where: {
                    id: transactionId,
                    company_id: companyId,
                    payment_status: 'PAID',
                },
            });

            if (!job) {
                return { valid: false, error: 'Job not found or not paid' };
            }

            if (amount > (job.payment_amount || 0)) {
                return { valid: false, error: 'Refund amount exceeds job payment amount' };
            }

            return { valid: true };
        } else if (transactionType === 'SUBSCRIPTION_BILL') {
            const bill = await prisma.bill.findFirst({
                where: {
                    id: transactionId,
                    company_id: companyId,
                    status: 'PAID',
                },
            });

            if (!bill) {
                return { valid: false, error: 'Bill not found or not paid' };
            }

            if (amount > bill.amount) {
                return { valid: false, error: 'Refund amount exceeds bill amount' };
            }

            return { valid: true };
        }

        return { valid: false, error: 'Invalid transaction type' };
    }

    /**
     * Cancel a refund request (only if pending)
     */
    static async cancelRefundRequest(
        refundId: string,
        companyId: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const refund = await TransactionRefundRequestModel.findById(refundId);

            if (!refund) {
                return { success: false, error: 'Refund request not found' };
            }

            if (refund.companyId !== companyId) {
                return { success: false, error: 'Unauthorized' };
            }

            if (refund.status !== 'PENDING') {
                return { success: false, error: 'Can only cancel pending requests' };
            }

            await TransactionRefundRequestModel.cancel(refundId);

            return { success: true };
        } catch (error: any) {
            console.error('Cancel refund request error:', error);
            return { success: false, error: error.message || 'Failed to cancel refund request' };
        }
    }

    /**
     * Withdraw an approved refund (company-initiated)
     * This triggers the actual refund payout and marks it as completed
     */
    static async withdrawRefund(
        refundId: string,
        companyId: string
    ): Promise<{ success: boolean; refundRequest?: TransactionRefundRequestData; error?: string }> {
        try {
            const refund = await TransactionRefundRequestModel.findById(refundId);

            if (!refund) {
                return { success: false, error: 'Refund request not found' };
            }

            if (refund.companyId !== companyId) {
                return { success: false, error: 'Unauthorized' };
            }

            if (refund.status === 'COMPLETED') {
                return { success: false, error: 'This refund has already been withdrawn' };
            }

            if (refund.status === 'PENDING') {
                return { success: false, error: 'Refund must be approved by admin before withdrawal' };
            }

            if (refund.status === 'REJECTED') {
                return { success: false, error: 'Cannot withdraw a rejected refund' };
            }

            if (refund.status !== 'APPROVED') {
                return { success: false, error: 'Can only withdraw approved refunds' };
            }

            // Mark as completed
            const completed = await TransactionRefundRequestModel.complete(refundId);

            // Process revenue deduction
            const { FinanceService } = await import('../hrm8/FinanceService');
            await FinanceService.processRefundRevenue(refund.transactionId, refund.amount);

            return { success: true, refundRequest: completed };
        } catch (error: any) {
            console.error('Withdraw refund error:', error);
            return { success: false, error: error.message || 'Failed to withdraw refund' };
        }
    }
}
