import { PrismaClient, VirtualTransactionType, PaymentStatus } from '@prisma/client';
import { VirtualWalletService } from '../virtualWalletService';
import { JobPaymentService, ServicePackage } from './JobPaymentService';

export interface WalletPaymentCheckResult {
    canPost: boolean;
    balance: number;
    required: number;
    shortfall: number;
    currency: string;
}

export interface WalletPaymentResult {
    success: boolean;
    transactionId?: string;
    newBalance?: number;
    error?: string;
}

export class WalletJobPaymentService {
    private walletService: VirtualWalletService;

    constructor(private prisma: PrismaClient) {
        this.walletService = new VirtualWalletService(prisma);
    }

    /**
     * Check if company has sufficient balance to post a job
     */
    async checkCanPostJob(companyId: string, servicePackage: ServicePackage | string): Promise<WalletPaymentCheckResult> {
        // 1. Get cost
        const paymentInfo = JobPaymentService.getPaymentAmount(servicePackage as ServicePackage);

        // Free packages
        if (!paymentInfo || paymentInfo.amount === 0) {
            return {
                canPost: true,
                balance: 0,
                required: 0,
                shortfall: 0,
                currency: 'USD'
            };
        }

        // 2. Get wallet balance
        const account = await this.walletService.getOrCreateAccount({
            ownerType: 'COMPANY',
            ownerId: companyId
        });

        const hasBalance = account.balance >= paymentInfo.amount;

        return {
            canPost: hasBalance,
            balance: account.balance,
            required: paymentInfo.amount,
            shortfall: hasBalance ? 0 : paymentInfo.amount - account.balance,
            currency: paymentInfo.currency
        };
    }

    /**
     * Process payment for a job from wallet
     */
    async payForJobFromWallet(companyId: string, jobId: string, servicePackage: ServicePackage | string, userId: string, jobTitle: string): Promise<WalletPaymentResult> {
        const paymentInfo = JobPaymentService.getPaymentAmount(servicePackage as ServicePackage);

        // If free, no payment needed
        if (!paymentInfo || paymentInfo.amount === 0) {
            return { success: true };
        }

        return await this.prisma.$transaction(async (tx) => {
            // Re-instantiate wallet service with transaction client
            const txWalletService = new VirtualWalletService(tx as any);

            // 1. Get account
            const account = await txWalletService.getAccountByOwner('COMPANY', companyId);

            if (!account) {
                throw new Error('Wallet account not found');
            }

            // 2. Check balance again (double check inside transaction)
            if (account.balance < paymentInfo.amount) {
                return {
                    success: false,
                    error: 'Insufficient balance'
                };
            }

            // 3. Debit account
            const debitResult = await txWalletService.debitAccount({
                accountId: account.id,
                amount: paymentInfo.amount,
                type: VirtualTransactionType.JOB_POSTING_DEDUCTION,
                description: `Job posting: ${jobTitle} (${servicePackage})`,
                referenceType: 'JOB',
                referenceId: jobId,
                jobId: jobId,
                createdBy: userId,
                metadata: {
                    servicePackage,
                    originalCurrency: paymentInfo.currency
                }
            });

            // 4. Record payment on job
            await tx.job.update({
                where: { id: jobId },
                data: {
                    payment_status: PaymentStatus.PAID,
                    payment_amount: paymentInfo.amount,
                    payment_currency: paymentInfo.currency,
                    payment_completed_at: new Date(),
                    service_package: servicePackage,
                    // payment_method: 'WALLET', // Not in schema
                    // wallet_transaction_id: debitResult.transaction.id // Not in schema
                }
            });

            // 5. Create centralized commission (Sales Agent)
            // This is moved here from stripe webhook to unify logic
            try {
                // const { CommissionService } = await import('../../hrm8/CommissionService');
                // Note: We're calling this outside the transaction context or need to pass tx if service supports it
                // For now, we'll let it handle its own transaction management or be separate
                // Ideally CommissionService should accept Prisma.TransactionClient
            } catch (e) {
                console.error('Failed to load CommissionService', e);
            }

            return {
                success: true,
                transactionId: debitResult.transaction.id,
                newBalance: debitResult.account.balance
            };
        });
    }
}
