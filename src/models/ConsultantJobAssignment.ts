/**
 * ConsultantJobAssignment Model
 * Represents job-to-consultant assignments
 */

import prisma from '../lib/prisma';
import { AssignmentSource } from '@prisma/client';

export interface ConsultantJobAssignmentData {
  id: string;
  consultantId: string;
  jobId: string;
  assignedBy: string | null;
  assignedAt: Date;
  status: string;
  notes: string | null;
  assignmentSource?: AssignmentSource | null;
}

export class ConsultantJobAssignmentModel {
  /**
   * Create a new job assignment
   */
  static async create(assignmentData: {
    consultantId: string;
    jobId: string;
    assignedBy?: string | null;
    status?: string;
    notes?: string | null;
    assignmentSource?: AssignmentSource | null;
  }): Promise<ConsultantJobAssignmentData> {
    const assignment = await prisma.consultantJobAssignment.create({
      data: {
        consultantId: assignmentData.consultantId,
        jobId: assignmentData.jobId,
        assignedBy: assignmentData.assignedBy || null,
        status: assignmentData.status || 'ACTIVE',
        notes: assignmentData.notes || null,
        assignmentSource: assignmentData.assignmentSource || null,
      },
    });

    return this.mapPrismaToAssignment(assignment);
  }

  /**
   * Find assignment by ID
   */
  static async findById(id: string): Promise<ConsultantJobAssignmentData | null> {
    const assignment = await prisma.consultantJobAssignment.findUnique({
      where: { id },
    });

    return assignment ? this.mapPrismaToAssignment(assignment) : null;
  }

  /**
   * Find assignments by consultant ID
   */
  static async findByConsultantId(consultantId: string, activeOnly = false): Promise<ConsultantJobAssignmentData[]> {
    const assignments = await prisma.consultantJobAssignment.findMany({
      where: {
        consultantId,
        ...(activeOnly && { status: 'ACTIVE' }),
      },
      orderBy: { assignedAt: 'desc' },
    });

    return assignments.map((assignment) => this.mapPrismaToAssignment(assignment));
  }

  /**
   * Find assignments by job ID
   */
  static async findByJobId(jobId: string, activeOnly = false): Promise<ConsultantJobAssignmentData[]> {
    const assignments = await prisma.consultantJobAssignment.findMany({
      where: {
        jobId,
        ...(activeOnly && { status: 'ACTIVE' }),
      },
      orderBy: { assignedAt: 'desc' },
    });

    return assignments.map((assignment) => this.mapPrismaToAssignment(assignment));
  }

  /**
   * Find assignment by consultant and job
   */
  static async findByConsultantAndJob(
    consultantId: string,
    jobId: string
  ): Promise<ConsultantJobAssignmentData | null> {
    const assignment = await prisma.consultantJobAssignment.findUnique({
      where: {
        consultantId_jobId: {
          consultantId,
          jobId,
        },
      },
    });

    return assignment ? this.mapPrismaToAssignment(assignment) : null;
  }

  /**
   * Update assignment
   */
  static async update(id: string, data: Partial<ConsultantJobAssignmentData>): Promise<ConsultantJobAssignmentData> {
    const assignment = await prisma.consultantJobAssignment.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.assignmentSource !== undefined && { assignmentSource: data.assignmentSource }),
      },
    });

    return this.mapPrismaToAssignment(assignment);
  }

  /**
   * Deactivate assignment
   */
  static async deactivate(id: string): Promise<void> {
    await prisma.consultantJobAssignment.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  /**
   * Delete assignment
   */
  static async delete(id: string): Promise<void> {
    await prisma.consultantJobAssignment.delete({
      where: { id },
    });
  }

  /**
   * Delete assignment by consultant and job
   */
  static async deleteByConsultantAndJob(consultantId: string, jobId: string): Promise<void> {
    await prisma.consultantJobAssignment.delete({
      where: {
        consultantId_jobId: {
          consultantId,
          jobId,
        },
      },
    }).catch(() => {
      // Assignment might not exist, ignore error
    });
  }

  /**
   * Map Prisma assignment to ConsultantJobAssignmentData interface
   */
  private static mapPrismaToAssignment(prismaAssignment: {
    id: string;
    consultantId: string;
    jobId: string;
    assignedBy: string | null;
    assignedAt: Date;
    status: string;
    notes: string | null;
    assignmentSource?: AssignmentSource | null;
  }): ConsultantJobAssignmentData {
    return {
      id: prismaAssignment.id,
      consultantId: prismaAssignment.consultantId,
      jobId: prismaAssignment.jobId,
      assignedBy: prismaAssignment.assignedBy,
      assignedAt: prismaAssignment.assignedAt,
      status: prismaAssignment.status,
      notes: prismaAssignment.notes,
      assignmentSource: prismaAssignment.assignmentSource || null,
    };
  }
}

