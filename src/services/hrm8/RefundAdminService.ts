/**
 * RefundAdminService
 * Handles refund request admin operations (HRM8 dashboard)
 */

import { TransactionRefundRequestModel, TransactionRefundRequestData } from '../../models/TransactionRefundRequest';
import { RefundStatus } from '@prisma/client';

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

            const completed = await TransactionRefundRequestModel.complete(refundId, paymentReference);

            // Process revenue deduction/reversal
            await import('./FinanceService').then(m => m.FinanceService.processRefundRevenue(refund.transactionId, refund.amount));

            return { success: true, refundRequest: completed };
        } catch (error: any) {
            console.error('Complete refund error:', error);
            return { success: false, error: error.message || 'Failed to complete refund' };
        }
    }
}
