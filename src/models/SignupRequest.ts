/**
 * SignupRequest Model
 * Represents a signup request from an employee who wants to join a company
 */

import { SignupRequest, SignupRequestStatus } from '../types';
import prisma from '../lib/prisma';

export class SignupRequestModel {
  /**
   * Create a new signup request
   */
  static async create(
    signupRequestData: Omit<SignupRequest, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SignupRequest> {
    const signupRequest = await prisma.signupRequest.create({
      data: {
        companyId: signupRequestData.companyId,
        email: signupRequestData.email.toLowerCase(),
        name: signupRequestData.name,
        passwordHash: signupRequestData.passwordHash,
        status: signupRequestData.status,
        reviewedBy: signupRequestData.reviewedBy,
        reviewedAt: signupRequestData.reviewedAt,
        rejectionReason: signupRequestData.rejectionReason,
      },
    });

    return this.mapPrismaToSignupRequest(signupRequest);
  }

  /**
   * Find signup request by ID
   */
  static async findById(id: string): Promise<SignupRequest | null> {
    const signupRequest = await prisma.signupRequest.findUnique({
      where: { id },
    });

    return signupRequest ? this.mapPrismaToSignupRequest(signupRequest) : null;
  }

  /**
   * Find signup request by email and company ID
   */
  static async findByEmailAndCompany(
    email: string,
    companyId: string
  ): Promise<SignupRequest | null> {
    const signupRequest = await prisma.signupRequest.findFirst({
      where: {
        email: email.toLowerCase(),
        companyId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return signupRequest ? this.mapPrismaToSignupRequest(signupRequest) : null;
  }

  /**
   * Find all pending signup requests for a company
   */
  static async findPendingByCompanyId(
    companyId: string
  ): Promise<SignupRequest[]> {
    const signupRequests = await prisma.signupRequest.findMany({
      where: {
        companyId,
        status: SignupRequestStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    return signupRequests.map((sr) => this.mapPrismaToSignupRequest(sr));
  }

  /**
   * Find all signup requests for a company
   */
  static async findByCompanyId(
    companyId: string
  ): Promise<SignupRequest[]> {
    const signupRequests = await prisma.signupRequest.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return signupRequests.map((sr) => this.mapPrismaToSignupRequest(sr));
  }

  /**
   * Update signup request status
   */
  static async updateStatus(
    id: string,
    status: SignupRequestStatus,
    reviewedBy?: string,
    rejectionReason?: string
  ): Promise<SignupRequest> {
    const updateData: {
      status: SignupRequestStatus;
      reviewedBy?: string;
      reviewedAt?: Date;
      rejectionReason?: string;
    } = {
      status,
    };

    if (reviewedBy) {
      updateData.reviewedBy = reviewedBy;
      updateData.reviewedAt = new Date();
    }

    if (rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const signupRequest = await prisma.signupRequest.update({
      where: { id },
      data: updateData,
    });

    return this.mapPrismaToSignupRequest(signupRequest);
  }

  /**
   * Delete signup request by ID
   */
  static async deleteById(id: string): Promise<void> {
    await prisma.signupRequest.delete({
      where: { id },
    });
  }

  /**
   * Check if pending signup request exists for email and company
   */
  static async hasPendingSignupRequest(
    email: string,
    companyId: string
  ): Promise<boolean> {
    const count = await prisma.signupRequest.count({
      where: {
        email: email.toLowerCase(),
        companyId,
        status: SignupRequestStatus.PENDING,
      },
    });

    return count > 0;
  }

  /**
   * Map Prisma signup request model to our SignupRequest interface
   */
  private static mapPrismaToSignupRequest(prismaSignupRequest: {
    id: string;
    companyId: string;
    email: string;
    name: string;
    passwordHash: string;
    status: SignupRequestStatus;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    rejectionReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SignupRequest {
    return {
      id: prismaSignupRequest.id,
      companyId: prismaSignupRequest.companyId,
      email: prismaSignupRequest.email,
      name: prismaSignupRequest.name,
      passwordHash: prismaSignupRequest.passwordHash,
      status: prismaSignupRequest.status,
      reviewedBy: prismaSignupRequest.reviewedBy || undefined,
      reviewedAt: prismaSignupRequest.reviewedAt || undefined,
      rejectionReason: prismaSignupRequest.rejectionReason || undefined,
      createdAt: prismaSignupRequest.createdAt,
      updatedAt: prismaSignupRequest.updatedAt,
    };
  }
}

