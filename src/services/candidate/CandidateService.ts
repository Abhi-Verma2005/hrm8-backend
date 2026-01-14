/**
 * Candidate Service
 * Handles candidate profile management
 */

import { CandidateModel, CandidateData } from '../../models/Candidate';
import { prisma } from '../../lib/prisma';
import { randomUUID } from 'crypto';
import { comparePassword, isPasswordStrong, hashPassword } from '../../utils/password';

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
  jobTypePreference?: string[];
  salaryPreference?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  relocationWilling?: boolean;
  remotePreference?: string;
  resumeUrl?: string;
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
    const isValid = await comparePassword(currentPassword, candidate.passwordHash);
    if (!isValid) {
      return { error: 'Current password is incorrect', code: 'INVALID_PASSWORD' };
    }

    // Validate new password strength
    if (!isPasswordStrong(newPassword)) {
      return { error: 'Password must be at least 8 characters with uppercase, lowercase, and number', code: 'WEAK_PASSWORD' };
    }

    // Hash and update password
    try {
      const newPasswordHash = await hashPassword(newPassword);
      await CandidateModel.updatePassword(candidateId, newPasswordHash);
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
    // Map camelCase to snake_case and ensure ID
    const workExperienceData = {
      id: data.id || randomUUID(),
      candidate_id: candidateId,
      company: data.company,
      role: data.role,
      start_date: new Date(data.startDate || data.start_date),
      end_date: data.endDate || data.end_date ? new Date(data.endDate || data.end_date) : null,
      current: data.current || false,
      description: data.description,
      location: data.location,
      updated_at: new Date(),
    };

    return await prisma.candidateWorkExperience.create({
      data: workExperienceData,
    });
  }

  /**
   * Update work experience
   */
  static async updateWorkExperience(candidateId: string, experienceId: string, data: any) {
    // Verify ownership
    const experience = await prisma.candidateWorkExperience.findFirst({
      where: { id: experienceId, candidate_id: candidateId },
    });

    if (!experience) {
      throw new Error('Work experience not found');
    }

    const updateData: any = { ...data, updated_at: new Date() };

    // Map camelCase to snake_case if they exist in data
    if (data.startDate) {
      updateData.start_date = new Date(data.startDate);
      delete updateData.startDate;
    }
    if (data.endDate) {
      updateData.end_date = new Date(data.endDate);
      delete updateData.endDate;
    }

    return await prisma.candidateWorkExperience.update({
      where: { id: experienceId },
      data: updateData,
    });
  }

  /**
   * Delete work experience
   */
  static async deleteWorkExperience(candidateId: string, experienceId: string) {
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
    // Transaction to delete old skills and add new ones
    return await prisma.$transaction(async (tx) => {
      // Delete existing skills
      await tx.candidateSkill.deleteMany({
        where: { candidate_id: candidateId },
      });

      // Create new skills
      if (skills.length > 0) {
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
    return await prisma.candidateWorkExperience.findMany({
      where: { candidate_id: candidateId },
      orderBy: { start_date: 'desc' },
    });
  }

  /**
   * Get skills
   */
  static async getSkills(candidateId: string) {
    return await prisma.candidateSkill.findMany({
      where: { candidate_id: candidateId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Delete all work experience for a candidate
   */
  static async deleteAllWorkExperience(candidateId: string) {
    return await prisma.candidateWorkExperience.deleteMany({
      where: { candidate_id: candidateId },
    });
  }

  /**
   * Delete all skills for a candidate
   */
  static async deleteAllSkills(candidateId: string) {
    return await prisma.candidateSkill.deleteMany({
      where: { candidate_id: candidateId },
    });
  }

  /**
   * Export candidate data
   */
  static async exportCandidateData(candidateId: string) {
    const candidate = await this.getProfile(candidateId);
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    const [workHistory, skills, education, certifications, training, resumes, coverLetters, portfolio] = await Promise.all([
      this.getWorkHistory(candidateId),
      this.getSkills(candidateId),
      prisma.candidateEducation.findMany({ where: { candidate_id: candidateId } }),
      prisma.candidateCertification.findMany({ where: { candidate_id: candidateId } }),
      prisma.candidateTraining.findMany({ where: { candidate_id: candidateId } }),
      prisma.candidateResume.findMany({ where: { candidate_id: candidateId } }),
      prisma.candidateCoverLetter.findMany({ where: { candidate_id: candidateId } }),
      prisma.candidatePortfolio.findMany({ where: { candidate_id: candidateId } }),
    ]);

    return {
      profile: candidate,
      workHistory,
      skills,
      education,
      certifications,
      training,
      documents: {
        resumes,
        coverLetters,
        portfolio
      },
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Delete candidate account
   */
  static async deleteCandidate(candidateId: string) {
    // Start a transaction to delete all related data
    return await prisma.$transaction(async (tx) => {
      // 1. Delete dependent data
      await tx.candidateWorkExperience.deleteMany({ where: { candidate_id: candidateId } });
      await tx.candidateSkill.deleteMany({ where: { candidate_id: candidateId } });
      await tx.candidateEducation.deleteMany({ where: { candidate_id: candidateId } });
      await tx.candidateCertification.deleteMany({ where: { candidate_id: candidateId } });
      await tx.candidateTraining.deleteMany({ where: { candidate_id: candidateId } });
      // Documents are split across tables
      await tx.candidateResume.deleteMany({ where: { candidate_id: candidateId } });
      await tx.candidateCoverLetter.deleteMany({ where: { candidate_id: candidateId } });
      await tx.candidatePortfolio.deleteMany({ where: { candidate_id: candidateId } });

      await tx.jobAlert.deleteMany({ where: { candidate_id: candidateId } });
      await tx.savedJob.deleteMany({ where: { candidate_id: candidateId } });
      await tx.savedSearch.deleteMany({ where: { candidate_id: candidateId } });
      await tx.candidateSession.deleteMany({ where: { candidate_id: candidateId } });

      // Note: We might want to keep applications but anonymize them, 
      // or strictly delete depending on policy. For now, we'll keep applications 
      // but nullify the candidate reference if the schema allows, or cascaded delete 
      // will fail if FK constraints exist. Assuming Cascade Delete is configured in DB 
      // or manual deletion is required. 
      // If we need to delete applications:
      // await tx.application.deleteMany({ where: { candidate_id: candidateId } });

      // 2. Delete the candidate
      return await tx.candidate.delete({
        where: { id: candidateId },
      });
    });
  }
}
