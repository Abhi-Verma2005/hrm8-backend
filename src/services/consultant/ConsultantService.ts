/**
 * Consultant Service
 * Handles consultant self-service operations
 */

import { ConsultantModel, ConsultantData } from '../../models/Consultant';
import { AvailabilityStatus } from '@prisma/client';
import { JobAllocationService } from '../hrm8/JobAllocationService';
import { CommissionService } from '../hrm8/CommissionService';
import { JobModel } from '../../models/Job';
import { Job } from '../../types';

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
   * Get consultant's assigned jobs (returns job IDs)
   */
  static async getAssignedJobIds(consultantId: string): Promise<string[]> {
    return await JobAllocationService.getConsultantJobs(consultantId);
  }

  /**
   * Get consultant's assigned jobs with full details
   */
  static async getAssignedJobs(consultantId: string): Promise<Job[]> {
    const jobIds = await JobAllocationService.getConsultantJobs(consultantId);
    const jobs: Job[] = [];
    
    for (const jobId of jobIds) {
      try {
        const job = await JobModel.findById(jobId);
        if (job) {
          const pipeline = await JobAllocationService.getPipelineForConsultantJob(consultantId, jobId);
          jobs.push({
            ...job,
            ...(pipeline && { pipeline }),
          });
        }
      } catch (error) {
        // Skip jobs that can't be fetched (e.g., deleted)
        console.error(`Failed to fetch job ${jobId} for consultant ${consultantId}:`, error);
      }
    }
    
    return jobs;
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



