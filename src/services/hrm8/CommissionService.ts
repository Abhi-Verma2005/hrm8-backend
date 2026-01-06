/**
 * Commission Service
 * Handles commission calculation and tracking for consultants managing jobs
 */

import { CommissionModel } from '../../models/Commission';
import { JobModel } from '../../models/Job';
import prisma from '../../lib/prisma';
import { CommissionStatus, CommissionType } from '@prisma/client';
import { HiringMode } from '../../types';
import { differenceInMonths } from 'date-fns';

// Commission rates as percentage of service fee
const COMMISSION_RATES = {
  SHORTLISTING: 0.15, // 15% of shortlisting service fee ($1,990)
  FULL_SERVICE: 0.20, // 20% of full-service fee ($5,990)
  EXECUTIVE_SEARCH: 0.25, // 25% of executive search fee
  SUBSCRIPTION: 0.20, // 20% of subscription revenue
} as const;

// Service fee amounts (in USD)
const SERVICE_FEES = {
  SHORTLISTING: 1990,
  FULL_SERVICE: 5990,
  EXECUTIVE_SEARCH_UNDER_100K: 9990,
  EXECUTIVE_SEARCH_OVER_100K: 14990,
} as const;

export class CommissionService {
  /**
   * Calculate commission amount based on hiring mode and service fee
   */
  static calculateCommissionAmount(
    hiringMode: HiringMode,
    serviceFee?: number
  ): { amount: number; rate: number } {
    // Self-managed jobs don't generate commissions
    if (hiringMode === 'SELF_MANAGED') {
      return { amount: 0, rate: 0 };
    }

    let baseFee: number;
    let rate: number;

    switch (hiringMode) {
      case 'SHORTLISTING':
        baseFee = serviceFee || SERVICE_FEES.SHORTLISTING;
        rate = COMMISSION_RATES.SHORTLISTING;
        break;
      case 'FULL_SERVICE':
        baseFee = serviceFee || SERVICE_FEES.FULL_SERVICE;
        rate = COMMISSION_RATES.FULL_SERVICE;
        break;
      case 'EXECUTIVE_SEARCH':
        // Executive search fee depends on salary range, use average if not provided
        baseFee = serviceFee || SERVICE_FEES.EXECUTIVE_SEARCH_UNDER_100K;
        rate = COMMISSION_RATES.EXECUTIVE_SEARCH;
        break;
      default:
        return { amount: 0, rate: 0 };
    }

    const commissionAmount = baseFee * rate;
    return { amount: Math.round(commissionAmount * 100) / 100, rate };
  }

  /**
   * Process commission for a subscription payment (Bill)
   */
  static async processSubscriptionPayment(billId: string): Promise<{ success: boolean; commissionId?: string; error?: string }> {
    try {
      const bill = await prisma.bill.findUnique({
        where: { id: billId },
        include: { subscription: true }
      });

      if (!bill || !bill.subscription) {
        return { success: false, error: 'Bill or Subscription not found' };
      }

      const subscription = bill.subscription;
      
      // Check if subscription has a sales agent
      if (!subscription.sales_agent_id) {
        return { success: false, error: 'No sales agent assigned to subscription' };
      }

      // Check if commission period is valid (12 months from start)
      const monthsSinceStart = differenceInMonths(new Date(), subscription.start_date);
      if (monthsSinceStart > 12) {
        return { success: false, error: 'Commission period expired (over 12 months)' };
      }

      const amount = bill.total_amount * COMMISSION_RATES.SUBSCRIPTION;
      if (amount <= 0) {
        return { success: false, error: 'Commission amount is zero or negative' };
      }

      // Create Commission
      // Use consultant's region? Or company's region?
      // Consultant table has region_id.
      const consultant = await prisma.consultant.findUnique({
        where: { id: subscription.sales_agent_id }
      });

      if (!consultant) {
        return { success: false, error: 'Consultant not found' };
      }

      const commission = await CommissionModel.create({
        consultantId: subscription.sales_agent_id,
        regionId: consultant.region_id,
        subscriptionId: subscription.id,
        type: CommissionType.SUBSCRIPTION_SALE,
        amount: Math.round(amount * 100) / 100,
        rate: COMMISSION_RATES.SUBSCRIPTION,
        status: CommissionStatus.CONFIRMED, // Confirmed because bill is paid?
        description: `Commission for Subscription ${subscription.name} - Bill ${bill.bill_number}`,
        commissionExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // Just an example expiry?
      });

      return { success: true, commissionId: commission.id };

    } catch (error: any) {
      console.error('Process subscription commission error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create commission when job is assigned to consultant
   */
  static async createCommissionForJobAssignment(
    jobId: string,
    consultantId: string,
    regionId: string,
    serviceFee?: number
  ): Promise<{ success: boolean; commissionId?: string; error?: string }> {
    try {
      // Get job details
      const job = await JobModel.findById(jobId);
      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      // Only create commission for paid recruitment services (not self-managed)
      if (job.hiringMode === 'SELF_MANAGED') {
        return { success: false, error: 'Self-managed jobs do not generate commissions' };
      }

      // Calculate commission
      const { amount, rate } = this.calculateCommissionAmount(job.hiringMode, serviceFee);

      if (amount === 0) {
        return { success: false, error: 'No commission to create' };
      }

      // Check if commission already exists for this job
      const existingCommissions = await CommissionModel.findAll({
        jobId,
        consultantId,
      });

      if (existingCommissions.length > 0) {
        // Update existing commission if needed
        const existingCommission = existingCommissions[0];
        if (existingCommission.status === CommissionStatus.PENDING) {
          await CommissionModel.update(existingCommission.id, {
            amount,
            rate,
            description: `Commission for ${job.hiringMode} service - ${job.title}`,
          });
          return { success: true, commissionId: existingCommission.id };
        }
      }

      // Create new commission
      const commission = await CommissionModel.create({
        consultantId,
        regionId,
        jobId,
        type: CommissionType.PLACEMENT,
        amount,
        rate,
        status: CommissionStatus.PENDING,
        description: `Commission for ${job.hiringMode} service - ${job.title}`,
      });

      return { success: true, commissionId: commission.id };
    } catch (error: any) {
      console.error('Create commission error:', error);
      return { success: false, error: error.message || 'Failed to create commission' };
    }
  }

  /**
   * Confirm commission when job is completed/hired
   */
  static async confirmCommissionForJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const commissions = await CommissionModel.findAll({ jobId });

      for (const commission of commissions) {
        if (commission.status === CommissionStatus.PENDING) {
          await CommissionModel.confirm(commission.id);
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Confirm commission error:', error);
      return { success: false, error: error.message || 'Failed to confirm commission' };
    }
  }

  /**
   * Get commissions for a consultant
   */
  static async getConsultantCommissions(
    consultantId: string,
    filters?: {
      status?: CommissionStatus;
      type?: CommissionType;
    }
  ) {
    return await CommissionModel.findByConsultantId(consultantId, filters);
  }

  /**
   * Get all commissions (for HR admin dashboard)
   */
  static async getAllCommissions(filters?: {
    consultantId?: string;
    regionId?: string;
    regionIds?: string[];
    jobId?: string;
    status?: CommissionStatus;
    type?: CommissionType;
  }) {
    return await CommissionModel.findAll(filters);
  }

  /**
   * Process commission payment (mark as paid)
   */
  static async processPayment(
    commissionId: string,
    paymentReference: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const commission = await CommissionModel.findById(commissionId);
      if (!commission) {
        return { success: false, error: 'Commission not found' };
      }

      if (commission.status === CommissionStatus.PAID) {
        return { success: false, error: 'Commission already paid' };
      }

      await CommissionModel.markAsPaid(commissionId, paymentReference);
      return { success: true };
    } catch (error: any) {
      console.error('Process payment error:', error);
      return { success: false, error: error.message || 'Failed to process payment' };
    }
  }

  /**
   * Process multiple commission payments
   */
  static async processPayments(
    commissionIds: string[],
    paymentReference: string
  ): Promise<{ success: boolean; processed: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;

    for (const commissionId of commissionIds) {
      const result = await this.processPayment(commissionId, paymentReference);
      if (result.success) {
        processed++;
      } else {
        errors.push(`Commission ${commissionId}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      processed,
      errors,
    };
  }
}
