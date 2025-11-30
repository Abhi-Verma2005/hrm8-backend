/**
 * Regional Revenue Service
 * Handles regional revenue tracking
 */

import { RegionalRevenueModel, RegionalRevenueData } from '../../models/RegionalRevenue';
import { RevenueStatus } from '@prisma/client';

export class RegionalRevenueService {
  /**
   * Create a new regional revenue record
   */
  static async createRevenue(revenueData: {
    regionId: string;
    licenseeId?: string;
    periodStart: Date;
    periodEnd: Date;
    totalRevenue: number;
    licenseeShare: number;
    hrm8Share: number;
  }): Promise<RegionalRevenueData> {
    return await RegionalRevenueModel.create(revenueData);
  }

  /**
   * Get all revenue records with filters
   */
  static async getAllRevenue(filters?: {
    regionId?: string;
    licenseeId?: string;
    status?: RevenueStatus;
    periodStart?: Date;
    periodEnd?: Date;
  }): Promise<RegionalRevenueData[]> {
    return await RegionalRevenueModel.findAll(filters);
  }

  /**
   * Get revenue by ID
   */
  static async getRevenueById(id: string): Promise<RegionalRevenueData | null> {
    return await RegionalRevenueModel.findById(id);
  }

  /**
   * Get revenue by region ID
   */
  static async getRegionalRevenue(
    regionId: string,
    filters?: {
      status?: RevenueStatus;
      periodStart?: Date;
      periodEnd?: Date;
    }
  ): Promise<RegionalRevenueData[]> {
    return await RegionalRevenueModel.findByRegionId(regionId, filters);
  }

  /**
   * Get revenue by licensee ID
   */
  static async getLicenseeRevenue(
    licenseeId: string,
    filters?: {
      status?: RevenueStatus;
    }
  ): Promise<RegionalRevenueData[]> {
    return await RegionalRevenueModel.findByLicenseeId(licenseeId, filters);
  }

  /**
   * Confirm revenue
   */
  static async confirmRevenue(id: string): Promise<RegionalRevenueData> {
    return await RegionalRevenueModel.confirm(id);
  }

  /**
   * Mark revenue as paid
   */
  static async markAsPaid(id: string): Promise<RegionalRevenueData> {
    return await RegionalRevenueModel.markAsPaid(id);
  }
}



