/**
 * Job Allocation Service
 * Handles job-to-consultant assignment
 * Note: Since it's 1:1 consultant:region, jobs in a region automatically belong to that region's consultant
 */

import { prisma } from '../../lib/prisma';
import { ConsultantModel, ConsultantData } from '../../models/Consultant';
import { ConsultantJobAssignmentModel } from '../../models/ConsultantJobAssignment';
import { JobModel } from '../../models/Job';
import { Job, JobStatus, HiringMode, WorkArrangement, EmploymentType } from '../../types';
import { AutoAssignmentService } from './AutoAssignmentService';
import { AssignmentSource, ConsultantRole, AvailabilityStatus } from '@prisma/client';

export class JobAllocationService {
  /**
   * Auto-assign job to best matching consultant
   */
  static async autoAssignJob(jobId: string): Promise<{ success: boolean; consultantId?: string; error?: string }> {
    try {
      const match = await AutoAssignmentService.findBestConsultantForJob(jobId);
      
      if (!match.consultantId) {
        return { success: false, error: match.reason || 'No suitable consultant found' };
      }

      // Assign using the system as the assigner
      const result = await this.assignJobToConsultant(
        jobId,
        match.consultantId,
        'system',
        AssignmentSource.AUTO_RULES
      );

      if (result.success) {
        return { success: true, consultantId: match.consultantId };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('Auto-assign job error:', error);
      return { success: false, error: error.message || 'Failed to auto-assign job' };
    }
  }

  /**
   * Assign job to consultant (by assigning job to consultant's region)
   */
  static async assignJobToConsultant(
    jobId: string,
    consultantId: string,
    assignedBy: string,
    assignmentSource?: AssignmentSource
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get consultant
      const consultant = await ConsultantModel.findById(consultantId);
      if (!consultant || !consultant.regionId) {
        return { success: false, error: 'Consultant not found or not assigned to a region' };
      }

      // Check if consultant is at capacity
      if (consultant.currentJobs >= consultant.maxJobs) {
        return { success: false, error: 'Consultant is at capacity' };
      }

      // Get existing assignment to check if we need to update old consultant's count
      const existingAssignments = await ConsultantJobAssignmentModel.findByJobId(jobId, true);
      const oldConsultantIds = new Set(existingAssignments.map(a => a.consultantId));

      // Update job's regionId and assignedConsultantId
      await prisma.job.update({
        where: { id: jobId },
        data: { 
          regionId: consultant.regionId,
          assignedConsultantId: consultantId,
          assignmentSource: assignmentSource || null,
        },
      });

      // Create or update assignment record
      const existingAssignment = await ConsultantJobAssignmentModel.findByConsultantAndJob(consultantId, jobId);
      if (existingAssignment) {
        await ConsultantJobAssignmentModel.update(existingAssignment.id, { 
          status: 'ACTIVE',
          assignmentSource: assignmentSource || null,
        });
      } else {
        await ConsultantJobAssignmentModel.create({
          consultantId,
          jobId,
          assignedBy,
          status: 'ACTIVE',
          assignmentSource: assignmentSource || null,
        });
      }

      // Update consultant's currentJobs counter
      // Decrement old consultant if reassigning
      const oldConsultantIdsArray = Array.from(oldConsultantIds);
      for (const oldConsultantId of oldConsultantIdsArray) {
        if (oldConsultantId !== consultantId) {
          await prisma.consultant.update({
            where: { id: oldConsultantId },
            data: { currentJobs: { decrement: 1 } },
          });
        }
      }

      // Increment new consultant's count (only if not already assigned)
      if (!oldConsultantIds.has(consultantId)) {
        await prisma.consultant.update({
          where: { id: consultantId },
          data: { currentJobs: { increment: 1 } },
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Assign job error:', error);
      return { success: false, error: error.message || 'Failed to assign job' };
    }
  }

  /**
   * Assign job to region (automatically assigns to region's consultant)
   */
  static async assignJobToRegion(
    jobId: string,
    regionId: string,
    assignedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get region's consultant
      const consultant = await ConsultantModel.findByRegionId(regionId);
      if (!consultant) {
        return { success: false, error: 'Region does not have a consultant assigned' };
      }

      // Update job's regionId
      await prisma.job.update({
        where: { id: jobId },
        data: { regionId },
      });

      // Create or update assignment record
      const existingAssignment = await ConsultantJobAssignmentModel.findByConsultantAndJob(consultant.id, jobId);
      if (existingAssignment) {
        await ConsultantJobAssignmentModel.update(existingAssignment.id, { status: 'ACTIVE' });
      } else {
        await ConsultantJobAssignmentModel.create({
          consultantId: consultant.id,
          jobId,
          assignedBy,
          status: 'ACTIVE',
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Assign job to region error:', error);
      return { success: false, error: error.message || 'Failed to assign job to region' };
    }
  }

  /**
   * Unassign job from consultant
   */
  static async unassignJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get all assignments for this job
      const assignments = await ConsultantJobAssignmentModel.findByJobId(jobId, true);
      
      // Deactivate all assignments and decrement consultant counters
      for (const assignment of assignments) {
        await ConsultantJobAssignmentModel.deactivate(assignment.id);
        
        // Decrement consultant's currentJobs counter
        await prisma.consultant.update({
          where: { id: assignment.consultantId },
          data: { currentJobs: { decrement: 1 } },
        });
      }

      // Remove regionId and assignedConsultantId from job
      await prisma.job.update({
        where: { id: jobId },
        data: { 
          regionId: null,
          assignedConsultantId: null,
          assignmentSource: null,
        },
      });

      return { success: true };
    } catch (error: any) {
      console.error('Unassign job error:', error);
      return { success: false, error: error.message || 'Failed to unassign job' };
    }
  }

  /**
   * Get consultants assigned to a job
   */
  static async getJobConsultants(jobId: string): Promise<Array<{ id: string; firstName: string; lastName: string; email: string }>> {
    const assignments = await ConsultantJobAssignmentModel.findByJobId(jobId, true);
    
    const consultants = [];
    for (const assignment of assignments) {
      const consultant = await ConsultantModel.findById(assignment.consultantId);
      if (consultant) {
        consultants.push({
          id: consultant.id,
          firstName: consultant.firstName,
          lastName: consultant.lastName,
          email: consultant.email,
        });
      }
    }

    return consultants;
  }

  /**
   * Get jobs assigned to a consultant
   */
  static async getConsultantJobs(consultantId: string): Promise<string[]> {
    const assignments = await ConsultantJobAssignmentModel.findByConsultantId(consultantId, true);
    return assignments.map(a => a.jobId);
  }

  /**
   * Get unassigned jobs (jobs without assignedConsultantId)
   */
  static async getUnassignedJobs(filters?: {
    regionId?: string;
    companyId?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      const where: any = {
        assignedConsultantId: null,
      };

      if (filters?.regionId) {
        where.regionId = filters.regionId;
      }

      if (filters?.companyId) {
        where.companyId = filters.companyId;
      }

      // Add pagination to prevent loading all jobs into memory
      const limit = filters?.limit || 100; // Default to 100, max reasonable for UI
      const offset = filters?.offset || 0;

      const prismaJobs = await prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      // Map Prisma jobs directly to Job objects (avoiding N+1 queries)
      // Using JobModel.findById would cause N+1 queries, so we map directly
      const jobs: Job[] = prismaJobs.map((prismaJob) => {
        // Use the same mapping logic as JobModel.findById but inline
        return {
          id: prismaJob.id,
          companyId: prismaJob.companyId,
          createdBy: prismaJob.createdBy,
          jobCode: prismaJob.jobCode || undefined,
          title: prismaJob.title,
          description: prismaJob.description,
          jobSummary: prismaJob.jobSummary || undefined,
          status: prismaJob.status as JobStatus,
          hiringMode: prismaJob.hiringMode as HiringMode,
          location: prismaJob.location,
          department: prismaJob.department || undefined,
          workArrangement: prismaJob.workArrangement as WorkArrangement,
          employmentType: prismaJob.employmentType as EmploymentType,
          numberOfVacancies: prismaJob.numberOfVacancies,
          salaryMin: prismaJob.salaryMin || undefined,
          salaryMax: prismaJob.salaryMax || undefined,
          salaryCurrency: prismaJob.salaryCurrency,
          salaryDescription: prismaJob.salaryDescription || undefined,
          category: prismaJob.category || undefined,
          promotionalTags: prismaJob.promotionalTags,
          featured: prismaJob.featured,
          stealth: prismaJob.stealth,
          visibility: prismaJob.visibility,
          requirements: prismaJob.requirements || [],
          responsibilities: prismaJob.responsibilities || [],
          termsAccepted: prismaJob.termsAccepted,
          termsAcceptedAt: prismaJob.termsAcceptedAt || undefined,
          termsAcceptedBy: prismaJob.termsAcceptedBy || undefined,
          postingDate: prismaJob.postingDate || undefined,
          expiryDate: prismaJob.expiryDate || undefined,
          closeDate: prismaJob.closeDate || undefined,
          hiringTeam: prismaJob.hiringTeam
            ? (typeof prismaJob.hiringTeam === 'string'
                ? JSON.parse(prismaJob.hiringTeam)
                : prismaJob.hiringTeam)
            : undefined,
          applicationForm: prismaJob.applicationForm
            ? (typeof prismaJob.applicationForm === 'string'
                ? JSON.parse(prismaJob.applicationForm)
                : prismaJob.applicationForm)
            : undefined,
          videoInterviewingEnabled: prismaJob.videoInterviewingEnabled,
          alertsEnabled: prismaJob.alertsEnabled
            ? (typeof prismaJob.alertsEnabled === 'string'
                ? JSON.parse(prismaJob.alertsEnabled)
                : prismaJob.alertsEnabled)
            : undefined,
          shareLink: prismaJob.shareLink || undefined,
          referralLink: prismaJob.referralLink || undefined,
          savedAsTemplate: prismaJob.savedAsTemplate || false,
          templateId: prismaJob.templateId || undefined,
          jobTargetPromotionId: prismaJob.jobTargetPromotionId || undefined,
          jobTargetChannels: prismaJob.jobTargetChannels || [],
          jobTargetBudget: prismaJob.jobTargetBudget || undefined,
          jobTargetBudgetSpent: prismaJob.jobTargetBudgetSpent || undefined,
          jobTargetStatus: prismaJob.jobTargetStatus || undefined,
          jobTargetApproved: prismaJob.jobTargetApproved || false,
          regionId: prismaJob.regionId || undefined,
          assignmentMode: prismaJob.assignmentMode || undefined,
          assignmentSource: prismaJob.assignmentSource || undefined,
          assignedConsultantId: prismaJob.assignedConsultantId || undefined,
          createdAt: prismaJob.createdAt,
          updatedAt: prismaJob.updatedAt,
        } as Job;
      });

      return jobs;
    } catch (error: any) {
      console.error('Get unassigned jobs error:', error);
      throw new Error(error.message || 'Failed to fetch unassigned jobs');
    }
  }

  /**
   * Get consultants available for manual assignment
   * Supports filtering by region, role, availability, industry, language, and search
   */
  static async getConsultantsForAssignment(filters: {
    regionId: string;
    role?: ConsultantRole;
    availability?: AvailabilityStatus;
    industry?: string;
    language?: string;
    search?: string;
  }): Promise<ConsultantData[]> {
    try {
      // Use findAll which returns ConsultantData[]
      const allConsultants = await ConsultantModel.findAll({
        regionId: filters.regionId,
        role: filters.role,
        status: 'ACTIVE',
      });

      // Apply additional filters
      let filteredConsultants = allConsultants.filter(c => {
        if (filters.availability && c.availability !== filters.availability) {
          return false;
        }
        if (filters.industry && (!c.industryExpertise || !c.industryExpertise.includes(filters.industry))) {
          return false;
        }
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const matchesSearch = 
            c.firstName?.toLowerCase().includes(searchLower) ||
            c.lastName?.toLowerCase().includes(searchLower) ||
            c.email?.toLowerCase().includes(searchLower);
          if (!matchesSearch) {
            return false;
          }
        }
        return true;
      }).sort((a, b) => {
        // Sort by workload (least busy first)
        const workloadA = a.maxJobs > 0 ? a.currentJobs / a.maxJobs : 1;
        const workloadB = b.maxJobs > 0 ? b.currentJobs / b.maxJobs : 1;
        if (workloadA !== workloadB) {
          return workloadA - workloadB;
        }
        // Then by performance
        return (b.successRate || 0) - (a.successRate || 0);
      });
      
      return filteredConsultants;
    } catch (error: any) {
      console.error('Get consultants for assignment error:', error);
      throw new Error(error.message || 'Failed to fetch consultants');
    }
  }

  /**
   * Get all jobs for HRM8 admin
   * Returns all jobs across all companies (for Global Admin) or filtered by region (for Regional Licensee)
   */
  static async getAllJobs(
    userRole: string,
    filters?: {
      regionId?: string;
      status?: string;
    }
  ): Promise<any[]> {
    try {
      const jobFilters: {
        regionId?: string;
        status?: JobStatus;
      } = {};

      // For regional licensees, filter by their assigned regions
      // For global admin, show all jobs
      if (userRole !== 'GLOBAL_ADMIN' && filters?.regionId) {
        jobFilters.regionId = filters.regionId;
      }

      // Filter by status if provided
      if (filters?.status) {
        jobFilters.status = filters.status as JobStatus;
      }

      // Use JobModel's public method to get jobs
      return await JobModel.findAllWithFilters(jobFilters);
    } catch (error: any) {
      console.error('Get all jobs error:', error);
      throw new Error(error.message || 'Failed to fetch jobs');
    }
  }
}

