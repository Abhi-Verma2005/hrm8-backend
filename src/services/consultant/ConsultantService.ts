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
      linkedinUrl?: string;
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
  /**
   * Get consultant's assigned jobs with full details
   */
  static async getAssignedJobs(consultantId: string, filters?: { status?: string }): Promise<Job[]> {
    const jobIds = await JobAllocationService.getConsultantJobs(consultantId);
    const jobs: Job[] = [];

    for (const jobId of jobIds) {
      try {
        const job = await JobModel.findById(jobId);
        if (job) {
          // Filter by status if provided
          if (filters?.status && job.status !== filters.status) {
            continue;
          }

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
   * Get job details for consultant
   */
  static async getJobDetails(consultantId: string, jobId: string): Promise<any> {
    const job = await JobModel.findById(jobId);
    if (!job) {
      return null;
    }

    // Verify assignment
    const assignedIds = await JobAllocationService.getConsultantJobs(consultantId);
    if (!assignedIds.includes(jobId)) {
      throw new Error('Consultant is not assigned to this job');
    }

    const pipeline = await JobAllocationService.getPipelineForConsultantJob(consultantId, jobId);
    const team = await JobAllocationService.getJobConsultants(jobId);

    // Filter out current consultant from team
    const otherConsultants = team.filter(c => c.id !== consultantId);

    return {
      job,
      pipeline,
      team: otherConsultants,
      employer: { // Mock for now, should come from permissions
        contactName: "Confidential",
        email: "confidential@employer.com"
      }
    };
  }

  /**
   * Submit candidate shortlist
   */
  static async submitShortlist(consultantId: string, jobId: string, candidateIds: string[], notes?: string): Promise<void> {
    // Verify assignment
    const assignedIds = await JobAllocationService.getConsultantJobs(consultantId);
    if (!assignedIds.includes(jobId)) {
      throw new Error('Consultant is not assigned to this job');
    }

    await JobAllocationService.updatePipelineForConsultantJob(consultantId, jobId, {
      stage: 'SHORTLIST_SENT',
      note: `Shortlist submitted: ${candidateIds.length} candidates. Notes: ${notes || 'None'}`,
      updatedBy: consultantId
    });
  }

  /**
   * Flag job issue
   */
  static async flagJob(consultantId: string, jobId: string, issueType: string, description: string, severity: string): Promise<void> {
    // Verify assignment
    const assignedIds = await JobAllocationService.getConsultantJobs(consultantId);
    if (!assignedIds.includes(jobId)) {
      throw new Error('Consultant is not assigned to this job');
    }

    // In a real system, this would create a 'Flag' record. For now, we'll append to pipeline notes
    // or log it. Let's append to notes for simplicity in this MVP.
    await JobAllocationService.updatePipelineForConsultantJob(consultantId, jobId, {
      stage: 'ON_HOLD', // Potentially move to hold? Or just log? Let's keep stage but log.
      // Actually, let's just log it via updatePipeline note for now as we don't have a Flag model
      note: `[FLAG: ${severity}] ${issueType}: ${description}`,
      updatedBy: consultantId
    });
  }

  /**
   * Log job activity
   */
  static async logJobActivity(consultantId: string, jobId: string, activityType: string, notes: string): Promise<void> {
    // Verify assignment
    const assignedIds = await JobAllocationService.getConsultantJobs(consultantId);
    if (!assignedIds.includes(jobId)) {
      throw new Error('Consultant is not assigned to this job');
    }

    // Update pipeline updated_at and note
    await JobAllocationService.updatePipelineForConsultantJob(consultantId, jobId, {
      stage: (await JobAllocationService.getPipelineForConsultantJob(consultantId, jobId))?.stage || 'INTAKE',
      note: `[Activity: ${activityType}] ${notes}`,
      updatedBy: consultantId
    });
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



