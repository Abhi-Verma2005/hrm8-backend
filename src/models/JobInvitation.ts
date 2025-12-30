/**
 * Job Invitation Model
 * Represents an invitation sent to candidates to apply for a job
 */

import prisma from '../lib/prisma';
import { JobInvitationStatus } from '@prisma/client';

export interface JobInvitationData {
  id: string;
  jobId: string;
  candidateId?: string;
  email: string;
  token: string;
  status: JobInvitationStatus;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt?: Date;
  applicationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class JobInvitationModel {
  /**
   * Create a new job invitation
   */
  static async create(
    invitationData: Omit<JobInvitationData, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<JobInvitationData> {
    const invitation = await prisma.jobInvitation.create({
      data: {
        job_id: invitationData.jobId,
        candidate_id: invitationData.candidateId,
        email: invitationData.email.toLowerCase(),
        token: invitationData.token,
        status: invitationData.status,
        invited_by: invitationData.invitedBy,
        expires_at: invitationData.expiresAt,
        accepted_at: invitationData.acceptedAt,
        application_id: invitationData.applicationId,
        updated_at: new Date(),
      },
    });

    return this.mapPrismaToJobInvitation(invitation);
  }

  /**
   * Find invitation by ID
   */
  static async findById(id: string): Promise<JobInvitationData | null> {
    const invitation = await prisma.jobInvitation.findUnique({
      where: { id },
    });

    return invitation ? this.mapPrismaToJobInvitation(invitation) : null;
  }

  /**
   * Find invitation by token
   */
  static async findByToken(token: string): Promise<JobInvitationData | null> {
    const invitation = await prisma.jobInvitation.findUnique({
      where: { token },
    });

    return invitation ? this.mapPrismaToJobInvitation(invitation) : null;
  }

  /**
   * Find invitation by job and email
   */
  static async findByJobAndEmail(
    jobId: string,
    email: string
  ): Promise<JobInvitationData | null> {
    const invitation = await prisma.jobInvitation.findUnique({
      where: {
        job_id_email: {
          job_id: jobId,
          email: email.toLowerCase(),
        },
      },
    });

    return invitation ? this.mapPrismaToJobInvitation(invitation) : null;
  }

  /**
   * Check if there's a pending invitation for email and job
   */
  static async hasPendingInvitation(
    email: string,
    jobId: string
  ): Promise<boolean> {
    const invitation = await prisma.jobInvitation.findFirst({
      where: {
        email: email.toLowerCase(),
        job_id: jobId,
        status: JobInvitationStatus.PENDING,
        expires_at: {
          gt: new Date(),
        },
      },
    });

    return !!invitation;
  }

  /**
   * Update invitation status
   */
  static async updateStatus(
    id: string,
    status: JobInvitationStatus,
    acceptedAt?: Date,
    applicationId?: string
  ): Promise<JobInvitationData> {
    const invitation = await prisma.jobInvitation.update({
      where: { id },
      data: {
        status,
        accepted_at: acceptedAt,
        application_id: applicationId,
        updated_at: new Date(),
      },
    });

    return this.mapPrismaToJobInvitation(invitation);
  }

  /**
   * Map Prisma model to JobInvitationData
   */
  private static mapPrismaToJobInvitation(
    invitation: any
  ): JobInvitationData {
    return {
      id: invitation.id,
      jobId: invitation.job_id,
      candidateId: invitation.candidate_id,
      email: invitation.email,
      token: invitation.token,
      status: invitation.status,
      invitedBy: invitation.invited_by,
      expiresAt: invitation.expires_at,
      acceptedAt: invitation.accepted_at,
      applicationId: invitation.application_id,
      createdAt: invitation.created_at,
      updatedAt: invitation.updated_at,
    };
  }
}

