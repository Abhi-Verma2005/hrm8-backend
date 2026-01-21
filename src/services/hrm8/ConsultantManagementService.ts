/**
 * Consultant Management Service
 * Handles consultant management for HRM8 Admin
 */

import { ConsultantModel, ConsultantData } from '../../models/Consultant';
import { ConsultantRole, ConsultantStatus } from '@prisma/client';
import { hashPassword } from '../../utils/password';
import prisma from '../../lib/prisma';

export class ConsultantManagementService {
  /**
   * Create a new consultant (admin only)
   */
  static async createConsultant(consultantData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    photo?: string;
    role: ConsultantRole;
    regionId: string; // Required - consultants must belong to a region
  }): Promise<ConsultantData | { error: string; status: number }> {
    try {
      // Check if consultant already exists
      const existing = await ConsultantModel.findByEmail(consultantData.email);
      if (existing) {
        return { error: 'Consultant with this email already exists', status: 409 };
      }

      // Note: Multiple consultants can belong to the same region
      // (removed the check that prevented multiple consultants per region)

      // Hash password
      const passwordHash = await hashPassword(consultantData.password);

      const consultant = await ConsultantModel.create({
        email: consultantData.email,
        passwordHash,
        firstName: consultantData.firstName,
        lastName: consultantData.lastName,
        phone: consultantData.phone,
        photo: consultantData.photo,
        role: consultantData.role,
        regionId: consultantData.regionId,
        status: ConsultantStatus.ACTIVE,
      });

      return consultant;
    } catch (error: any) {
      if (error.code === 'P2002') {
        return { error: 'Consultant email already exists', status: 409 };
      }
      throw error;
    }
  }

  /**
   * Get all consultants with filters
   */
  static async getAllConsultants(filters?: {
    regionId?: string;
    regionIds?: string[];
    role?: ConsultantRole;
    status?: ConsultantStatus;
  }): Promise<ConsultantData[]> {
    return await ConsultantModel.findAll(filters);
  }

  /**
   * Get consultant by ID
   */
  static async getConsultantById(id: string): Promise<ConsultantData | null> {
    return await ConsultantModel.findById(id);
  }

  /**
   * Update consultant (admin fields)
   */
  static async updateConsultant(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      photo?: string;
      role?: ConsultantRole;
      status?: ConsultantStatus;
      regionId?: string;
    }
  ): Promise<ConsultantData | { error: string; status: number }> {
    try {
      // Note: Multiple consultants can belong to the same region
      // (removed the old check that prevented multiple consultants per region)

      return await ConsultantModel.update(id, data);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Assign consultant to region
   */
  static async assignToRegion(consultantId: string, regionId: string): Promise<ConsultantData | { error: string; status: number }> {
    try {
      // Note: Multiple consultants can belong to the same region
      return await ConsultantModel.assignToRegion(consultantId, regionId);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Suspend consultant
   */
  static async suspendConsultant(id: string): Promise<void> {
    await ConsultantModel.updateStatus(id, ConsultantStatus.SUSPENDED);
  }

  /**
   * Reactivate consultant
   */
  static async reactivateConsultant(id: string): Promise<void> {
    await ConsultantModel.updateStatus(id, ConsultantStatus.ACTIVE);
  }

  /**
   * Delete consultant
   * Soft delete by setting status to INACTIVE
   */
  static async deleteConsultant(id: string): Promise<void | { error: string; status: number }> {
    try {
      // Soft delete by setting status to INACTIVE
      await ConsultantModel.updateStatus(id, ConsultantStatus.INACTIVE);
    } catch (error: any) {
      console.error('Delete consultant error:', error);
      throw error;
    }
  }


  /**
   * Generate HRM8 email address for consultant
   * Format: firstname.lastname@hrm8.com
   * If email exists, appends number (e.g., firstname.lastname2@hrm8.com)
   */
  static async generateEmail(
    firstName: string,
    lastName: string,
    excludeConsultantId?: string
  ): Promise<{ email: string } | { error: string; status: number }> {
    try {
      if (!firstName || !lastName) {
        return { error: 'First name and last name are required', status: 400 };
      }

      // Normalize names: lowercase, remove special characters, handle spaces
      const normalizeName = (name: string): string => {
        return name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, '') // Remove special characters
          .replace(/\s+/g, ''); // Remove spaces
      };

      const normalizedFirstName = normalizeName(firstName);
      const normalizedLastName = normalizeName(lastName);

      if (!normalizedFirstName || !normalizedLastName) {
        return { error: 'Invalid first name or last name', status: 400 };
      }

      // Generate base email
      const baseEmail = `${normalizedFirstName}.${normalizedLastName}@hrm8.com`;

      // Check if base email exists
      const existingBase = await prisma.consultant.findUnique({
        where: { email: baseEmail },
      });

      // If base email doesn't exist or it's the same consultant being updated, return it
      if (!existingBase || (excludeConsultantId && existingBase.id === excludeConsultantId)) {
        return { email: baseEmail };
      }

      // If base email exists, try with numbers
      let counter = 2;
      let generatedEmail = `${normalizedFirstName}.${normalizedLastName}${counter}@hrm8.com`;

      while (counter < 1000) {
        const existing = await prisma.consultant.findUnique({
          where: { email: generatedEmail },
        });

        // If email doesn't exist or it's the same consultant, return it
        if (!existing || (excludeConsultantId && existing.id === excludeConsultantId)) {
          return { email: generatedEmail };
        }

        counter++;
        generatedEmail = `${normalizedFirstName}.${normalizedLastName}${counter}@hrm8.com`;
      }

      // If we've tried 1000 variations, return error
      return { error: 'Unable to generate unique email address', status: 500 };
    } catch (error: any) {
      console.error('Generate email error:', error);
      return { error: 'Failed to generate email address', status: 500 };
    }
  }

  /**
   * Get pending tasks for a consultant
   * Used to warn admin before role change
   */
  static async getPendingTasks(consultantId: string): Promise<{
    jobs: { id: string; title: string; companyName: string; status: string }[];
    leads: { id: string; companyName: string; status: string }[];
    conversionRequests: { id: string; companyName: string; status: string }[];
    pendingCommissions: { id: string; amount: number; status: string }[];
    totalCount: number;
  }> {
    // Get assigned jobs (active ones)
    const jobAssignments = await prisma.consultantJobAssignment.findMany({
      where: {
        consultant_id: consultantId,
        status: { in: ['ACTIVE', 'PENDING'] }
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            status: true,
            company: { select: { name: true } }
          }
        }
      }
    });

    const jobs = jobAssignments.map(a => ({
      id: a.job.id,
      title: a.job.title,
      companyName: a.job.company?.name || 'Unknown',
      status: a.job.status
    }));

    // Get assigned leads (non-converted)
    const leadRecords = await prisma.lead.findMany({
      where: {
        assigned_consultant_id: consultantId,
        status: { notIn: ['CONVERTED', 'LOST'] }
      },
      select: {
        id: true,
        company_name: true,
        status: true
      }
    });

    const leads = leadRecords.map(l => ({
      id: l.id,
      companyName: l.company_name,
      status: l.status
    }));

    // Get pending conversion requests
    const conversionRequestRecords = await prisma.leadConversionRequest.findMany({
      where: {
        consultant_id: consultantId,
        status: 'PENDING'
      },
      include: {
        lead: { select: { company_name: true } }
      }
    });

    const conversionRequests = conversionRequestRecords.map(r => ({
      id: r.id,
      companyName: r.lead.company_name,
      status: r.status
    }));

    // Get pending commissions
    const commissionRecords = await prisma.commission.findMany({
      where: {
        consultant_id: consultantId,
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      select: {
        id: true,
        amount: true,
        status: true
      }
    });

    const pendingCommissions = commissionRecords.map(c => ({
      id: c.id,
      amount: typeof c.amount === 'object' && c.amount !== null && 'toNumber' in c.amount
        ? (c.amount as any).toNumber()
        : Number(c.amount),
      status: c.status
    }));

    const totalCount = jobs.length + leads.length + conversionRequests.length + pendingCommissions.length;

    return {
      jobs,
      leads,
      conversionRequests,
      pendingCommissions,
      totalCount
    };
  }

  /**
   * Get consultants by role and region for reassignment
   */
  static async getConsultantsForReassignment(
    currentConsultantId: string,
    role: ConsultantRole,
    regionId: string
  ): Promise<{ id: string; firstName: string; lastName: string; email: string }[]> {
    const consultants = await prisma.consultant.findMany({
      where: {
        id: { not: currentConsultantId },
        role: role,
        region_id: regionId,
        status: ConsultantStatus.ACTIVE
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true
      }
    });

    return consultants.map(c => ({
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      email: c.email
    }));
  }

  /**
   * Reassign all active tasks from one consultant to another
   * Used before role change to hand off work
   */
  static async reassignAllTasks(
    fromConsultantId: string,
    toConsultantId: string
  ): Promise<{ success: boolean; reassigned: { jobs: number; leads: number }; error?: string }> {
    try {
      // 1. Reassign active job assignments
      const jobsResult = await prisma.consultantJobAssignment.updateMany({
        where: {
          consultant_id: fromConsultantId,
          status: { in: ['ACTIVE', 'PENDING'] }
        },
        data: {
          consultant_id: toConsultantId
        }
      });

      // 2. Reassign active leads
      const leadsResult = await prisma.lead.updateMany({
        where: {
          assigned_consultant_id: fromConsultantId,
          status: { notIn: ['CONVERTED', 'LOST'] }
        },
        data: {
          assigned_consultant_id: toConsultantId
        }
      });

      // 3. Reassign pending conversion requests
      await prisma.leadConversionRequest.updateMany({
        where: {
          consultant_id: fromConsultantId,
          status: 'PENDING'
        },
        data: {
          consultant_id: toConsultantId
        }
      });

      return {
        success: true,
        reassigned: {
          jobs: jobsResult.count,
          leads: leadsResult.count
        }
      };
    } catch (error: any) {
      console.error('Reassign all tasks error:', error);
      return { success: false, reassigned: { jobs: 0, leads: 0 }, error: error.message };
    }
  }

  /**
   * Terminate (unassign) all active tasks from a consultant
   * Used before role change when no reassignment target is available
   */
  static async terminateAllTasks(
    consultantId: string
  ): Promise<{ success: boolean; terminated: { jobs: number; leads: number }; error?: string }> {
    try {
      // 1. Mark job assignments as inactive (released back to pool)
      const jobsResult = await prisma.consultantJobAssignment.updateMany({
        where: {
          consultant_id: consultantId,
          status: { in: ['ACTIVE', 'PENDING'] }
        },
        data: {
          status: 'COMPLETED', // Mark as completed to release
          ended_at: new Date()
        }
      });

      // 2. Unassign leads (set assigned_consultant_id to null)
      const leadsResult = await prisma.lead.updateMany({
        where: {
          assigned_consultant_id: consultantId,
          status: { notIn: ['CONVERTED', 'LOST'] }
        },
        data: {
          assigned_consultant_id: null,
          status: 'NEW' // Reset to new for reallocation
        }
      });

      // 3. Cancel pending conversion requests
      await prisma.leadConversionRequest.updateMany({
        where: {
          consultant_id: consultantId,
          status: 'PENDING'
        },
        data: {
          status: 'CANCELLED'
        }
      });

      return {
        success: true,
        terminated: {
          jobs: jobsResult.count,
          leads: leadsResult.count
        }
      };
    } catch (error: any) {
      console.error('Terminate all tasks error:', error);
      return { success: false, terminated: { jobs: 0, leads: 0 }, error: error.message };
    }
  }

  /**
   * Change consultant role with optional task handling
   * Production-grade method that handles task reassignment before role change
   */
  static async changeRoleWithTaskHandling(
    consultantId: string,
    newRole: ConsultantRole,
    taskAction: 'REASSIGN' | 'TERMINATE' | 'KEEP',
    targetConsultantId?: string
  ): Promise<{ success: boolean; error?: string; taskResult?: any }> {
    try {
      // 1. Get current consultant
      const consultant = await ConsultantModel.findById(consultantId);
      if (!consultant) {
        return { success: false, error: 'Consultant not found' };
      }

      // Only handle tasks if role is actually changing
      if (consultant.role === newRole) {
        return { success: false, error: 'Role is already set to this value' };
      }

      let taskResult = null;

      // 2. Handle tasks based on action
      if (taskAction === 'REASSIGN') {
        if (!targetConsultantId) {
          return { success: false, error: 'Target consultant required for reassignment' };
        }
        taskResult = await this.reassignAllTasks(consultantId, targetConsultantId);
        if (!taskResult.success) {
          return { success: false, error: taskResult.error || 'Failed to reassign tasks' };
        }
      } else if (taskAction === 'TERMINATE') {
        taskResult = await this.terminateAllTasks(consultantId);
        if (!taskResult.success) {
          return { success: false, error: taskResult.error || 'Failed to terminate tasks' };
        }
      }
      // KEEP means don't touch tasks (they remain with this consultant)

      // 3. Update the role
      const updateResult = await this.updateConsultant(consultantId, { role: newRole });
      if ('error' in updateResult) {
        return { success: false, error: updateResult.error };
      }

      return { success: true, taskResult };
    } catch (error: any) {
      console.error('Change role with task handling error:', error);
      return { success: false, error: error.message };
    }
  }
}
