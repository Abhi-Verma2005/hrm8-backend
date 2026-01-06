/**
 * Region Service
 * Handles region business logic
 */

import { RegionModel, RegionData } from '../../models/Region';
import { RegionOwnerType } from '@prisma/client';

export class RegionService {
  /**
   * Create a new region
   */
  static async create(regionData: {
    name: string;
    code: string;
    country: string;
    stateProvince?: string;
    city?: string;
    boundaries?: Record<string, unknown>;
    ownerType?: RegionOwnerType;
    licenseeId?: string;
  }): Promise<RegionData | { error: string; status: number }> {
    try {
      // Check if code already exists
      const existing = await RegionModel.findByCode(regionData.code);
      if (existing) {
        return { error: 'Region code already exists', status: 409 };
      }

      const region = await RegionModel.create(regionData);
      return region;
    } catch (error: any) {
      if (error.code === 'P2002') {
        return { error: 'Region code already exists', status: 409 };
      }
      throw error;
    }
  }

  /**
   * Get region by ID
   */
  static async getById(id: string): Promise<RegionData | null> {
    return await RegionModel.findById(id);
  }

  /**
   * Get all regions with filters
   */
  static async getAll(filters?: {
    ownerType?: RegionOwnerType;
    licenseeId?: string;
    regionIds?: string[];
    isActive?: boolean;
    country?: string;
  }): Promise<RegionData[]> {
    return await RegionModel.findAll(filters);
  }

  /**
   * Update region
   */
  static async update(id: string, data: Partial<RegionData>): Promise<RegionData | { error: string; status: number }> {
    try {
      // If updating code, check uniqueness
      if (data.code) {
        const existing = await RegionModel.findByCode(data.code);
        if (existing && existing.id !== id) {
          return { error: 'Region code already exists', status: 409 };
        }
      }

      return await RegionModel.update(id, data);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return { error: 'Region code already exists', status: 409 };
      }
      throw error;
    }
  }

  /**
   * Delete region
   */
  static async delete(id: string): Promise<void | { error: string; status: number }> {
    try {
      const region = await RegionModel.findById(id);
      if (!region) {
        return { error: 'Region not found', status: 404 };
      }

      // Check if region has companies or jobs
      // This would require checking Company and Job models
      // For now, we'll allow deletion and let Prisma handle cascade

      await RegionModel.delete(id);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Assign licensee to region
   */
  static async assignLicensee(regionId: string, licenseeId: string): Promise<RegionData> {
    return await RegionModel.assignLicensee(regionId, licenseeId);
  }

  /**
   * Unassign licensee from region
   */
  static async unassignLicensee(regionId: string): Promise<RegionData> {
    return await RegionModel.unassignLicensee(regionId);
  }
}

