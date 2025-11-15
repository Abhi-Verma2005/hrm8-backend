/**
 * Invitation Model
 * Represents an invitation sent to employees to join a company workspace
 */

import { Invitation, InvitationStatus } from '../types';
import prisma from '../lib/prisma';

export class InvitationModel {
  /**
   * Create a new invitation
   */
  static async create(
    invitationData: Omit<Invitation, 'id' | 'createdAt'>
  ): Promise<Invitation> {
    const invitation = await prisma.invitation.create({
      data: {
        companyId: invitationData.companyId,
        invitedBy: invitationData.invitedBy,
        email: invitationData.email.toLowerCase(),
        token: invitationData.token,
        status: invitationData.status,
        expiresAt: invitationData.expiresAt,
        acceptedAt: invitationData.acceptedAt,
      },
    });

    return this.mapPrismaToInvitation(invitation);
  }

  /**
   * Find invitation by ID
   */
  static async findById(id: string): Promise<Invitation | null> {
    const invitation = await prisma.invitation.findUnique({
      where: { id },
    });

    return invitation ? this.mapPrismaToInvitation(invitation) : null;
  }

  /**
   * Find invitation by token
   */
  static async findByToken(token: string): Promise<Invitation | null> {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    return invitation ? this.mapPrismaToInvitation(invitation) : null;
  }

  /**
   * Find all invitations by email
   */
  static async findByEmail(email: string): Promise<Invitation[]> {
    const invitations = await prisma.invitation.findMany({
      where: { email: email.toLowerCase() },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => this.mapPrismaToInvitation(inv));
  }

  /**
   * Find all invitations by company ID
   */
  static async findByCompanyId(companyId: string): Promise<Invitation[]> {
    const invitations = await prisma.invitation.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => this.mapPrismaToInvitation(inv));
  }

  /**
   * Update invitation status
   */
  static async updateStatus(
    id: string,
    status: InvitationStatus
  ): Promise<Invitation> {
    const updateData: {
      status: InvitationStatus;
      acceptedAt?: Date;
    } = { status };

    // Set acceptedAt if status is ACCEPTED
    if (status === InvitationStatus.ACCEPTED) {
      updateData.acceptedAt = new Date();
    }

    const invitation = await prisma.invitation.update({
      where: { id },
      data: updateData,
    });

    return this.mapPrismaToInvitation(invitation);
  }

  /**
   * Find all expired invitations
   */
  static async findExpired(): Promise<Invitation[]> {
    const now = new Date();
    const invitations = await prisma.invitation.findMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: {
          lt: now,
        },
      },
    });

    return invitations.map((inv) => this.mapPrismaToInvitation(inv));
  }

  /**
   * Delete expired invitations
   */
  static async deleteExpired(): Promise<number> {
    const now = new Date();
    const result = await prisma.invitation.deleteMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: {
          lt: now,
        },
      },
    });

    return result.count;
  }

  /**
   * Delete invitation by ID
   */
  static async deleteById(id: string): Promise<void> {
    await prisma.invitation.delete({
      where: { id },
    });
  }

  /**
   * Check if pending invitation exists for email and company
   */
  static async hasPendingInvitation(
    email: string,
    companyId: string
  ): Promise<boolean> {
    const count = await prisma.invitation.count({
      where: {
        email: email.toLowerCase(),
        companyId,
        status: InvitationStatus.PENDING,
      },
    });

    return count > 0;
  }

  /**
   * Map Prisma invitation model to our Invitation interface
   */
  private static mapPrismaToInvitation(prismaInvitation: {
    id: string;
    companyId: string;
    invitedBy: string;
    email: string;
    token: string;
    status: InvitationStatus;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date;
  }): Invitation {
    return {
      id: prismaInvitation.id,
      companyId: prismaInvitation.companyId,
      invitedBy: prismaInvitation.invitedBy,
      email: prismaInvitation.email,
      token: prismaInvitation.token,
      status: prismaInvitation.status,
      expiresAt: prismaInvitation.expiresAt,
      acceptedAt: prismaInvitation.acceptedAt || undefined,
      createdAt: prismaInvitation.createdAt,
    };
  }
}
