/**
 * Commission Service
 * Handles commission management
 */

import { CommissionModel, CommissionData } from '../../models/Commission';
import { CommissionStatus, CommissionType } from '@prisma/client';

export class CommissionService {
  /**
   * Create a new commission
   */
  static async createCommission(commissionData: {
    consultantId: string;
    regionId: string;
    jobId?: string | null;
    type: CommissionType;
    amount: number;
    rate?: number | null;
    description?: string | null;
    notes?: string | null;
  }): Promise<CommissionData> {
    return await CommissionModel.create(commissionData);
  }

  /**
   * Get all commissions with filters
   */
  static async getAllCommissions(filters?: {
    consultantId?: string;
    regionId?: string;
    jobId?: string;
    status?: CommissionStatus;
    type?: CommissionType;
  }): Promise<CommissionData[]> {
    return await CommissionModel.findAll(filters);
  }

  /**
   * Get commission by ID
   */
  static async getCommissionById(id: string): Promise<CommissionData | null> {
    return await CommissionModel.findById(id);
  }

  /**
   * Get commissions by consultant ID
   */
  static async getConsultantCommissions(
    consultantId: string,
    filters?: {
      status?: CommissionStatus;
      type?: CommissionType;
    }
  ): Promise<CommissionData[]> {
    return await CommissionModel.findByConsultantId(consultantId, filters);
  }

  /**
   * Get commissions by region ID
   */
  static async getRegionalCommissions(
    regionId: string,
    filters?: {
      status?: CommissionStatus;
    }
  ): Promise<CommissionData[]> {
    return await CommissionModel.findByRegionId(regionId, filters);
  }

  /**
   * Confirm commission
   */
  static async confirmCommission(id: string): Promise<CommissionData> {
    return await CommissionModel.confirm(id);
  }

  /**
   * Mark commission as paid
   */
  static async markAsPaid(id: string, paymentReference?: string): Promise<CommissionData> {
    return await CommissionModel.markAsPaid(id, paymentReference);
  }

  /**
   * Cancel commission
   */
  static async cancelCommission(id: string): Promise<CommissionData> {
    return await CommissionModel.cancel(id);
  }
}



