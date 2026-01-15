import { PrismaClient, RefundStatus, VirtualTransactionType } from '@prisma/client';
import { VirtualWalletService } from './virtualWalletService';

export interface CreateRefundRequestInput {
    companyId: string;
    transactionId: string;
    transactionType: 'JOB_PAYMENT' | 'SUBSCRIPTION_BILL' | 'ADDON_SERVICE_CHARGE';
    amount: number;
    reason: string;
}

export interface ApproveRefundInput {
    refundRequestId: string;
    adminId: string;
    adminNotes?: string;
}

export interface RejectRefundInput {
    refundRequestId: string;
    adminId: string;
    reason: string;
}

export class RefundService {
    private walletService: VirtualWalletService;

    constructor(private prisma: PrismaClient) {
        this.walletService = new VirtualWalletService(prisma);
    }

    /**
     * Create a refund request
     */
    async createRefundRequest(input: CreateRefundRequestInput) {
        const { companyId, transactionId, transactionType, amount, reason } = input;

        if (amount <= 0) {
            throw new Error('Refund amount must be positive');
        }

        // Verify company exists
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: { id: true, name: true },
        });

        if (!company) {
            throw new Error(`Company ${companyId} not found`);
        }

        // Create refund request
        const refundRequest = await this.prisma.transactionRefundRequest.create({
            data: {
                company_id: companyId,
                transaction_id: transactionId,
                transaction_type: transactionType,
                amount,
                reason,
                status: RefundStatus.PENDING,
            },
        });

        return refundRequest;
    }

    /**
     * Approve refund and credit company's virtual wallet
     */
    async approveRefund(input: ApproveRefundInput) {
        const { refundRequestId, adminId, adminNotes } = input;

        return await this.prisma.$transaction(async (tx) => {
            // Get refund request
            const refundRequest = await tx.transactionRefundRequest.findUnique({
                where: { id: refundRequestId },
            });

            if (!refundRequest) {
                throw new Error(`Refund request ${refundRequestId} not found`);
            }

            if (refundRequest.status !== RefundStatus.PENDING) {
                throw new Error(`Refund request is not pending (status: ${refundRequest.status})`);
            }

            // Get or create virtual account for company
            const virtualAccount = await this.walletService.getOrCreateAccount({
                ownerType: 'COMPANY',
                ownerId: refundRequest.company_id,
            });

            // Credit the company's virtual wallet
            const { transaction } = await this.walletService.creditAccount({
                accountId: virtualAccount.id,
                amount: refundRequest.amount,
                type: VirtualTransactionType.JOB_REFUND, // or SUBSCRIPTION_REFUND based on type
                description: `Refund approved: ${refundRequest.reason}`,
                referenceType: 'REFUND_REQUEST',
                referenceId: refundRequestId,
                createdBy: adminId,
            });

            // Update refund request status
            const approvedRefund = await tx.transactionRefundRequest.update({
                where: { id: refundRequestId },
                data: {
                    status: RefundStatus.APPROVED,
                    processed_by: adminId,
                    processed_at: new Date(),
                    admin_notes: adminNotes,
                    payment_reference: `REFUND-${Date.now()}`,
                },
            });

            return {
                refundRequest: approvedRefund,
                creditTransaction: transaction,
            };
        });
    }

    /**
     * Reject refund request
     */
    async rejectRefund(input: RejectRefundInput) {
        const { refundRequestId, adminId, reason } = input;

        const refundRequest = await this.prisma.transactionRefundRequest.update({
            where: { id: refundRequestId },
            data: {
                status: RefundStatus.REJECTED,
                rejected_by: adminId,
                rejected_at: new Date(),
                rejection_reason: reason,
            },
        });

        return refundRequest;
    }

    /**
     * Get pending refund requests (for admin)
     */
    async getPendingRefunds(filters?: { companyId?: string; limit?: number; offset?: number }) {
        const { companyId, limit = 50, offset = 0 } = filters || {};

        const where: any = {
            status: RefundStatus.PENDING,
        };

        if (companyId) {
            where.company_id = companyId;
        }

        const [refunds, total] = await Promise.all([
            this.prisma.transactionRefundRequest.findMany({
                where,
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: { created_at: 'asc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.transactionRefundRequest.count({ where }),
        ]);

        return {
            refunds,
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
        };
    }

    /**
     * Get refund history for a company
     */
    async getCompanyRefunds(companyId: string, filters?: { limit?: number; offset?: number }) {
        const { limit = 20, offset = 0 } = filters || {};

        const [refunds, total] = await Promise.all([
            this.prisma.transactionRefundRequest.findMany({
                where: { company_id: companyId },
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.transactionRefundRequest.count({
                where: { company_id: companyId },
            }),
        ]);

        return {
            refunds,
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
        };
    }

    /**
     * Get refund statistics
     */
    async getRefundStats(filters?: { companyId?: string; startDate?: Date; endDate?: Date }) {
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
            this.prisma.transactionRefundRequest.count({ where }),
            this.prisma.transactionRefundRequest.count({
                where: { ...where, status: RefundStatus.APPROVED },
            }),
            this.prisma.transactionRefundRequest.count({
                where: { ...where, status: RefundStatus.REJECTED },
            }),
            this.prisma.transactionRefundRequest.count({
                where: { ...where, status: RefundStatus.PENDING },
            }),
            this.prisma.transactionRefundRequest.aggregate({
                where,
                _sum: { amount: true },
            }),
            this.prisma.transactionRefundRequest.aggregate({
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
