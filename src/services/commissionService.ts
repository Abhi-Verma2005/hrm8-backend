import { PrismaClient, CommissionType, CommissionStatus, WithdrawalStatus, VirtualTransactionType, UniversalNotificationType } from '@prisma/client';
import { VirtualWalletService } from './virtualWalletService';
import { UniversalNotificationService } from './notification/UniversalNotificationService';
import { emailService } from './email/EmailService';

export interface AwardCommissionInput {
    consultantId: string;
    jobId?: string;
    subscriptionId?: string;
    type: CommissionType;
    amount: number;
    rate?: number;
    description?: string;
    expiryDate?: Date;
}

export interface RequestWithdrawalInput {
    consultantId: string;
    amount: number;
    paymentMethod: string;
    paymentDetails: Record<string, any>;
    notes?: string;
}

export interface ApproveWithdrawalInput {
    withdrawalId: string;
    adminId: string;
    paymentReference?: string;
    adminNotes?: string;
}

export interface RejectWithdrawalInput {
    withdrawalId: string;
    adminId: string;
    reason: string;
}

export class CommissionService {
    private walletService: VirtualWalletService;

    constructor(private prisma: PrismaClient) {
        this.walletService = new VirtualWalletService(prisma);
    }

    /**
     * Award commission to a consultant and credit their virtual wallet
     */
    async awardCommission(input: AwardCommissionInput) {
        const { consultantId, jobId, subscriptionId, type, amount, rate, description, expiryDate } = input;

        if (amount <= 0) {
            throw new Error('Commission amount must be positive');
        }

        return await this.prisma.$transaction(async (tx) => {
            // Get consultant to get region
            const consultant = await tx.consultant.findUnique({
                where: { id: consultantId },
                select: { region_id: true, email: true },
            });

            if (!consultant) {
                throw new Error(`Consultant ${consultantId} not found`);
            }

            // Create commission record
            const commission = await tx.commission.create({
                data: {
                    consultant_id: consultantId,
                    region_id: consultant.region_id,
                    job_id: jobId,
                    subscription_id: subscriptionId,
                    type,
                    amount,
                    rate,
                    description: description || `Commission for ${type}`,
                    status: CommissionStatus.CONFIRMED,
                    confirmed_at: new Date(),
                    commission_expiry_date: expiryDate,
                },
            });

            // Get or create virtual account for consultant
            const virtualAccount = await this.walletService.getOrCreateAccount({
                ownerType: 'CONSULTANT',
                ownerId: consultantId,
            });

            // Credit the consultant's virtual wallet
            const { transaction } = await this.walletService.creditAccount({
                accountId: virtualAccount.id,
                amount,
                type: VirtualTransactionType.COMMISSION_EARNED,
                description: `Commission earned: ${description || type}`,
                referenceType: 'COMMISSION',
                referenceId: commission.id,
                jobId,
                subscriptionId,
                commissionId: commission.id,
            });

            // Update consultant's pending commissions
            await tx.consultant.update({
                where: { id: consultantId },
                data: {
                    pending_commissions: {
                        increment: amount,
                    },
                },
            });

            // Notify consultant
            await UniversalNotificationService.createNotification({
                recipientType: 'CONSULTANT',
                recipientId: consultantId,
                type: UniversalNotificationType.COMMISSION_EARNED,
                title: 'Commission Earned!',
                message: `You've earned $${amount.toFixed(2)} commission for ${description || type}.`,
                jobId,
                data: { subscriptionId }
            });

            await emailService.sendCommissionEarnedEmail(
                consultant.email,
                amount,
                description || type
            );

            return {
                commission,
                virtualAccount,
                creditTransaction: transaction,
            };
        }, {
            timeout: 20000,
        });
    }

    /**
     * Calculate commission based on service type and pricing
     */
    async calculateCommission(params: {
        serviceType: 'SHORTLISTING' | 'STANDARD_RECRUITMENT' | 'EXECUTIVE_SEARCH' | 'SUBSCRIPTION_SALE';
        baseAmount: number;
        consultantId: string;
    }): Promise<{ amount: number; rate: number }> {
        const { serviceType: _serviceType, baseAmount, consultantId } = params;

        // Get consultant's commission rate
        const consultant = await this.prisma.consultant.findUnique({
            where: { id: consultantId },
            select: { default_commission_rate: true },
        });

        if (!consultant) {
            throw new Error(`Consultant ${consultantId} not found`);
        }

        // Use consultant's default rate or fallback to 10%
        const rate = consultant.default_commission_rate || 10;

        // Calculate commission amount
        const amount = (baseAmount * rate) / 100;

        return { amount, rate };
    }

    /**
     * Request withdrawal from virtual wallet
     */
    async requestWithdrawal(input: RequestWithdrawalInput) {
        const { consultantId, amount, paymentMethod, paymentDetails, notes } = input;

        if (amount <= 0) {
            throw new Error('Withdrawal amount must be positive');
        }

        return await this.prisma.$transaction(async (tx) => {
            // Get consultant's virtual account
            const virtualAccount = await this.walletService.getAccountByOwner('CONSULTANT', consultantId);

            if (!virtualAccount) {
                throw new Error(`Virtual account not found for consultant ${consultantId}`);
            }

            // Check if consultant has sufficient balance
            if (virtualAccount.balance < amount) {
                throw new Error(
                    `Insufficient balance. Available: $${virtualAccount.balance.toFixed(2)}, Requested: $${amount.toFixed(2)}`
                );
            }

            // Get commissions that contribute to this amount
            const commissions = await tx.commission.findMany({
                where: {
                    consultant_id: consultantId,
                    status: CommissionStatus.CONFIRMED,
                    paid_at: null,
                },
                orderBy: { confirmed_at: 'asc' },
            });

            const commissionIds = commissions
                .reduce((acc: string[], comm) => {
                    if (acc.length === 0 || commissions.reduce((sum, c) => sum + (acc.includes(c.id) ? c.amount : 0), 0) < amount) {
                        acc.push(comm.id);
                    }
                    return acc;
                }, []);

            // Create withdrawal request
            const withdrawal = await tx.commissionWithdrawal.create({
                data: {
                    consultant_id: consultantId,
                    amount,
                    status: WithdrawalStatus.PENDING,
                    payment_method: paymentMethod,
                    payment_details: paymentDetails,
                    commission_ids: commissionIds,
                    notes,
                },
            });

            return withdrawal;
        });
    }

    /**
     * Approve withdrawal and debit from virtual wallet
     */
    async approveWithdrawal(input: ApproveWithdrawalInput) {
        const { withdrawalId, adminId, paymentReference, adminNotes } = input;

        return await this.prisma.$transaction(async (tx) => {
            // Get withdrawal request
            const withdrawal = await tx.commissionWithdrawal.findUnique({
                where: { id: withdrawalId },
            });

            if (!withdrawal) {
                throw new Error(`Withdrawal request ${withdrawalId} not found`);
            }

            if (withdrawal.status !== WithdrawalStatus.PENDING) {
                throw new Error(`Withdrawal request is not pending (status: ${withdrawal.status})`);
            }

            // Get consultant's virtual account
            const virtualAccount = await this.walletService.getAccountByOwner('CONSULTANT', withdrawal.consultant_id);

            if (!virtualAccount) {
                throw new Error(`Virtual account not found for consultant ${withdrawal.consultant_id}`);
            }

            // Check balance again
            if (virtualAccount.balance < withdrawal.amount) {
                throw new Error(
                    `Insufficient balance. Available: $${virtualAccount.balance.toFixed(2)}, Required: $${withdrawal.amount.toFixed(
                        2
                    )}`
                );
            }

            // Debit from consultant's wallet
            const { transaction } = await this.walletService.debitAccount({
                accountId: virtualAccount.id,
                amount: withdrawal.amount,
                type: VirtualTransactionType.COMMISSION_WITHDRAWAL,
                description: `Commission withdrawal via ${withdrawal.payment_method}`,
                referenceType: 'WITHDRAWAL',
                referenceId: withdrawalId,
                createdBy: adminId,
            });

            // Update withdrawal status
            const approvedWithdrawal = await tx.commissionWithdrawal.update({
                where: { id: withdrawalId },
                data: {
                    status: WithdrawalStatus.APPROVED,
                    processed_by: adminId,
                    processed_at: new Date(),
                    payment_reference: paymentReference || `WD-${Date.now()}`,
                    admin_notes: adminNotes,
                    virtual_transaction_id: transaction.id,
                    debited_from_wallet: true,
                    wallet_debit_at: new Date(),
                },
            });

            // Mark commissions as paid
            if (withdrawal.commission_ids && withdrawal.commission_ids.length > 0) {
                await tx.commission.updateMany({
                    where: {
                        id: { in: withdrawal.commission_ids },
                    },
                    data: {
                        status: CommissionStatus.PAID,
                        paid_at: new Date(),
                        payment_reference: paymentReference,
                    },
                });
            }

            // Update consultant's stats
            await tx.consultant.update({
                where: { id: withdrawal.consultant_id },
                data: {
                    pending_commissions: {
                        decrement: withdrawal.amount,
                    },
                    total_commissions_paid: {
                        increment: withdrawal.amount,
                    },
                },
            });

            return {
                withdrawal: approvedWithdrawal,
                debitTransaction: transaction,
            };
        });
    }

    /**
     * Reject withdrawal request
     */
    async rejectWithdrawal(input: RejectWithdrawalInput) {
        const { withdrawalId, adminId, reason } = input;

        const withdrawal = await this.prisma.commissionWithdrawal.update({
            where: { id: withdrawalId },
            data: {
                status: WithdrawalStatus.REJECTED,
                rejected_by: adminId,
                rejected_at: new Date(),
                rejection_reason: reason,
            },
        });

        return withdrawal;
    }

    /**
     * Get consultant earnings summary
     */
    async getConsultantEarnings(consultantId: string) {
        // Get consultant data
        const consultant = await this.prisma.consultant.findUnique({
            where: { id: consultantId },
            select: {
                pending_commissions: true,
                total_commissions_paid: true,
            },
        });

        if (!consultant) {
            throw new Error(`Consultant ${consultantId} not found`);
        }

        // Get virtual account balance
        const virtualAccount = await this.walletService.getAccountByOwner('CONSULTANT', consultantId);

        // Get commissions breakdown
        const [totalEarned, pendingCommissions, paidCommissions, withdrawals] = await Promise.all([
            this.prisma.commission.aggregate({
                where: { consultant_id: consultantId },
                _sum: { amount: true },
            }),
            this.prisma.commission.findMany({
                where: {
                    consultant_id: consultantId,
                    status: CommissionStatus.CONFIRMED,
                    paid_at: null,
                },
            }),
            this.prisma.commission.findMany({
                where: {
                    consultant_id: consultantId,
                    status: CommissionStatus.PAID,
                },
                orderBy: { paid_at: 'desc' },
                take: 10,
            }),
            this.prisma.commissionWithdrawal.findMany({
                where: { consultant_id: consultantId },
                orderBy: { created_at: 'desc' },
                take: 10,
            }),
        ]);

        return {
            availableBalance: virtualAccount?.balance || 0,
            totalEarned: totalEarned._sum.amount || 0,
            pendingCommissions: consultant.pending_commissions,
            totalWithdrawn: consultant.total_commissions_paid,
            commissions: {
                pending: pendingCommissions,
                paid: paidCommissions,
            },
            withdrawals,
        };
    }

    /**
     * Get pending withdrawal requests (for admin)
     */
    async getPendingWithdrawals(filters?: { consultantId?: string; limit?: number; offset?: number }) {
        const { consultantId, limit = 50, offset = 0 } = filters || {};

        const where: any = {
            status: WithdrawalStatus.PENDING,
        };

        if (consultantId) {
            where.consultant_id = consultantId;
        }

        const [withdrawals, total] = await Promise.all([
            this.prisma.commissionWithdrawal.findMany({
                where,
                include: {
                    consultant: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            email: true,
                        },
                    },
                },
                orderBy: { created_at: 'asc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.commissionWithdrawal.count({ where }),
        ]);

        return {
            withdrawals,
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
        };
    }
}
