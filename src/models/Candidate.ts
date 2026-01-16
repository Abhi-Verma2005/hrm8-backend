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
  resumeUrl?: string | null;

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
        password_hash: candidateData.passwordHash,
        first_name: candidateData.firstName,
        last_name: candidateData.lastName,
        phone: candidateData.phone,
        status: 'ACTIVE',
        email_verified: false,
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
    const mappedData: any = {};
    if (updateData.email) mappedData.email = updateData.email;
    if (updateData.firstName) mappedData.first_name = updateData.firstName;
    if (updateData.lastName) mappedData.last_name = updateData.lastName;
    if (updateData.phone) mappedData.phone = updateData.phone;
    if (updateData.photo) mappedData.photo = updateData.photo;
    if (updateData.linkedInUrl) mappedData.linked_in_url = updateData.linkedInUrl;
    if (updateData.city) mappedData.city = updateData.city;
    if (updateData.state) mappedData.state = updateData.state;
    if (updateData.country) mappedData.country = updateData.country;
    if (updateData.visaStatus) mappedData.visa_status = updateData.visaStatus;
    if (updateData.workEligibility) mappedData.work_eligibility = updateData.workEligibility;
    if (updateData.jobTypePreference) mappedData.job_type_preference = updateData.jobTypePreference;
    if (updateData.salaryPreference) mappedData.salary_preference = updateData.salaryPreference;
    if (updateData.relocationWilling !== undefined) mappedData.relocation_willing = updateData.relocationWilling;
    if (updateData.remotePreference) mappedData.remote_preference = updateData.remotePreference;
    if (updateData.resumeUrl !== undefined) mappedData.resume_url = updateData.resumeUrl;
    if (updateData.emailVerified !== undefined) mappedData.email_verified = updateData.emailVerified;
    if (updateData.status) mappedData.status = updateData.status;
    if (updateData.lastLoginAt) mappedData.last_login_at = updateData.lastLoginAt;

    const candidate = await prisma.candidate.update({
      where: { id },
      data: mappedData,
    });

    return this.mapPrismaToCandidate(candidate);
  }

  /**
   * Update password
   */
  static async updatePassword(id: string, passwordHash: string): Promise<void> {
    await prisma.candidate.update({
      where: { id },
      data: { password_hash: passwordHash },
    });
  }

  /**
   * Update last login
   */
  static async updateLastLogin(id: string): Promise<void> {
    await prisma.candidate.update({
      where: { id },
      data: { last_login_at: new Date() },
    });
  }

  /**
   * Verify email
   */
  static async verifyEmail(id: string): Promise<void> {
    await prisma.candidate.update({
      where: { id },
      data: { email_verified: true },
    });
  }

  /**
   * Update email verified status
   */
  static async updateEmailVerified(id: string, emailVerified: boolean): Promise<void> {
    await prisma.candidate.update({
      where: { id },
      data: { email_verified: emailVerified },
    });
  }

  /**
   * Update candidate status
   */
  static async updateStatus(id: string, status: CandidateStatus): Promise<void> {
    await prisma.candidate.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Search candidates in talent pool (for recruiters)
   */
  static async searchTalentPool(filters: {
    search?: string;
    city?: string;
    state?: string;
    country?: string;
    status?: CandidateStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ candidates: CandidateData[]; total: number }> {
    const { search, city, state, country, status, limit = 50, offset = 0 } = filters;

    const where: any = {
      status: status || 'ACTIVE',
    };

    // Search by name or email
    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (state) {
      where.state = { contains: state, mode: 'insensitive' };
    }

    if (country) {
      where.country = { contains: country, mode: 'insensitive' };
    }

    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
      }),
      prisma.candidate.count({ where }),
    ]);

    return {
      candidates: candidates.map(c => this.mapPrismaToCandidate(c)),
      total,
    };
  }

  /**
   * Map Prisma candidate to CandidateData interface
   */
  private static mapPrismaToCandidate(prismaCandidate: any): CandidateData {
    return {
      id: prismaCandidate.id,
      email: prismaCandidate.email,
      passwordHash: prismaCandidate.password_hash,
      firstName: prismaCandidate.first_name,
      lastName: prismaCandidate.last_name,
      phone: prismaCandidate.phone,
      photo: prismaCandidate.photo,
      linkedInUrl: prismaCandidate.linked_in_url,
      city: prismaCandidate.city,
      state: prismaCandidate.state,
      country: prismaCandidate.country,
      visaStatus: prismaCandidate.visa_status,
      workEligibility: prismaCandidate.work_eligibility,
      jobTypePreference: prismaCandidate.job_type_preference || [],
      salaryPreference: prismaCandidate.salary_preference as any,
      relocationWilling: prismaCandidate.relocation_willing,
      remotePreference: prismaCandidate.remote_preference,
      resumeUrl: prismaCandidate.resume_url,

      emailVerified: prismaCandidate.email_verified,
      status: prismaCandidate.status,
      lastLoginAt: prismaCandidate.last_login_at,
      createdAt: prismaCandidate.created_at,
      updatedAt: prismaCandidate.updated_at,
    };
  }
}

