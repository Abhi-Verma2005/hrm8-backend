/**
 * ConsultantJobAssignment Model
 * Represents job-to-consultant assignments
 */

import prisma from '../lib/prisma';
import { AssignmentSource, PipelineStage } from '@prisma/client';

export interface ConsultantJobAssignmentData {
  id: string;
  consultantId: string;
  jobId: string;
  assignedBy: string | null;
  assignedAt: Date;
  status: string;
  notes: string | null;
  assignmentSource?: AssignmentSource | null;
  pipelineStage: PipelineStage;
  pipelineProgress: number;
  pipelineNote: string | null;
  pipelineUpdatedAt: Date | null;
  pipelineUpdatedBy: string | null;
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
        pipelineStage: 'INTAKE' as PipelineStage,
        pipelineProgress: 0,
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
        ...(data.pipelineStage !== undefined && { pipelineStage: data.pipelineStage }),
        ...(data.pipelineProgress !== undefined && { pipelineProgress: data.pipelineProgress }),
        ...(data.pipelineNote !== undefined && { pipelineNote: data.pipelineNote }),
        ...(data.pipelineUpdatedAt !== undefined && { pipelineUpdatedAt: data.pipelineUpdatedAt }),
        ...(data.pipelineUpdatedBy !== undefined && { pipelineUpdatedBy: data.pipelineUpdatedBy }),
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
    pipelineStage: string;
    pipelineProgress: number;
    pipelineNote: string | null;
    pipelineUpdatedAt: Date | null;
    pipelineUpdatedBy: string | null;
  }): ConsultantJobAssignmentData {
    const assignment = prismaAssignment as any;
    return {
      id: assignment.id,
      consultantId: assignment.consultantId || assignment.consultant_id,
      jobId: assignment.jobId || assignment.job_id,
      assignedBy: assignment.assignedBy || assignment.assigned_by,
      assignedAt: assignment.assignedAt || assignment.assigned_at,
      status: assignment.status,
      notes: assignment.notes,
      assignmentSource: assignment.assignmentSource || assignment.assignment_source || null,
      pipelineStage: assignment.pipelineStage || assignment.pipeline_stage,
      pipelineProgress: assignment.pipelineProgress !== undefined ? assignment.pipelineProgress : assignment.pipeline_progress,
      pipelineNote: assignment.pipelineNote || assignment.pipeline_note,
      pipelineUpdatedAt: assignment.pipelineUpdatedAt || assignment.pipeline_updated_at,
      pipelineUpdatedBy: assignment.pipelineUpdatedBy || assignment.pipeline_updated_by,
    };
  }
}

