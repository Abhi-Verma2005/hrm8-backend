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
        company_id: signupRequestData.companyId,
        email: signupRequestData.email.toLowerCase(),
        name: signupRequestData.name,
        first_name: signupRequestData.firstName,
        last_name: signupRequestData.lastName,
        accepted_terms: signupRequestData.acceptedTerms,
        password_hash: signupRequestData.passwordHash,
        status: signupRequestData.status as any,
        reviewed_by: signupRequestData.reviewedBy,
        reviewed_at: signupRequestData.reviewedAt,
        rejection_reason: signupRequestData.rejectionReason,
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
        company_id: companyId,
      },
      orderBy: { created_at: 'desc' },
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
        company_id: companyId,
        status: SignupRequestStatus.PENDING as any,
      },
      orderBy: { created_at: 'desc' },
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
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
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
      status: any;
      reviewed_by?: string;
      reviewed_at?: Date;
      rejection_reason?: string;
    } = {
      status,
    };

    if (reviewedBy) {
      updateData.reviewed_by = reviewedBy;
      updateData.reviewed_at = new Date();
    }

    if (rejectionReason) {
      updateData.rejection_reason = rejectionReason;
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
        company_id: companyId,
        status: SignupRequestStatus.PENDING as any,
      },
    });

    return count > 0;
  }

  /**
   * Map Prisma signup request model to our SignupRequest interface
   */
  private static mapPrismaToSignupRequest(prismaSignupRequest: any): SignupRequest {
    return {
      id: prismaSignupRequest.id,
      companyId: prismaSignupRequest.company_id,
      email: prismaSignupRequest.email,
      name: prismaSignupRequest.name,
      firstName: prismaSignupRequest.first_name,
      lastName: prismaSignupRequest.last_name,
      acceptedTerms: prismaSignupRequest.accepted_terms,
      passwordHash: prismaSignupRequest.password_hash,
      status: prismaSignupRequest.status as SignupRequestStatus,
      reviewedBy: prismaSignupRequest.reviewed_by || undefined,
      reviewedAt: prismaSignupRequest.reviewed_at || undefined,
      rejectionReason: prismaSignupRequest.rejection_reason || undefined,
      createdAt: prismaSignupRequest.created_at,
      updatedAt: prismaSignupRequest.updated_at,
    };
  }
}

