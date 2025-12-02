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
        regionId: revenueData.regionId,
        licenseeId: revenueData.licenseeId,
        periodStart: revenueData.periodStart,
        periodEnd: revenueData.periodEnd,
        totalRevenue: revenueData.totalRevenue,
        licenseeShare: revenueData.licenseeShare,
        hrm8Share: revenueData.hrm8Share,
        status: revenueData.status || RevenueStatus.PENDING,
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
        regionId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.periodStart && {
          periodStart: {
            gte: filters.periodStart,
          },
        }),
        ...(filters?.periodEnd && {
          periodEnd: {
            lte: filters.periodEnd,
          },
        }),
      },
      orderBy: { periodStart: 'desc' },
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
        licenseeId,
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { periodStart: 'desc' },
    });

    return revenues.map((revenue) => this.mapPrismaToRevenue(revenue));
  }

  /**
   * Find all revenue with filters
   */
  static async findAll(filters?: {
    regionId?: string;
    licenseeId?: string;
    status?: RevenueStatus;
    periodStart?: Date;
    periodEnd?: Date;
  }): Promise<RegionalRevenueData[]> {
    const revenues = await prisma.regionalRevenue.findMany({
      where: {
        ...(filters?.regionId && { regionId: filters.regionId }),
        ...(filters?.licenseeId && { licenseeId: filters.licenseeId }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.periodStart && {
          periodStart: {
            gte: filters.periodStart,
          },
        }),
        ...(filters?.periodEnd && {
          periodEnd: {
            lte: filters.periodEnd,
          },
        }),
      },
      orderBy: { periodStart: 'desc' },
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
        ...(data.totalRevenue !== undefined && { totalRevenue: data.totalRevenue }),
        ...(data.licenseeShare !== undefined && { licenseeShare: data.licenseeShare }),
        ...(data.hrm8Share !== undefined && { hrm8Share: data.hrm8Share }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.paidAt !== undefined && { paidAt: data.paidAt }),
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
      regionId: prismaRevenue.regionId,
      licenseeId: prismaRevenue.licenseeId || undefined,
      periodStart: prismaRevenue.periodStart,
      periodEnd: prismaRevenue.periodEnd,
      totalRevenue: prismaRevenue.totalRevenue,
      licenseeShare: prismaRevenue.licenseeShare,
      hrm8Share: prismaRevenue.hrm8Share,
      status: prismaRevenue.status,
      paidAt: prismaRevenue.paidAt || undefined,
      createdAt: prismaRevenue.createdAt,
      updatedAt: prismaRevenue.updatedAt,
    };
  }
}

