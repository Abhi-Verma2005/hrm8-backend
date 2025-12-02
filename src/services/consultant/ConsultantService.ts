/**
 * Consultant Service
 * Handles consultant self-service operations
 */

import { ConsultantModel, ConsultantData } from '../../models/Consultant';
import { AvailabilityStatus } from '@prisma/client';
import { JobAllocationService } from '../hrm8/JobAllocationService';
import { CommissionService } from '../hrm8/CommissionService';

export class ConsultantService {
  /**
   * Get consultant profile
   */
  static async getProfile(consultantId: string): Promise<ConsultantData | null> {
    return await ConsultantModel.findById(consultantId);
  }

  /**
   * Update consultant profile (allowed fields only)
   */
  static async updateProfile(
    consultantId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      photo?: string;
      address?: string;
      city?: string;
      stateProvince?: string;
      country?: string;
      languages?: Array<{ language: string; proficiency: string }>;
      industryExpertise?: string[];
      resumeUrl?: string;
      paymentMethod?: Record<string, unknown>;
      taxInformation?: Record<string, unknown>;
      availability?: AvailabilityStatus;
    }
  ): Promise<ConsultantData> {
    return await ConsultantModel.update(consultantId, data);
  }

  /**
   * Get consultant's assigned jobs
   */
  static async getAssignedJobs(consultantId: string): Promise<string[]> {
    return await JobAllocationService.getConsultantJobs(consultantId);
  }

  /**
   * Get consultant's commissions
   */
  static async getCommissions(consultantId: string, filters?: {
    status?: string;
    type?: string;
    commissionType?: string; // Backward compatibility
  }): Promise<any[]> {
    const typeFilter = filters?.type || filters?.commissionType;
    const commissions = await CommissionService.getConsultantCommissions(consultantId, {
      status: filters?.status as any,
      type: typeFilter as any,
    });
    return commissions;
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics(consultantId: string): Promise<{
    totalPlacements: number;
    totalRevenue: number;
    successRate: number;
    averageDaysToFill?: number;
    pendingCommissions: number;
    totalCommissionsPaid: number;
  }> {
    const consultant = await ConsultantModel.findById(consultantId);
    if (!consultant) {
      throw new Error('Consultant not found');
    }

    return {
      totalPlacements: consultant.totalPlacements,
      totalRevenue: consultant.totalRevenue,
      successRate: consultant.successRate,
      averageDaysToFill: consultant.averageDaysToFill,
      pendingCommissions: consultant.pendingCommissions,
      totalCommissionsPaid: consultant.totalCommissionsPaid,
    };
  }
}



