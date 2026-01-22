/**
 * Job Payment Service
 * Handles job-specific payment logic
 */

import { JobModel } from '../../models/Job';
import { UPGRADE_PRICE_MAP } from './StripeUpgradeService';
import prisma from '../../lib/prisma';
import { PaymentStatus, VirtualTransactionType } from '@prisma/client';

export type ServicePackage = 'self-managed' | 'shortlisting' | 'full-service' | 'executive-search';

export interface CreateJobCheckoutParams {
  jobId: string;
  servicePackage: ServicePackage;
  companyId: string;
  customerEmail?: string;
}

export interface RecordJobPaymentParams {
  jobId: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  amount: number;
  currency: string;
}

export class JobPaymentService {
  /**
   * Get payment amount for a service package
   */
  static getPaymentAmount(servicePackage: ServicePackage): { amount: number; currency: string } | null {
    if (servicePackage === 'self-managed') {
      return null; // Free
    }

    // Map hyphenated package names to underscore format for UPGRADE_PRICE_MAP lookup
    const packageKeyMap: Record<string, string> = {
      'shortlisting': 'shortlisting',
      'full-service': 'full_service',
      'executive-search': 'executive_search',
    };
    const packageKey = packageKeyMap[servicePackage];
    const priceInfo = UPGRADE_PRICE_MAP[packageKey as keyof typeof UPGRADE_PRICE_MAP];

    if (!priceInfo) {
      console.error('❌ No price info found for package:', servicePackage, '-> key:', packageKey);
      return null;
    }

    return {
      amount: priceInfo.amount,
      currency: priceInfo.currency,
    };
  }

  /**
   * Check if a service package requires payment
   */
  static requiresPayment(servicePackage: ServicePackage): boolean {
    return servicePackage !== 'self-managed';
  }

  /**
   * Create Stripe checkout session for job payment
   */
  static async createJobCheckoutSession(params: CreateJobCheckoutParams): Promise<{ checkoutUrl: string; sessionId: string }> {
    const { jobId, servicePackage, companyId, customerEmail } = params;



    // Verify job exists and belongs to company
    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.companyId !== companyId) {
      throw new Error('Job does not belong to this company');
    }

    // Get payment amount
    const paymentInfo = this.getPaymentAmount(servicePackage);
    if (!paymentInfo) {
      throw new Error('Invalid service package or free package');
    }



    // Use StripeFactory to get the correct client (Mock or Real)
    const { StripeFactory } = await import('../stripe/StripeFactory');
    const stripe = await StripeFactory.getClientAsync();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const packageLabel = this.getPackageLabel(servicePackage);

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: customerEmail,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: paymentInfo.currency,
              unit_amount: paymentInfo.amount * 100, // Convert to cents
              product_data: {
                name: `Job Posting - ${packageLabel}`,
                description: `Payment for job: ${job.title}`,
              },
            },
          },
        ],
        success_url: `${frontendUrl}/jobs/${jobId}?payment=success`,
        cancel_url: `${frontendUrl}/jobs/${jobId}?payment=cancelled`,
        metadata: {
          jobId,
          servicePackage,
          companyId,
          app: 'hrm8',
          type: 'job_payment',
        },
        payment_intent_data: {
          metadata: {
            jobId,
            servicePackage,
            companyId,
            app: 'hrm8',
            type: 'job_payment',
          },
        },
      });

      // Validate session URL
      if (!session.url) {
        throw new Error('Stripe checkout session created but URL is missing');
      }

      // Update job with Stripe session ID
      await prisma.job.update({
        where: { id: jobId },
        data: {
          stripe_session_id: session.id,
          payment_status: PaymentStatus.PENDING,
          service_package: servicePackage,
          payment_amount: paymentInfo.amount,
          payment_currency: paymentInfo.currency,
        },
      });

      return {
        checkoutUrl: session.url,
        sessionId: session.id,
      };
    } catch (error: any) {
      console.error('❌ Error creating Stripe checkout session:', error);

      // Handle specific Stripe error types with user-friendly messages
      if (error.type === 'StripeInvalidRequestError') {
        throw new Error(`Stripe error: ${error.message}`);
      }

      // Handle connection errors with more helpful message
      if (error.type === 'StripeConnectionError' || error.code === 'ECONNRESET') {
        throw new Error(
          'Unable to connect to payment service. Please check your internet connection and try again. ' +
          'If the problem persists, please contact support.'
        );
      }

      // Re-throw other errors as-is
      throw error;
    }
  }

  /**
   * Record successful payment for a job
   */
  static async recordJobPayment(params: RecordJobPaymentParams): Promise<void> {
    const { jobId, stripeSessionId, stripePaymentIntentId, amount, currency } = params;

    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        payment_status: PaymentStatus.PAID,
        stripe_session_id: stripeSessionId,
        stripe_payment_intent_id: stripePaymentIntentId || undefined,
        payment_amount: amount,
        payment_currency: currency,
        payment_completed_at: new Date(),
        payment_failed_at: null,
      },
    });
  }

  /**
   * Record failed payment for a job
   */
  static async recordJobPaymentFailure(jobId: string): Promise<void> {
    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        payment_status: PaymentStatus.FAILED,
        payment_failed_at: new Date(),
      },
    });
  }

  /**
   * Get payment status for a job
   */
  static async getJobPaymentStatus(jobId: string): Promise<{
    paymentStatus: PaymentStatus | null;
    servicePackage: string | null;
    paymentAmount: number | null;
    paymentCurrency: string | null;
    paymentCompletedAt: Date | null;
  }> {
    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const prismaJob = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!prismaJob) {
      throw new Error('Job not found');
    }

    return {
      paymentStatus: (prismaJob as any).payment_status ?? null,
      servicePackage: (prismaJob as any).service_package ?? null,
      paymentAmount: (prismaJob as any).payment_amount ?? null,
      paymentCurrency: (prismaJob as any).payment_currency ?? null,
      paymentCompletedAt: (prismaJob as any).payment_completed_at ?? null,
    };
  }

  /**
   * Check if a job can be published (free or paid)
   */
  static async canPublishJob(jobId: string): Promise<boolean> {
    const job = await JobModel.findById(jobId);
    if (!job) {
      return false;
    }

    const prismaJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        service_package: true,
        payment_status: true,
        company_id: true,
      },
    });

    if (!prismaJob) {
      return false;
    }

    // If already paid, it can always be published
    if (prismaJob.payment_status === PaymentStatus.PAID) {
      return true;
    }

    // Self-managed jobs check
    if (prismaJob.service_package === 'self-managed' || !prismaJob.service_package) {
      // Check if company has an active subscription
      const { SubscriptionService } = await import('../subscriptionService');
      const subscriptionService = new SubscriptionService(prisma);
      const activeSub = await subscriptionService.getActiveSubscription(prismaJob.company_id);

      // If they have an active subscription, they MUST go through the payment/quota process
      if (activeSub) {
        return false;
      }

      // NO active subscription, self-managed is free
      return true;
    }

    // Paid packages require payment and we already checked if payment_status is PAID
    return false;
  }

  /**
   * Get package label for display
   */
  private static getPackageLabel(servicePackage: ServicePackage): string {
    const labels: Record<ServicePackage, string> = {
      'self-managed': 'Self-Managed',
      'shortlisting': 'Shortlisting',
      'full-service': 'Full Service',
      'executive-search': 'Executive Search',
    };
    return labels[servicePackage] || servicePackage;
  }

  /**
   * @deprecated Use WalletJobPaymentService.payForJobFromWallet instead for transaction safety
   * Process wallet payment for a job
   */
  static async processWalletPayment(jobId: string, companyId: string): Promise<boolean> {
    console.warn('⚠️ [DEPRECATED] JobPaymentService.processWalletPayment called. Use WalletJobPaymentService instead.');
    // Verify job exists and belongs to company
    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.companyId !== companyId) {
      throw new Error('Job does not belong to this company');
    }

    // Get payment amount
    // If service package is missing, assume self-managed (free)
    const servicePackage = (job.servicePackage || 'self-managed') as ServicePackage;

    // Self-managed processing
    if (servicePackage === 'self-managed') {
      const { SubscriptionService } = await import('../subscriptionService');
      const subscriptionService = new SubscriptionService(prisma);
      const activeSub = await subscriptionService.getActiveSubscription(companyId);

      if (activeSub) {
        try {
          // Process via subscription service (handles quota and wallet balance)
          await subscriptionService.processJobPosting({
            subscriptionId: activeSub.id,
            companyId,
            userId: 'SYSTEM',
            jobTitle: job.title
          });

          // Update job to mark as PAID
          await prisma.job.update({
            where: { id: jobId },
            data: {
              payment_status: PaymentStatus.PAID,
              payment_amount: 0, // Deducted from subscription/prepaid balance
              payment_completed_at: new Date(),
            }
          });

          return true;
        } catch (error: any) {
          throw error; // Propagate quota/balance errors
        }
      }

      return true;
    }

    const paymentInfo = this.getPaymentAmount(servicePackage);
    if (!paymentInfo) {
      // Should not happen if requiresPayment check passed, but safety first
      return true;
    }

    const { amount, currency } = paymentInfo;

    // Get Virtual Wallet Service instance
    const { VirtualWalletService } = await import('../virtualWalletService'); // Dynamic import to avoid circular dep if any
    const walletService = new VirtualWalletService(prisma);

    // Get Company Wallet
    const account = await walletService.getAccountByOwner('COMPANY', companyId);

    if (!account) {
      throw new Error('Company wallet not found. Please contact support.');
    }

    // Check Balance
    if (account.balance < amount) {
      const shortfall = amount - account.balance;
      throw new Error(`Insufficient wallet balance. Required: $${amount.toFixed(2)}, Available: $${account.balance.toFixed(2)}. Shortfall: $${shortfall.toFixed(2)}.`);
    }

    try {
      // Debiting uses a transaction internally in VirtualWalletService
      await walletService.debitAccount({
        accountId: account.id,
        amount: amount,
        type: VirtualTransactionType.JOB_POSTING_DEDUCTION,
        description: `Payment for job: ${job.title} (${this.getPackageLabel(servicePackage)})`,
        referenceType: 'JOB',
        referenceId: jobId,
        jobId: jobId,
        createdBy: 'SYSTEM',
      });
    } catch (error: any) {
      throw error; // Re-throw deduction error (e.g. Insufficient Funds) directly
    }

    try {
      // Update Job Payment Status
      await prisma.job.update({
        where: { id: jobId },
        data: {
          payment_status: PaymentStatus.PAID,
          payment_amount: amount,
          payment_currency: currency,
          payment_completed_at: new Date(),
        }
      });

      // TRIGGER COMMISSION
      await this.processCommission(companyId, amount, job.title, jobId, this.getPackageLabel(servicePackage));

      return true;
    } catch (updateError: any) {
      console.error('❌ [JobPaymentService] Job update failed after wallet deduction. Initiating REFUND...', updateError);

      // CRITICAL: ROLLBACK (REFUND) THE WALLET
      try {
        await walletService.creditAccount({
          accountId: account.id,
          amount: amount,
          type: VirtualTransactionType.JOB_REFUND,
          description: `REFUND: System error during job posting for ${job.title}`,
          referenceType: 'JOB',
          referenceId: jobId,
          jobId: jobId,
          createdBy: 'SYSTEM',
        });
      } catch (refundError) {
        console.error('🚨 [JobPaymentService] CRITICAL: REFUND FAILED for job:', jobId, refundError);
        // This requires manual intervention or a reconciliation background job
      }

      // Record failure in job (though job update failed, we try to set status if possible, or just log)
      try {
        await this.recordJobPaymentFailure(jobId);
      } catch (e) { /* ignore */ }

      throw new Error('System error during payment processing. Any deducted funds have been refunded. Please try again.');
    }
  }

  /**
   * Process commission after successful payment (wrapper)
   */
  private static async processCommission(companyId: string, amount: number, jobTitle: string, jobId: string, servicePackage: string) {
    try {
      const { CommissionService } = await import('../hrm8/CommissionService');
      await CommissionService.processSalesCommission(
        companyId,
        amount,
        `Commission for Job Posting: ${jobTitle} (${servicePackage})`,
        jobId,
        undefined,
        'JOB_PAYMENT'
      );
      console.log(`✅ [JobPaymentService] Commission processed for job: ${jobId}`);
    } catch (error) {
      console.error('❌ [JobPaymentService] Failed to process commission:', error);
    }
  }

}



