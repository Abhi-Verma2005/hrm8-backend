/**
 * Commission Model
 * Represents commission tracking per consultant
 */

import prisma from '../lib/prisma';
import { CommissionStatus, CommissionType } from '@prisma/client';

export interface CommissionData {
  id: string;
  consultantId: string;
  regionId: string;
  jobId?: string | null;
  subscriptionId?: string | null;
  type: CommissionType;
  amount: number;
  rate?: number | null;
  description?: string | null;
  status: CommissionStatus;
  confirmedAt?: Date | null;
  paidAt?: Date | null;
  commissionExpiryDate?: Date | null;
  paymentReference?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CommissionModel {
  /**
   * Create a new commission
   */
  static async create(commissionData: {
    consultantId: string;
    regionId: string;
    jobId?: string | null;
    subscriptionId?: string | null;
    type: CommissionType;
    amount: number;
    rate?: number | null;
    status?: CommissionStatus;
    description?: string | null;
    commissionExpiryDate?: Date | null;
    notes?: string | null;
  }): Promise<CommissionData> {
    const commission = await prisma.commission.create({
      data: {
        consultant_id: commissionData.consultantId,
        region_id: commissionData.regionId,
        job_id: commissionData.jobId || null,
        subscription_id: commissionData.subscriptionId || null,
        type: commissionData.type,
        amount: commissionData.amount,
        rate: commissionData.rate || null,
        status: commissionData.status || CommissionStatus.PENDING,
        description: commissionData.description || null,
        commission_expiry_date: commissionData.commissionExpiryDate || null,
        notes: commissionData.notes || null,
      },
    });

    return this.mapPrismaToCommission(commission);
  }

  /**
   * Find commission by ID
   */
  static async findById(id: string): Promise<CommissionData | null> {
    const commission = await prisma.commission.findUnique({
      where: { id },
    });

    return commission ? this.mapPrismaToCommission(commission) : null;
  }

  /**
   * Find commissions by consultant ID
   */
  static async findByConsultantId(
    consultantId: string,
    filters?: {
      status?: CommissionStatus;
      type?: CommissionType;
    }
  ): Promise<CommissionData[]> {
    const commissions = await prisma.commission.findMany({
      where: {
        consultant_id: consultantId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.type && { type: filters.type }),
      },
      orderBy: { created_at: 'desc' },
    });

    return commissions.map((commission) => this.mapPrismaToCommission(commission));
  }

  /**
   * Find commissions by region ID
   */
  static async findByRegionId(
    regionId: string,
    filters?: {
      status?: CommissionStatus;
    }
  ): Promise<CommissionData[]> {
    const commissions = await prisma.commission.findMany({
      where: {
        region_id: regionId,
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { created_at: 'desc' },
    });

    return commissions.map((commission) => this.mapPrismaToCommission(commission));
  }

  /**
   * Find all commissions with filters
   */
  static async findAll(filters?: {
    consultantId?: string;
    regionId?: string;
    jobId?: string;
    status?: CommissionStatus;
    type?: CommissionType;
  }): Promise<CommissionData[]> {
    const commissions = await prisma.commission.findMany({
      where: {
        ...(filters?.consultantId && { consultant_id: filters.consultantId }),
        ...(filters?.regionId && { region_id: filters.regionId }),
        ...(filters?.jobId && { job_id: filters.jobId }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.type && { type: filters.type }),
      },
      orderBy: { created_at: 'desc' },
    });

    return commissions.map((commission) => this.mapPrismaToCommission(commission));
  }

  /**
   * Update commission
   */
  static async update(id: string, data: Partial<CommissionData>): Promise<CommissionData> {
    const commission = await prisma.commission.update({
      where: { id },
      data: {
        ...(data.consultantId !== undefined && { consultant_id: data.consultantId }),
        ...(data.regionId !== undefined && { region_id: data.regionId }),
        ...(data.jobId !== undefined && { job_id: data.jobId || null }),
        ...(data.subscriptionId !== undefined && { subscription_id: data.subscriptionId || null }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.rate !== undefined && { rate: data.rate || null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.confirmedAt !== undefined && { confirmed_at: data.confirmedAt || null }),
        ...(data.paidAt !== undefined && { paid_at: data.paidAt || null }),
        ...(data.commissionExpiryDate !== undefined && { commission_expiry_date: data.commissionExpiryDate || null }),
        ...(data.paymentReference !== undefined && { payment_reference: data.paymentReference || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
    });

    return this.mapPrismaToCommission(commission);
  }

  /**
   * Confirm commission
   */
  static async confirm(id: string): Promise<CommissionData> {
    return await this.update(id, {
      status: CommissionStatus.CONFIRMED,
      confirmedAt: new Date(),
    });
  }

  /**
   * Mark commission as paid
   */
  static async markAsPaid(id: string, paymentReference?: string): Promise<CommissionData> {
    return await this.update(id, {
      status: CommissionStatus.PAID,
      paidAt: new Date(),
      paymentReference: paymentReference || null,
    });
  }

  /**
   * Cancel commission
   */
  static async cancel(id: string): Promise<CommissionData> {
    return await this.update(id, {
      status: CommissionStatus.CANCELLED,
    });
  }

  /**
   * Map Prisma commission to CommissionData interface
   */
  private static mapPrismaToCommission(prismaCommission: any): CommissionData {
    return {
      id: prismaCommission.id,
      consultantId: prismaCommission.consultant_id,
      regionId: prismaCommission.region_id,
      jobId: prismaCommission.job_id || undefined,
      subscriptionId: prismaCommission.subscription_id || undefined,
      type: prismaCommission.type,
      amount: prismaCommission.amount,
      rate: prismaCommission.rate || undefined,
      description: prismaCommission.description || undefined,
      status: prismaCommission.status,
      confirmedAt: prismaCommission.confirmed_at || undefined,
      paidAt: prismaCommission.paid_at || undefined,
      commissionExpiryDate: prismaCommission.commission_expiry_date || undefined,
      paymentReference: prismaCommission.payment_reference || undefined,
      notes: prismaCommission.notes || undefined,
      createdAt: prismaCommission.created_at,
      updatedAt: prismaCommission.updated_at,
    };
  }
}

