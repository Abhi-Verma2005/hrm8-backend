/**
 * Candidate Service
 * Handles candidate profile management
 */

import { CandidateModel, CandidateData } from '../../models/Candidate';

export interface UpdateCandidateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  photo?: string;
  linkedInUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  visaStatus?: string;
  workEligibility?: string;
  requiresSponsorship?: boolean;
  jobTypePreference?: string[];
  expectedSalaryMin?: string;
  expectedSalaryMax?: string;
  salaryCurrency?: string;
  salaryPreference?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  relocationWilling?: boolean;
  preferredLocations?: string;
  remotePreference?: string;

  // Privacy & Visibility
  profileVisibility?: string;
  showContactInfo?: boolean;
  showSalaryExpectations?: boolean;
  allowRecruiterContact?: boolean;
}

export class CandidateService {
  /**
   * Get candidate profile by ID
   */
  static async getProfile(candidateId: string): Promise<CandidateData | null> {
    return await CandidateModel.findById(candidateId);
  }

  /**
   * Update candidate profile
   */
  static async updateProfile(
    candidateId: string,
    profileData: UpdateCandidateProfileRequest
  ): Promise<CandidateData> {
    return await CandidateModel.update(candidateId, profileData);
  }

  /**
   * Update candidate password
   */
  static async updatePassword(
    candidateId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: true } | { error: string; code?: string }> {
    const candidate = await CandidateModel.findById(candidateId);
    if (!candidate) {
      return { error: 'Candidate not found', code: 'CANDIDATE_NOT_FOUND' };
    }

    // Verify current password
    const { comparePassword } = await import('../../utils/password');
    const isValid = await comparePassword(currentPassword, candidate.passwordHash);
    if (!isValid) {
      return { error: 'Current password is incorrect', code: 'INVALID_PASSWORD' };
    }

    // Validate new password strength
    const { isPasswordStrong, hashPassword } = await import('../../utils/password');
    if (!isPasswordStrong(newPassword)) {
      return { error: 'Password must be at least 8 characters with uppercase, lowercase, and number', code: 'WEAK_PASSWORD' };
    }

    // Hash and update password
    try {
      const passwordHash = await hashPassword(newPassword);
      await CandidateModel.updatePassword(candidateId, passwordHash);
      return { success: true };
    } catch (error: any) {
      return { error: error.message || 'Failed to update password', code: 'UPDATE_FAILED' };
    }
  }

  /**
   * Verify candidate email
   */
  static async verifyEmail(candidateId: string): Promise<void> {
    await CandidateModel.verifyEmail(candidateId);
  }

  /**
   * Add work experience
   */
  static async addWorkExperience(candidateId: string, data: any) {
    const { prisma } = await import('../../lib/prisma');
    return await prisma.candidateWorkExperience.create({
      data: {
        candidate_id: candidateId,
        ...data,
      },
    });
  }

  /**
   * Update work experience
   */
  static async updateWorkExperience(candidateId: string, experienceId: string, data: any) {
    const { prisma } = await import('../../lib/prisma');

    // Verify ownership
    const experience = await prisma.candidateWorkExperience.findFirst({
      where: { id: experienceId, candidate_id: candidateId },
    });

    if (!experience) {
      throw new Error('Work experience not found');
    }

    return await prisma.candidateWorkExperience.update({
      where: { id: experienceId },
      data,
    });
  }

  /**
   * Delete work experience
   */
  static async deleteWorkExperience(candidateId: string, experienceId: string) {
    const { prisma } = await import('../../lib/prisma');

    // Verify ownership
    const experience = await prisma.candidateWorkExperience.findFirst({
      where: { id: experienceId, candidate_id: candidateId },
    });

    if (!experience) {
      throw new Error('Work experience not found');
    }

    return await prisma.candidateWorkExperience.delete({
      where: { id: experienceId },
    });
  }

  /**
   * Update skills
   * Replaces all skills for the candidate
   */
  static async updateSkills(candidateId: string, skills: { name: string; level?: string }[]) {
    const { prisma } = await import('../../lib/prisma');

    // Transaction to delete old skills and add new ones
    return await prisma.$transaction(async (tx) => {
      // Delete existing skills
      await tx.candidateSkill.deleteMany({
        where: { candidate_id: candidateId },
      });

      // Create new skills
      if (skills.length > 0) {
        const { randomUUID } = await import('crypto');
        await tx.candidateSkill.createMany({
          data: skills.map(skill => ({
            id: randomUUID(),
            candidate_id: candidateId,
            name: skill.name,
            level: skill.level,
          })),
        });
      }

      return await tx.candidateSkill.findMany({
        where: { candidate_id: candidateId },
      });
    });
  }

  /**
   * Get work history
   */
  static async getWorkHistory(candidateId: string) {
    const { prisma } = await import('../../lib/prisma');
    return await prisma.candidateWorkExperience.findMany({
      where: { candidate_id: candidateId },
      orderBy: { start_date: 'desc' },
    });
  }

  /**
   * Get skills
   */
  static async getSkills(candidateId: string) {
    const { prisma } = await import('../../lib/prisma');
    return await prisma.candidateSkill.findMany({
      where: { candidate_id: candidateId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Delete all work experience for a candidate
   */
  static async deleteAllWorkExperience(candidateId: string) {
    const { prisma } = await import('../../lib/prisma');
    return await prisma.candidateWorkExperience.deleteMany({
      where: { candidate_id: candidateId },
    });
  }

  /**
   * Delete all skills for a candidate
   */
  static async deleteAllSkills(candidateId: string) {
    const { prisma } = await import('../../lib/prisma');
    return await prisma.candidateSkill.deleteMany({
      where: { candidate_id: candidateId },
    });
  }
}

