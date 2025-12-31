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
        consultant_id: assignmentData.consultantId,
        job_id: assignmentData.jobId,
        assigned_by: assignmentData.assignedBy || null,
        status: assignmentData.status || 'ACTIVE',
        notes: assignmentData.notes || null,
        assignment_source: assignmentData.assignmentSource || null,
        pipeline_stage: 'INTAKE' as PipelineStage,
        pipeline_progress: 0,
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
        consultant_id: consultantId,
        ...(activeOnly && { status: 'ACTIVE' }),
      },
      orderBy: { assigned_at: 'desc' },
    });

    return assignments.map((assignment) => this.mapPrismaToAssignment(assignment));
  }

  /**
   * Find assignments by job ID
   */
  static async findByJobId(jobId: string, activeOnly = false): Promise<ConsultantJobAssignmentData[]> {
    const assignments = await prisma.consultantJobAssignment.findMany({
      where: {
        job_id: jobId,
        ...(activeOnly && { status: 'ACTIVE' }),
      },
      orderBy: { assigned_at: 'desc' },
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
        consultant_id_job_id: {
          consultant_id: consultantId,
          job_id: jobId,
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
        ...(data.assignmentSource !== undefined && { assignment_source: data.assignmentSource }),
        ...(data.pipelineStage !== undefined && { pipeline_stage: data.pipelineStage }),
        ...(data.pipelineProgress !== undefined && { pipeline_progress: data.pipelineProgress }),
        ...(data.pipelineNote !== undefined && { pipeline_note: data.pipelineNote }),
        ...(data.pipelineUpdatedAt !== undefined && { pipeline_updated_at: data.pipelineUpdatedAt }),
        ...(data.pipelineUpdatedBy !== undefined && { pipeline_updated_by: data.pipelineUpdatedBy }),
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
        consultant_id_job_id: {
          consultant_id: consultantId,
          job_id: jobId,
        },
      },
    }).catch(() => {
      // Assignment might not exist, ignore error
    });
  }

  /**
   * Map Prisma assignment to ConsultantJobAssignmentData interface
   */
  private static mapPrismaToAssignment(prismaAssignment: any): ConsultantJobAssignmentData {
    return {
      id: prismaAssignment.id,
      consultantId: prismaAssignment.consultantId || prismaAssignment.consultant_id,
      jobId: prismaAssignment.jobId || prismaAssignment.job_id,
      assignedBy: prismaAssignment.assignedBy || prismaAssignment.assigned_by,
      assignedAt: prismaAssignment.assignedAt || prismaAssignment.assigned_at,
      status: prismaAssignment.status,
      notes: prismaAssignment.notes,
      assignmentSource: prismaAssignment.assignmentSource || prismaAssignment.assignment_source || null,
      pipelineStage: (prismaAssignment.pipelineStage || prismaAssignment.pipeline_stage) as PipelineStage,
      pipelineProgress: prismaAssignment.pipelineProgress !== undefined ? prismaAssignment.pipelineProgress : (prismaAssignment.pipeline_progress || 0),
      pipelineNote: prismaAssignment.pipelineNote || prismaAssignment.pipeline_note,
      pipelineUpdatedAt: prismaAssignment.pipelineUpdatedAt || prismaAssignment.pipeline_updated_at,
      pipelineUpdatedBy: prismaAssignment.pipelineUpdatedBy || prismaAssignment.pipeline_updated_by,
    };
  }
}

