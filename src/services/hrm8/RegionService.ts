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

  /**
   * Get transfer impact analysis - counts entities that would be transferred
   */
  static async getTransferImpact(id: string): Promise<{
    companies: number;
    jobs: number;
    consultants: number;
    openInvoices: number;
    opportunities: number;
  } | { error: string; status: number }> {
    try {
      const region = await RegionModel.findById(id);
      if (!region) {
        return { error: 'Region not found', status: 404 };
      }

      // Count entities in this region
      // Ideally use the singleton instance if available, but for now importing dynamic to avoid circular dep issues in service if any
      const { default: prisma } = await import('../../lib/prisma');

      const [companies, jobs, consultants, openInvoices, opportunities] = await Promise.all([
        prisma.company.count({ where: { region_id: id } }),
        prisma.job.count({ where: { region_id: id, status: { in: ['DRAFT', 'OPEN', 'ON_HOLD'] } } }),
        prisma.consultant.count({ where: { region_id: id, status: 'ACTIVE' } }),
        prisma.bill.count({ where: { region_id: id, status: { in: ['PENDING', 'OVERDUE'] } } }),
        prisma.opportunity.count({
          where: {
            company: { region_id: id },
            stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] }
          }
        }),
      ]);

      return {
        companies,
        jobs,
        consultants,
        openInvoices,
        opportunities,
      };
    } catch (error) {
      console.error('Get transfer impact error:', error);
      return { error: 'Failed to calculate transfer impact', status: 500 };
    }
  }

  /**
   * Transfer region ownership to a new licensee
   */
  static async transferOwnership(
    regionId: string,
    targetLicenseeId: string,
    options?: { auditNote?: string; performedBy?: string }
  ): Promise<{ region: RegionData; transferredCounts: Record<string, number> } | { error: string; status: number }> {
    try {
      const region = await RegionModel.findById(regionId);
      if (!region) {
        return { error: 'Region not found', status: 404 };
      }

      // Get impact first
      const impact = await this.getTransferImpact(regionId);
      if ('error' in impact) {
        return impact;
      }

      // Update region with new licensee
      const updatedRegion = await RegionModel.update(regionId, {
        licenseeId: targetLicenseeId,
        ownerType: 'LICENSEE' as RegionOwnerType,
      });

      // Log the transfer (audit)
      console.log(`Region ${regionId} transferred to licensee ${targetLicenseeId}`, {
        auditNote: options?.auditNote,
        performedBy: options?.performedBy,
        transferredCounts: impact,
      });

      return {
        region: updatedRegion,
        transferredCounts: {
          companies: impact.companies,
          jobs: impact.jobs,
          consultants: impact.consultants,
          openInvoices: impact.openInvoices,
          opportunities: impact.opportunities,
        },
      };
    } catch (error) {
      console.error('Transfer ownership error:', error);
      return { error: 'Failed to transfer region ownership', status: 500 };
    }
  }
}
