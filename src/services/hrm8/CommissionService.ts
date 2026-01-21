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
        type: CommissionType.PLACEMENT,
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
   * Process generic sales commission (for both Job Payments and Subscription Upgrades)
   * Handles:
   * 1. Checking attribution expiry (12-month rule)
   * 2. Creating commission record (idempotent)
   * 3. Locking attribution if not locked
   * 4. Closing related opportunity
   */
  static async processSalesCommission(
    companyId: string,
    amount: number, // Payment amount in dollars
    description: string,
    jobId?: string,
    subscriptionId?: string,
    _eventType: 'JOB_PAYMENT' | 'SUBSCRIPTION_SALE' = 'SUBSCRIPTION_SALE'
  ): Promise<{ success: boolean; commissionId?: string; error?: string }> {
    try {
      // Lazy load to avoid circular dependencies
      const { CommissionModel } = await import('../../models/Commission');
      const { CompanyModel } = await import('../../models/Company');
      const { ConsultantModel } = await import('../../models/Consultant');
      const { AttributionService } = await import('../sales/AttributionService');
      const { differenceInMonths } = await import('date-fns');

      const company = await CompanyModel.findById(companyId);
      if (!company) {
        return { success: false, error: 'Company not found' };
      }

      let salesAgentId = company.salesAgentId;

      // Auto-repair: If company has no sales_agent_id, try to find it from the converted lead
      if (!salesAgentId) {
        const prisma = (await import('../../lib/prisma')).default;
        const lead = await prisma.lead.findFirst({
          where: { converted_to_company_id: companyId },
          select: { referred_by: true, assigned_consultant_id: true }
        });

        if (lead) {
          // Prefer assigned_consultant_id (Sales Agent), fallback to referred_by (Partner/Referrer)
          const repairAgentId = lead.assigned_consultant_id || lead.referred_by;
          if (repairAgentId) {
            // Update company with the repaired sales_agent_id
            await prisma.company.update({
              where: { id: companyId },
              data: { sales_agent_id: repairAgentId }
            });
            salesAgentId = repairAgentId;
            console.log(`🔧 Auto-repaired company ${companyId}: set sales_agent_id to ${repairAgentId}`);
          }
        }
      }

      if (!salesAgentId) {
        return { success: false, error: 'No sales agent assigned to company' };
      }

      // Determine commission type based on event
      const commissionType = _eventType === 'JOB_PAYMENT'
        ? CommissionType.RECRUITMENT_SERVICE
        : CommissionType.SUBSCRIPTION_SALE;

      // Check for existing commissions (idempotency)
      const existingFilters: any = {
        consultantId: salesAgentId,
        type: commissionType
      };
      if (jobId) existingFilters.jobId = jobId;
      if (subscriptionId) existingFilters.subscriptionId = subscriptionId;

      // Note: For subscription upgrades without a unique ID (just companyId time-based), 
      // strict idempotency might be tricky, but usually upgrades happen once per month max.
      // We rely on caller to pass specific IDs if possible.

      const existingCommissions = await CommissionModel.findAll(existingFilters);

      // If passing specific job/sub ID, check duplicate strictly
      if ((jobId || subscriptionId) && existingCommissions.length > 0) {
        console.log(`⏭️ Commission already exists for job/subscription: ${jobId || subscriptionId}`);
        return { success: true, commissionId: existingCommissions[0].id, error: 'Commission already exists' };
      }

      // Check attribution expiry (12-month rule)
      if (company.attributionLockedAt) {
        const monthsSinceLock = differenceInMonths(new Date(), new Date(company.attributionLockedAt));
        if (monthsSinceLock >= 12) {

          return { success: false, error: 'Attribution expired' };
        }
      }

      // Fetch sales agent for dynamic rate
      const salesAgent = await ConsultantModel.findById(salesAgentId!);
      const commissionRate = salesAgent?.defaultCommissionRate || 0.10; // Default 10%
      const commissionAmount = Math.round(amount * commissionRate * 100) / 100;

      // Create Commission
      const commission = await CommissionModel.create({
        consultantId: salesAgentId!,
        regionId: company.regionId || '', // Should ideally have region
        jobId,
        subscriptionId,
        type: commissionType,
        amount: commissionAmount,
        rate: commissionRate,
        status: CommissionStatus.CONFIRMED,
        description: description,
      });

      // console.log(`✅ Created sales commission ${commission.id}: $${commissionAmount} (${commissionRate * 100}%)`);

      // Auto-lock attribution on first payment
      if (!company.attributionLocked) {
        await AttributionService.lockAttribution(companyId);

      }

      // Close related Opportunity if exists and is open
      // We try to find an open opportunity for this company
      try {
        const openOpportunities = await prisma.opportunity.findMany({
          where: {
            company_id: companyId,
            stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] }
          }
        });

        if (openOpportunities.length > 0) {
          // Close the first applicable one (usually 'Initial Deal' or similar)
          await prisma.opportunity.update({
            where: { id: openOpportunities[0].id },
            data: {
              stage: 'CLOSED_WON',
              amount: amount, // Update amount to actual deal value
              closed_at: new Date()
            }
          });
          console.log(`🎉 Closed opportunity ${openOpportunities[0].id} as WON`);
        }
      } catch (oppError) {
        console.error('Error closing opportunity:', oppError);
      }

      return { success: true, commissionId: commission.id };

    } catch (error: any) {
      console.error('Process sales commission error:', error);
      return { success: false, error: error.message };
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
