/**
 * Job Allocation Service
 * Handles job-to-consultant assignment
 * Note: Since it's 1:1 consultant:region, jobs in a region automatically belong to that region's consultant
 */

import { ConsultantModel } from '../../models/Consultant';
import { ConsultantJobAssignmentModel } from '../../models/ConsultantJobAssignment';
import prisma from '../../lib/prisma';

export class JobAllocationService {
  /**
   * Assign job to consultant (by assigning job to consultant's region)
   */
  static async assignJobToConsultant(
    jobId: string,
    consultantId: string,
    assignedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get consultant
      const consultant = await ConsultantModel.findById(consultantId);
      if (!consultant || !consultant.regionId) {
        return { success: false, error: 'Consultant not found or not assigned to a region' };
      }

      // Update job's regionId
      await prisma.job.update({
        where: { id: jobId },
        data: { regionId: consultant.regionId },
      });

      // Create or update assignment record
      const existingAssignment = await ConsultantJobAssignmentModel.findByConsultantAndJob(consultantId, jobId);
      if (existingAssignment) {
        await ConsultantJobAssignmentModel.update(existingAssignment.id, { status: 'ACTIVE' });
      } else {
        await ConsultantJobAssignmentModel.create({
          consultantId,
          jobId,
          assignedBy,
          status: 'ACTIVE',
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
      
      // Deactivate all assignments
      for (const assignment of assignments) {
        await ConsultantJobAssignmentModel.deactivate(assignment.id);
      }

      // Remove regionId from job
      await prisma.job.update({
        where: { id: jobId },
        data: { regionId: null },
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
}

