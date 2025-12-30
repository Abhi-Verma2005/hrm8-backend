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
import { PackageService } from './PackageService';
import { CommissionService } from './CommissionService';
import { AssignmentSource, ConsultantRole, AvailabilityStatus, PipelineStage } from '@prisma/client';

export class JobAllocationService {
  /**
   * Auto-assign job to best matching consultant
   */
  static async autoAssignJob(jobId: string): Promise<{ success: boolean; consultantId?: string; error?: string }> {
    try {
      // Check if company has paid package before allowing consultant assignment
      const job = await JobModel.findById(jobId);
      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      const canOffload = await PackageService.canOffloadToConsultants(job.companyId);
      if (!canOffload) {
        return { 
          success: false, 
          error: 'Companies with free packages (ATS Lite) cannot assign jobs to consultants. Please upgrade to a paid subscription to use consultant services.' 
        };
      }

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
      // Get job to check company package
      const job = await JobModel.findById(jobId);
      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      // Validate that company has paid package before allowing consultant assignment
      try {
        await PackageService.validateConsultantAssignment(job.companyId);
      } catch (error: any) {
        return { success: false, error: error.message };
      }

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
          region_id: consultant.regionId,
          assigned_consultant_id: consultantId,
          assignment_source: assignmentSource || null,
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
            data: { current_jobs: { decrement: 1 } },
          });
        }
      }

      // Increment new consultant's count (only if not already assigned)
      if (!oldConsultantIds.has(consultantId)) {
        await prisma.consultant.update({
          where: { id: consultantId },
          data: { current_jobs: { increment: 1 } },
        });
      }

      // Create commission for consultant if job has paid recruitment service
      // Only create commission if this is a new assignment (not reassignment)
      if (!oldConsultantIds.has(consultantId)) {
        await CommissionService.createCommissionForJobAssignment(
          jobId,
          consultantId,
          consultant.regionId
        );
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
        data: { region_id: regionId },
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
          data: { current_jobs: { decrement: 1 } },
        });
      }

      // Remove regionId and assignedConsultantId from job
      await prisma.job.update({
        where: { id: jobId },
        data: { 
          region_id: null,
          assigned_consultant_id: null,
          assignment_source: null,
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
   * Get pipeline status for a consultant's assigned job
   */
  static async getPipelineForConsultantJob(
    consultantId: string,
    jobId: string
  ): Promise<{
    consultantId: string;
    jobId: string;
    stage: PipelineStage;
    progress: number;
    note: string | null;
    updatedAt: Date | null;
    updatedBy: string | null;
  } | null> {
    const assignment = await ConsultantJobAssignmentModel.findByConsultantAndJob(consultantId, jobId);
    if (!assignment) return null;

    return {
      consultantId: assignment.consultantId,
      jobId: assignment.jobId,
      stage: assignment.pipelineStage as PipelineStage,
      progress: assignment.pipelineProgress,
      note: assignment.pipelineNote,
      updatedAt: assignment.pipelineUpdatedAt,
      updatedBy: assignment.pipelineUpdatedBy,
    };
  }

  /**
   * Update pipeline status for a consultant's assigned job
   */
  static async updatePipelineForConsultantJob(
    consultantId: string,
    jobId: string,
    payload: {
      stage: PipelineStage;
      progress?: number;
      note?: string | null;
      updatedBy?: string;
    }
  ): Promise<{ success: boolean; error?: string; pipeline?: {
    consultantId: string;
    jobId: string;
    stage: PipelineStage;
    progress: number;
    note: string | null;
    updatedAt: Date | null;
    updatedBy: string | null;
  } | null }> {
    const assignment = await ConsultantJobAssignmentModel.findByConsultantAndJob(consultantId, jobId);
    if (!assignment) {
      return { success: false, error: 'Assignment not found' };
    }

    const updated = await ConsultantJobAssignmentModel.update(assignment.id, {
      pipelineStage: payload.stage,
      pipelineProgress: payload.progress ?? assignment.pipelineProgress,
      pipelineNote: payload.note ?? assignment.pipelineNote,
      pipelineUpdatedAt: new Date(),
      pipelineUpdatedBy: payload.updatedBy || consultantId,
    });

    const pipeline = {
      consultantId: updated.consultantId,
      jobId: updated.jobId,
      stage: updated.pipelineStage as PipelineStage,
      progress: updated.pipelineProgress,
      note: updated.pipelineNote,
      updatedAt: updated.pipelineUpdatedAt,
      updatedBy: updated.pipelineUpdatedBy,
    };

    return { success: true, pipeline };
  }

  /**
   * Get pipeline status for a job (prefers the assigned consultant if present)
   */
  static async getPipelineForJob(
    jobId: string,
    preferredConsultantId?: string | null
  ): Promise<{
    consultantId: string;
    jobId: string;
    stage: PipelineStage;
    progress: number;
    note: string | null;
    updatedAt: Date | null;
    updatedBy: string | null;
  } | null> {
    const assignments = await ConsultantJobAssignmentModel.findByJobId(jobId, true);
    if (!assignments || assignments.length === 0) return null;

    const primary =
      assignments.find((a) => preferredConsultantId && a.consultantId === preferredConsultantId) ||
      assignments[0];

    return {
      consultantId: primary.consultantId,
      jobId: primary.jobId,
      stage: primary.pipelineStage as PipelineStage,
      progress: primary.pipelineProgress,
      note: primary.pipelineNote,
      updatedAt: primary.pipelineUpdatedAt,
      updatedBy: primary.pipelineUpdatedBy,
    };
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
        assigned_consultant_id: null,
        status: {
          in: [JobStatus.OPEN, JobStatus.ON_HOLD], // Only show OPEN and ON_HOLD jobs
        },
      };

      if (filters?.regionId) {
        where.region_id = filters.regionId;
      }

      if (filters?.companyId) {
        where.company_id = filters.companyId;
      }

      // Add pagination to prevent loading all jobs into memory
      const limit = filters?.limit || 20; // Default to 20, max reasonable for UI
      const offset = filters?.offset || 0;

      const prismaJobs = await prisma.job.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      });

      // Map Prisma jobs directly to Job objects (avoiding N+1 queries)
      // Using JobModel.findById would cause N+1 queries, so we map directly
      const jobs: Job[] = prismaJobs.map((prismaJob) => {
        // Use the same mapping logic as JobModel.findById but inline
        return {
          id: prismaJob.id,
          companyId: prismaJob.company_id,
          createdBy: prismaJob.created_by,
          jobCode: prismaJob.job_code || undefined,
          title: prismaJob.title,
          description: prismaJob.description,
          jobSummary: prismaJob.job_summary || undefined,
          status: prismaJob.status as JobStatus,
          hiringMode: prismaJob.hiring_mode as HiringMode,
          location: prismaJob.location,
          department: prismaJob.department || undefined,
          workArrangement: prismaJob.work_arrangement as WorkArrangement,
          employmentType: prismaJob.employment_type as EmploymentType,
          numberOfVacancies: prismaJob.number_of_vacancies,
          salaryMin: prismaJob.salary_min || undefined,
          salaryMax: prismaJob.salary_max || undefined,
          salaryCurrency: prismaJob.salary_currency,
          salaryDescription: prismaJob.salary_description || undefined,
          category: prismaJob.category || undefined,
          promotionalTags: prismaJob.promotional_tags,
          featured: prismaJob.featured,
          stealth: prismaJob.stealth,
          visibility: prismaJob.visibility,
          requirements: prismaJob.requirements || [],
          responsibilities: prismaJob.responsibilities || [],
          termsAccepted: prismaJob.terms_accepted,
          termsAcceptedAt: prismaJob.terms_accepted_at || undefined,
          termsAcceptedBy: prismaJob.terms_accepted_by || undefined,
          postingDate: prismaJob.posting_date || undefined,
          expiryDate: prismaJob.expiry_date || undefined,
          closeDate: prismaJob.close_date || undefined,
          hiringTeam: prismaJob.hiring_team
            ? (typeof prismaJob.hiring_team === 'string'
                ? JSON.parse(prismaJob.hiring_team)
                : prismaJob.hiring_team)
            : undefined,
          applicationForm: prismaJob.application_form
            ? (typeof prismaJob.application_form === 'string'
                ? JSON.parse(prismaJob.application_form)
                : prismaJob.application_form)
            : undefined,
          videoInterviewingEnabled: prismaJob.video_interviewing_enabled,
          alertsEnabled: prismaJob.alerts_enabled
            ? (typeof prismaJob.alerts_enabled === 'string'
                ? JSON.parse(prismaJob.alerts_enabled)
                : prismaJob.alerts_enabled)
            : undefined,
          shareLink: prismaJob.share_link || undefined,
          referralLink: prismaJob.referral_link || undefined,
          savedAsTemplate: prismaJob.saved_as_template || false,
          templateId: prismaJob.template_id || undefined,
          jobTargetPromotionId: prismaJob.job_target_promotion_id || undefined,
          jobTargetChannels: prismaJob.job_target_channels || [],
          jobTargetBudget: prismaJob.job_target_budget || undefined,
          jobTargetBudgetSpent: prismaJob.job_target_budget_spent || undefined,
          jobTargetStatus: prismaJob.job_target_status || undefined,
          jobTargetApproved: prismaJob.job_target_approved || false,
          regionId: prismaJob.region_id || undefined,
          assignmentMode: prismaJob.assignment_mode || undefined,
          assignmentSource: prismaJob.assignment_source || undefined,
          assignedConsultantId: prismaJob.assigned_consultant_id || undefined,
          createdAt: prismaJob.created_at,
          updatedAt: prismaJob.updated_at,
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
      const searchLower = filters.search?.trim().toLowerCase();
      const languageLower = filters.language?.trim().toLowerCase();
      let filteredConsultants = allConsultants.filter(c => {
        if (filters.availability && c.availability !== filters.availability) {
          return false;
        }
        if (filters.industry) {
          const industryMatch = c.industryExpertise?.some(
            (industry) => industry?.toLowerCase() === filters.industry?.toLowerCase()
          );
          if (!industryMatch) {
            return false;
          }
        }
        if (languageLower) {
          const languageMatch = c.languages?.some(
            (lang) => (lang.language || '').toLowerCase() === languageLower
          );
          if (!languageMatch) {
            return false;
          }
        }
        if (searchLower) {
          const first = (c.firstName || '').toLowerCase();
          const last = (c.lastName || '').toLowerCase();
          const fullName = `${first} ${last}`.trim();
          const email = (c.email || '').toLowerCase();
          const matchesSearch =
            first.includes(searchLower) ||
            last.includes(searchLower) ||
            fullName.includes(searchLower) ||
            email.includes(searchLower);
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

