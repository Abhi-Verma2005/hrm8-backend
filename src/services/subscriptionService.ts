import { PrismaClient, SubscriptionPlanType, SubscriptionStatus, VirtualTransactionType } from '@prisma/client';
import { VirtualWalletService } from './virtualWalletService';

export interface CreateSubscriptionInput {
    companyId: string;
    planType: SubscriptionPlanType;
    name: string;
    basePrice: number;
    billingCycle: 'MONTHLY' | 'ANNUAL';
    jobQuota?: number | null;
    discountPercent?: number;
    salesAgentId?: string;
    referredBy?: string;
    autoRenew?: boolean;
    startDate?: Date;
}

export interface ProcessJobPostingInput {
    subscriptionId: string;
    companyId: string;
    userId: string;
    jobTitle: string;
}

export class SubscriptionService {
    private walletService: VirtualWalletService;

    constructor(private prisma: PrismaClient) {
        this.walletService = new VirtualWalletService(prisma);
    }

    /**
     * Create a new subscription and credit the virtual wallet
     */
    async createSubscription(input: CreateSubscriptionInput) {
        const {
            companyId,
            planType,
            name,
            basePrice,
            billingCycle,
            jobQuota,
            discountPercent = 0,
            salesAgentId,
            referredBy,
            autoRenew = true,
            startDate = new Date(),
        } = input;

        return await this.prisma.$transaction(async (tx) => {
            // Calculate subscription end date
            const endDate = new Date(startDate);
            if (billingCycle === 'MONTHLY') {
                endDate.setMonth(endDate.getMonth() + 1);
            } else {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }

            const renewalDate = new Date(endDate);

            // Create subscription
            const subscription = await tx.subscription.create({
                data: {
                    company_id: companyId,
                    name,
                    plan_type: planType,
                    status: SubscriptionStatus.ACTIVE,
                    base_price: basePrice,
                    currency: 'USD',
                    billing_cycle: billingCycle,
                    discount_percent: discountPercent,
                    start_date: startDate,
                    end_date: endDate,
                    renewal_date: renewalDate,
                    job_quota: jobQuota,
                    jobs_used: 0,
                    prepaid_balance: basePrice,
                    auto_renew: autoRenew,
                    sales_agent_id: salesAgentId,
                    referred_by: referredBy,
                },
            });

            // Get or create virtual account for company
            const virtualAccount = await this.walletService.getOrCreateAccount({
                ownerType: 'COMPANY',
                ownerId: companyId,
            });

            // Credit the virtual wallet with subscription amount
            const { transaction } = await this.walletService.creditAccount({
                accountId: virtualAccount.id,
                amount: basePrice,
                type: VirtualTransactionType.SUBSCRIPTION_PURCHASE,
                description: `${name} subscription purchase`,
                referenceType: 'SUBSCRIPTION',
                referenceId: subscription.id,
                subscriptionId: subscription.id,
            });

            return {
                subscription,
                virtualAccount,
                creditTransaction: transaction,
            };
        }, {
            timeout: 15000, // Increase timeout to 15 seconds
        });
    }

    /**
     * Process a job posting - check quota and deduct from wallet
     */
    async processJobPosting(input: ProcessJobPostingInput) {
        const { subscriptionId, companyId, userId, jobTitle } = input;

        return await this.prisma.$transaction(async (tx) => {
            // Get subscription
            const subscription = await tx.subscription.findUnique({
                where: { id: subscriptionId },
            });

            if (!subscription) {
                throw new Error(`Subscription ${subscriptionId} not found`);
            }

            if (subscription.status !== SubscriptionStatus.ACTIVE) {
                throw new Error(`Subscription is not active (status: ${subscription.status})`);
            }

            if (subscription.company_id !== companyId) {
                throw new Error('Subscription does not belong to this company');
            }

            // Check job quota
            if (subscription.job_quota !== null) {
                if (subscription.jobs_used >= subscription.job_quota) {
                    throw new Error(
                        `Job quota exceeded. Used: ${subscription.jobs_used}/${subscription.job_quota}. Please upgrade your plan or purchase additional jobs.`
                    );
                }
            }

            // Get virtual account
            const virtualAccount = await this.walletService.getAccountByOwner('COMPANY', companyId);

            if (!virtualAccount) {
                throw new Error(`Virtual account not found for company ${companyId}`);
            }

            // Calculate per-job cost
            let jobCost = 0;
            if (subscription.job_quota && subscription.job_quota > 0) {
                jobCost = subscription.base_price / subscription.job_quota;
            }

            // Check balance if there's a cost
            if (jobCost > 0) {
                const hasBalance = await this.walletService.checkBalance(virtualAccount.id, jobCost);

                if (!hasBalance) {
                    const shortfall = jobCost - virtualAccount.balance;
                    throw new Error(
                        `Insufficient balance. Available: $${virtualAccount.balance.toFixed(2)}, Required: $${jobCost.toFixed(
                            2
                        )}. Please recharge your wallet with at least $${shortfall.toFixed(2)} to continue.`
                    );
                }

                // Debit from wallet
                await this.walletService.debitAccount({
                    accountId: virtualAccount.id,
                    amount: jobCost,
                    type: VirtualTransactionType.JOB_POSTING_DEDUCTION,
                    description: `Job posting charge: ${jobTitle}`,
                    referenceType: 'SUBSCRIPTION',
                    referenceId: subscriptionId,
                    subscriptionId: subscriptionId,
                    createdBy: userId,
                });
            }

            // Update subscription usage
            const updatedSubscription = await tx.subscription.update({
                where: { id: subscriptionId },
                data: {
                    jobs_used: subscription.jobs_used + 1,
                    prepaid_balance: subscription.prepaid_balance ? subscription.prepaid_balance - jobCost : null,
                },
            });

            return {
                subscription: updatedSubscription,
                jobCost,
                remainingJobs: subscription.job_quota ? subscription.job_quota - (subscription.jobs_used + 1) : null,
            };
        });
    }


    /**
     * Renew subscription
     */
    async renewSubscription(subscriptionId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const subscription = await tx.subscription.findUnique({
                where: { id: subscriptionId },
            });

            if (!subscription) {
                throw new Error(`Subscription ${subscriptionId} not found`);
            }

            if (!subscription.auto_renew) {
                throw new Error('Subscription auto-renewal is disabled');
            }

            // Calculate new dates
            const newStartDate = subscription.end_date || new Date();
            const newEndDate = new Date(newStartDate);
            if (subscription.billing_cycle === 'MONTHLY') {
                newEndDate.setMonth(newEndDate.getMonth() + 1);
            } else {
                newEndDate.setFullYear(newEndDate.getFullYear() + 1);
            }

            // Get virtual account
            const virtualAccount = await this.walletService.getAccountByOwner('COMPANY', subscription.company_id);

            if (!virtualAccount) {
                throw new Error(`Virtual account not found for company ${subscription.company_id}`);
            }

            // Check if company has sufficient balance for renewal
            const hasBalance = await this.walletService.checkBalance(virtualAccount.id, subscription.base_price);

            if (!hasBalance) {
                // Mark renewal as failed
                await tx.subscription.update({
                    where: { id: subscriptionId },
                    data: {
                        renewal_failed_at: new Date(),
                        renewal_failure_reason: `Insufficient balance. Required: $${subscription.base_price.toFixed(2)}`,
                    },
                });

                throw new Error(
                    `Insufficient balance for renewal. Available: $${virtualAccount.balance.toFixed(
                        2
                    )}, Required: $${subscription.base_price.toFixed(2)}`
                );
            }

            // Debit for renewal
            await this.walletService.debitAccount({
                accountId: virtualAccount.id,
                amount: subscription.base_price,
                type: VirtualTransactionType.SUBSCRIPTION_PURCHASE,
                description: `Subscription renewal: ${subscription.name}`,
                referenceType: 'SUBSCRIPTION',
                referenceId: subscriptionId,
                subscriptionId: subscriptionId,
            });

            // Update subscription
            const renewedSubscription = await tx.subscription.update({
                where: { id: subscriptionId },
                data: {
                    start_date: newStartDate,
                    end_date: newEndDate,
                    renewal_date: new Date(newEndDate),
                    jobs_used: 0, // Reset job usage
                    prepaid_balance: subscription.base_price,
                    renewal_failed_at: null,
                    renewal_failure_reason: null,
                },
            });

            return renewedSubscription;
        });
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(subscriptionId: string, reason?: string) {
        const subscription = await this.prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                status: SubscriptionStatus.CANCELLED,
                cancelled_at: new Date(),
                auto_renew: false,
                notes: reason,
            },
        });

        return subscription;
    }

    /**
     * Get subscription with usage stats
     */
    async getSubscriptionWithStats(subscriptionId: string) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { id: subscriptionId },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!subscription) {
            throw new Error(`Subscription ${subscriptionId} not found`);
        }

        // Get virtual account balance
        const virtualAccount = await this.walletService.getAccountByOwner('COMPANY', subscription.company_id);

        return {
            subscription,
            stats: {
                jobsUsed: subscription.jobs_used,
                jobQuota: subscription.job_quota,
                jobsRemaining: subscription.job_quota ? subscription.job_quota - subscription.jobs_used : null,
                prepaidBalance: subscription.prepaid_balance,
                walletBalance: virtualAccount?.balance || 0,
                daysUntilRenewal: subscription.renewal_date
                    ? Math.ceil((subscription.renewal_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null,
            },
        };
    }

    /**
     * Get active subscription for a company
     */
    async getActiveSubscription(companyId: string) {
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                company_id: companyId,
                status: SubscriptionStatus.ACTIVE,
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        return subscription;
    }
}
