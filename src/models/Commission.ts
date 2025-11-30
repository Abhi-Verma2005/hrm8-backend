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
  type: CommissionType;
  amount: number;
  rate?: number | null;
  description?: string | null;
  status: CommissionStatus;
  confirmedAt?: Date | null;
  paidAt?: Date | null;
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
    type: CommissionType;
    amount: number;
    rate?: number | null;
    status?: CommissionStatus;
    description?: string | null;
    notes?: string | null;
  }): Promise<CommissionData> {
    const commission = await prisma.commission.create({
      data: {
        consultantId: commissionData.consultantId,
        regionId: commissionData.regionId,
        jobId: commissionData.jobId || null,
        type: commissionData.type,
        amount: commissionData.amount,
        rate: commissionData.rate || null,
        status: commissionData.status || CommissionStatus.PENDING,
        description: commissionData.description || null,
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
        consultantId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.type && { type: filters.type }),
      },
      orderBy: { createdAt: 'desc' },
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
        regionId,
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { createdAt: 'desc' },
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
        ...(filters?.consultantId && { consultantId: filters.consultantId }),
        ...(filters?.regionId && { regionId: filters.regionId }),
        ...(filters?.jobId && { jobId: filters.jobId }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.type && { type: filters.type }),
      },
      orderBy: { createdAt: 'desc' },
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
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.rate !== undefined && { rate: data.rate || null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.confirmedAt !== undefined && { confirmedAt: data.confirmedAt || null }),
        ...(data.paidAt !== undefined && { paidAt: data.paidAt || null }),
        ...(data.paymentReference !== undefined && { paymentReference: data.paymentReference || null }),
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
  private static mapPrismaToCommission(prismaCommission: {
    id: string;
    consultantId: string;
    regionId: string;
    jobId: string | null;
    type: CommissionType;
    amount: number;
    rate: number | null;
    description: string | null;
    status: CommissionStatus;
    confirmedAt: Date | null;
    paidAt: Date | null;
    paymentReference: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CommissionData {
    return {
      id: prismaCommission.id,
      consultantId: prismaCommission.consultantId,
      regionId: prismaCommission.regionId,
      jobId: prismaCommission.jobId || undefined,
      type: prismaCommission.type,
      amount: prismaCommission.amount,
      rate: prismaCommission.rate || undefined,
      description: prismaCommission.description || undefined,
      status: prismaCommission.status,
      confirmedAt: prismaCommission.confirmedAt || undefined,
      paidAt: prismaCommission.paidAt || undefined,
      paymentReference: prismaCommission.paymentReference || undefined,
      notes: prismaCommission.notes || undefined,
      createdAt: prismaCommission.createdAt,
      updatedAt: prismaCommission.updatedAt,
    };
  }
}

