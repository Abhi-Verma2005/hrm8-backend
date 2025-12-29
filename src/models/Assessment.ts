/**
 * Assessment Model
 * Manages assessments for candidates
 */

import { prisma } from '../lib/prisma';
import { AssessmentStatus, AssessmentType } from '@prisma/client';
import crypto from "crypto"

export interface AssessmentData {
  id: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  jobRoundId?: string | null;
  assessmentType: AssessmentType;
  provider?: string | null;
  status: AssessmentStatus;
  invitedBy: string;
  invitedAt: Date;
  invitationToken?: string | null;
  expiryDate?: Date | null;
  completedAt?: Date | null;
  results?: any;
  passThreshold?: number | null;
  cost?: number | null;
  paymentStatus?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class AssessmentModel {
  /**
   * Map Prisma Assessment (snake_case) to AssessmentData (camelCase)
   */
  private static mapPrismaToAssessment(prismaAssessment: any): AssessmentData {
    return {
      id: prismaAssessment.id,
      applicationId: prismaAssessment.application_id,
      candidateId: prismaAssessment.candidate_id,
      jobId: prismaAssessment.job_id,
      jobRoundId: prismaAssessment.job_round_id ?? null,
      assessmentType: prismaAssessment.assessment_type,
      provider: prismaAssessment.provider ?? null,
      status: prismaAssessment.status,
      invitedBy: prismaAssessment.invited_by,
      invitedAt: prismaAssessment.invited_at,
      invitationToken: prismaAssessment.invitation_token ?? null,
      expiryDate: prismaAssessment.expiry_date ?? null,
      completedAt: prismaAssessment.completed_at ?? null,
      results: prismaAssessment.results ?? null,
      passThreshold: prismaAssessment.pass_threshold ?? null,
      cost: prismaAssessment.cost ?? null,
      paymentStatus: prismaAssessment.payment_status ?? null,
      notes: prismaAssessment.notes ?? null,
      createdAt: prismaAssessment.created_at,
      updatedAt: prismaAssessment.updated_at,
    };
  }

  static async findById(id: string): Promise<AssessmentData | null> {
    const assessment = await prisma.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      return null;
    }

    return this.mapPrismaToAssessment(assessment);
  }

  static async findByInvitationToken(token: string): Promise<AssessmentData | null> {
    const assessment = await prisma.assessment.findUnique({
      where: { invitation_token: token },
    });

    if (!assessment) {
      return null;
    }

    return this.mapPrismaToAssessment(assessment);
  }

  static async findByApplicationId(applicationId: string): Promise<AssessmentData[]> {
    const assessments = await prisma.assessment.findMany({
      where: { application_id: applicationId },
      orderBy: { created_at: 'desc' },
    });

    return assessments.map(assessment => this.mapPrismaToAssessment(assessment));
  }

  static async create(data: {
    applicationId: string;
    candidateId: string;
    jobId: string;
    jobRoundId?: string;
    assessmentType: AssessmentType;
    provider?: string;
    invitedBy: string;
    expiryDate?: Date;
    passThreshold?: number;
    invitationToken?: string;
  }): Promise<AssessmentData> {
    // Generate invitation token if not provided
    const token = data.invitationToken || this.generateInvitationToken();

    const assessment = await prisma.assessment.create({
      data: {
        application_id: data.applicationId,
        candidate_id: data.candidateId,
        job_id: data.jobId,
        job_round_id: data.jobRoundId,
        assessment_type: data.assessmentType,
        provider: data.provider ?? 'native',
        status: AssessmentStatus.PENDING_INVITATION,
        invited_by: data.invitedBy,
        invitation_token: token,
        expiry_date: data.expiryDate,
        pass_threshold: data.passThreshold,
      },
    });

    return this.mapPrismaToAssessment(assessment);
  }

  static async update(
    id: string,
    data: Partial<Omit<AssessmentData, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<AssessmentData | null> {
    // Map camelCase to snake_case for Prisma
    const updateData: any = {};
    
    if (data.applicationId !== undefined) updateData.application_id = data.applicationId;
    if (data.candidateId !== undefined) updateData.candidate_id = data.candidateId;
    if (data.jobId !== undefined) updateData.job_id = data.jobId;
    if (data.jobRoundId !== undefined) updateData.job_round_id = data.jobRoundId;
    if (data.assessmentType !== undefined) updateData.assessment_type = data.assessmentType;
    if (data.provider !== undefined) updateData.provider = data.provider;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.invitedBy !== undefined) updateData.invited_by = data.invitedBy;
    if (data.invitationToken !== undefined) updateData.invitation_token = data.invitationToken;
    if (data.expiryDate !== undefined) updateData.expiry_date = data.expiryDate;
    if (data.completedAt !== undefined) updateData.completed_at = data.completedAt;
    if (data.results !== undefined) updateData.results = data.results;
    if (data.passThreshold !== undefined) updateData.pass_threshold = data.passThreshold;
    if (data.cost !== undefined) updateData.cost = data.cost;
    if (data.paymentStatus !== undefined) updateData.payment_status = data.paymentStatus;
    if (data.notes !== undefined) updateData.notes = data.notes;
    
    updateData.updated_at = new Date();

    const assessment = await prisma.assessment.update({
      where: { id },
      data: updateData,
    });

    return this.mapPrismaToAssessment(assessment);
  }

  static generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

