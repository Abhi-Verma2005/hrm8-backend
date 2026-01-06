/**
 * RegionalRevenue Model
 * Represents revenue tracking per region
 */

import prisma from '../lib/prisma';
import { RevenueStatus } from '@prisma/client';

export interface RegionalRevenueData {
  id: string;
  regionId: string;
  licenseeId?: string;
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  licenseeShare: number;
  hrm8Share: number;
  status: RevenueStatus;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class RegionalRevenueModel {
  /**
   * Create a new regional revenue record
   */
  static async create(revenueData: {
    regionId: string;
    licenseeId?: string;
    periodStart: Date;
    periodEnd: Date;
    totalRevenue: number;
    licenseeShare: number;
    hrm8Share: number;
    status?: RevenueStatus;
  }): Promise<RegionalRevenueData> {
    const revenue = await prisma.regionalRevenue.create({
      data: {
        region_id: revenueData.regionId,
        licensee_id: revenueData.licenseeId,
        period_start: revenueData.periodStart,
        period_end: revenueData.periodEnd,
        total_revenue: revenueData.totalRevenue,
        licensee_share: revenueData.licenseeShare,
        hrm8_share: revenueData.hrm8Share,
        status: revenueData.status || RevenueStatus.PENDING,
        updated_at: new Date(),
      },
    });

    return this.mapPrismaToRevenue(revenue);
  }

  /**
   * Find revenue by ID
   */
  static async findById(id: string): Promise<RegionalRevenueData | null> {
    const revenue = await prisma.regionalRevenue.findUnique({
      where: { id },
    });

    return revenue ? this.mapPrismaToRevenue(revenue) : null;
  }

  /**
   * Find revenue by region ID
   */
  static async findByRegionId(
    regionId: string,
    filters?: {
      status?: RevenueStatus;
      periodStart?: Date;
      periodEnd?: Date;
    }
  ): Promise<RegionalRevenueData[]> {
    const revenues = await prisma.regionalRevenue.findMany({
      where: {
        region_id: regionId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.periodStart && {
          period_start: {
            gte: filters.periodStart,
          },
        }),
        ...(filters?.periodEnd && {
          period_end: {
            lte: filters.periodEnd,
          },
        }),
      },
      orderBy: { period_start: 'desc' },
    });

    return revenues.map((revenue) => this.mapPrismaToRevenue(revenue));
  }

  /**
   * Find revenue by licensee ID
   */
  static async findByLicenseeId(
    licenseeId: string,
    filters?: {
      status?: RevenueStatus;
    }
  ): Promise<RegionalRevenueData[]> {
    const revenues = await prisma.regionalRevenue.findMany({
      where: {
        licensee_id: licenseeId,
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { period_start: 'desc' },
    });

    return revenues.map((revenue) => this.mapPrismaToRevenue(revenue));
  }

  /**
   * Find all revenue with filters
   */
  static async findAll(filters?: {
    regionId?: string;
    regionIds?: string[];
    licenseeId?: string;
    status?: RevenueStatus;
    periodStart?: Date;
    periodEnd?: Date;
  }): Promise<RegionalRevenueData[]> {
    const revenues = await prisma.regionalRevenue.findMany({
      where: {
        ...(filters?.regionId && { region_id: filters.regionId }),
        ...(filters?.regionIds && { region_id: { in: filters.regionIds } }),
        ...(filters?.licenseeId && { licensee_id: filters.licenseeId }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.periodStart && {
          period_start: {
            gte: filters.periodStart,
          },
        }),
        ...(filters?.periodEnd && {
          period_end: {
            lte: filters.periodEnd,
          },
        }),
      },
      orderBy: { period_start: 'desc' },
    });

    return revenues.map((revenue) => this.mapPrismaToRevenue(revenue));
  }

  /**
   * Update revenue
   */
  static async update(id: string, data: Partial<RegionalRevenueData>): Promise<RegionalRevenueData> {
    const revenue = await prisma.regionalRevenue.update({
      where: { id },
      data: {
        ...(data.totalRevenue !== undefined && { total_revenue: data.totalRevenue }),
        ...(data.licenseeShare !== undefined && { licensee_share: data.licenseeShare }),
        ...(data.hrm8Share !== undefined && { hrm8_share: data.hrm8Share }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.paidAt !== undefined && { paid_at: data.paidAt }),
        updated_at: new Date(),
      },
    });

    return this.mapPrismaToRevenue(revenue);
  }

  /**
   * Confirm revenue
   */
  static async confirm(id: string): Promise<RegionalRevenueData> {
    return await this.update(id, {
      status: RevenueStatus.CONFIRMED,
    });
  }

  /**
   * Mark revenue as paid
   */
  static async markAsPaid(id: string): Promise<RegionalRevenueData> {
    return await this.update(id, {
      status: RevenueStatus.PAID,
      paidAt: new Date(),
    });
  }

  /**
   * Map Prisma revenue to RegionalRevenueData interface
   */
  private static mapPrismaToRevenue(prismaRevenue: any): RegionalRevenueData {
    return {
      id: prismaRevenue.id,
      regionId: prismaRevenue.region_id,
      licenseeId: prismaRevenue.licensee_id || undefined,
      periodStart: prismaRevenue.period_start,
      periodEnd: prismaRevenue.period_end,
      totalRevenue: prismaRevenue.total_revenue,
      licenseeShare: prismaRevenue.licensee_share,
      hrm8Share: prismaRevenue.hrm8_share,
      status: prismaRevenue.status,
      paidAt: prismaRevenue.paid_at || undefined,
      createdAt: prismaRevenue.created_at,
      updatedAt: prismaRevenue.updated_at,
    };
  }
}

