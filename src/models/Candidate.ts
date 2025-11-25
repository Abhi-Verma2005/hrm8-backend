/**
 * Candidate Model
 * Represents job seekers/candidates in the HRM8 system
 */

import prisma from '../lib/prisma';

export type CandidateStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_VERIFICATION';

export interface CandidateData {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  photo?: string;
  linkedInUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  visaStatus?: string;
  workEligibility?: string;
  jobTypePreference: string[];
  salaryPreference?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  relocationWilling?: boolean;
  remotePreference?: string;
  emailVerified: boolean;
  status: CandidateStatus;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class CandidateModel {
  /**
   * Create a new candidate
   */
  static async create(candidateData: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<CandidateData> {
    const candidate = await prisma.candidate.create({
      data: {
        email: candidateData.email,
        passwordHash: candidateData.passwordHash,
        firstName: candidateData.firstName,
        lastName: candidateData.lastName,
        phone: candidateData.phone,
        status: 'ACTIVE',
        emailVerified: false,
      },
    });

    return this.mapPrismaToCandidate(candidate);
  }

  /**
   * Find candidate by ID
   */
  static async findById(id: string): Promise<CandidateData | null> {
    const candidate = await prisma.candidate.findUnique({
      where: { id },
    });

    if (!candidate) {
      return null;
    }

    return this.mapPrismaToCandidate(candidate);
  }

  /**
   * Find candidate by email
   */
  static async findByEmail(email: string): Promise<CandidateData | null> {
    const candidate = await prisma.candidate.findUnique({
      where: { email },
    });

    if (!candidate) {
      return null;
    }

    return this.mapPrismaToCandidate(candidate);
  }

  /**
   * Update candidate
   */
  static async update(
    id: string,
    updateData: Partial<Omit<CandidateData, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'>>
  ): Promise<CandidateData> {
    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        ...updateData,
        salaryPreference: updateData.salaryPreference as any,
      },
    });

    return this.mapPrismaToCandidate(candidate);
  }

  /**
   * Update password
   */
  static async updatePassword(id: string, passwordHash: string): Promise<void> {
    await prisma.candidate.update({
      where: { id },
      data: { passwordHash },
    });
  }

  /**
   * Update last login
   */
  static async updateLastLogin(id: string): Promise<void> {
    await prisma.candidate.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Verify email
   */
  static async verifyEmail(id: string): Promise<void> {
    await prisma.candidate.update({
      where: { id },
      data: { emailVerified: true },
    });
  }

  /**
   * Map Prisma candidate to CandidateData interface
   */
  private static mapPrismaToCandidate(prismaCandidate: any): CandidateData {
    return {
      id: prismaCandidate.id,
      email: prismaCandidate.email,
      passwordHash: prismaCandidate.passwordHash,
      firstName: prismaCandidate.firstName,
      lastName: prismaCandidate.lastName,
      phone: prismaCandidate.phone,
      photo: prismaCandidate.photo,
      linkedInUrl: prismaCandidate.linkedInUrl,
      city: prismaCandidate.city,
      state: prismaCandidate.state,
      country: prismaCandidate.country,
      visaStatus: prismaCandidate.visaStatus,
      workEligibility: prismaCandidate.workEligibility,
      jobTypePreference: prismaCandidate.jobTypePreference || [],
      salaryPreference: prismaCandidate.salaryPreference as any,
      relocationWilling: prismaCandidate.relocationWilling,
      remotePreference: prismaCandidate.remotePreference,
      emailVerified: prismaCandidate.emailVerified,
      status: prismaCandidate.status,
      lastLoginAt: prismaCandidate.lastLoginAt,
      createdAt: prismaCandidate.createdAt,
      updatedAt: prismaCandidate.updatedAt,
    };
  }
}

