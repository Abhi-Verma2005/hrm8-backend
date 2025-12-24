/**
 * Job Payment Service
 * Handles job-specific payment logic
 */

import { JobModel } from '../../models/Job';
import { UPGRADE_PRICE_MAP } from './StripeUpgradeService';
import prisma from '../../lib/prisma';
import { PaymentStatus } from '@prisma/client';

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

    const packageKey = servicePackage === 'executive-search' ? 'executive_search' : servicePackage;
    const priceInfo = UPGRADE_PRICE_MAP[packageKey as keyof typeof UPGRADE_PRICE_MAP];
    
    if (!priceInfo) {
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

    console.log('💳 Creating job checkout session:', { jobId, servicePackage, companyId });

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

    console.log('💰 Payment info:', paymentInfo);

    // Import Stripe dynamically
    const Stripe = (await import('stripe')).default;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    const stripe = new Stripe(stripeSecretKey);

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
          stripeSessionId: session.id,
          paymentStatus: PaymentStatus.PENDING,
          servicePackage,
          paymentAmount: paymentInfo.amount,
          paymentCurrency: paymentInfo.currency,
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
        paymentStatus: PaymentStatus.PAID,
        stripeSessionId,
        stripePaymentIntentId: stripePaymentIntentId || undefined,
        paymentAmount: amount,
        paymentCurrency: currency,
        paymentCompletedAt: new Date(),
        paymentFailedAt: null,
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
        paymentStatus: PaymentStatus.FAILED,
        paymentFailedAt: new Date(),
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
      select: {
        paymentStatus: true,
        servicePackage: true,
        paymentAmount: true,
        paymentCurrency: true,
        paymentCompletedAt: true,
      },
    });

    if (!prismaJob) {
      throw new Error('Job not found');
    }

    return {
      paymentStatus: prismaJob.paymentStatus,
      servicePackage: prismaJob.servicePackage,
      paymentAmount: prismaJob.paymentAmount,
      paymentCurrency: prismaJob.paymentCurrency,
      paymentCompletedAt: prismaJob.paymentCompletedAt,
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
        servicePackage: true,
        paymentStatus: true,
      },
    });

    if (!prismaJob) {
      return false;
    }

    // Self-managed jobs can always be published
    if (prismaJob.servicePackage === 'self-managed' || !prismaJob.servicePackage) {
      return true;
    }

    // Paid packages require payment
    return prismaJob.paymentStatus === PaymentStatus.PAID;
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
}




