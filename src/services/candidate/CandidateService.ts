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
  jobTypePreference?: string[];
  salaryPreference?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  relocationWilling?: boolean;
  remotePreference?: string;
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
}

