/**
 * Candidate Controller
 * Handles HTTP requests for candidate profile management
 */

import { Response } from 'express';
import { CandidateService, UpdateCandidateProfileRequest } from '../../services/candidate/CandidateService';
import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';

export class CandidateController {
  /**
   * Get candidate profile
   * GET /api/candidate/profile
   */
  static async getProfile(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const candidate = req.candidate;

      if (!candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const profile = await CandidateService.getProfile(candidate.id);

      if (!profile) {
        res.status(404).json({
          success: false,
          error: 'Profile not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          profile: {
            id: profile.id,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            phone: profile.phone,
            photo: profile.photo,
            linkedInUrl: profile.linkedInUrl,
            city: profile.city,
            state: profile.state,
            country: profile.country,
            // Work Eligibility & Visa
            visaStatus: profile.visaStatus,
            workEligibility: profile.workEligibility,
            // Job Preferences
            jobTypePreference: profile.jobTypePreference,
            salaryPreference: profile.salaryPreference,
            willingToRelocate: profile.relocationWilling,
            remotePreference: profile.remotePreference,
            // Account Status
            emailVerified: profile.emailVerified,
            status: profile.status,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get profile',
      });
    }
  }

  /**
   * Update candidate profile
   * PUT /api/candidate/profile
   */
  static async updateProfile(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const candidate = req.candidate;

      if (!candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const profileData: UpdateCandidateProfileRequest = req.body;

      const updatedProfile = await CandidateService.updateProfile(candidate.id, profileData);

      res.json({
        success: true,
        data: {
          profile: {
            id: updatedProfile.id,
            email: updatedProfile.email,
            firstName: updatedProfile.firstName,
            lastName: updatedProfile.lastName,
            phone: updatedProfile.phone,
            photo: updatedProfile.photo,
            linkedInUrl: updatedProfile.linkedInUrl,
            city: updatedProfile.city,
            state: updatedProfile.state,
            country: updatedProfile.country,
            // Work Eligibility & Visa
            visaStatus: updatedProfile.visaStatus,
            workEligibility: updatedProfile.workEligibility,
            // Job Preferences
            jobTypePreference: updatedProfile.jobTypePreference,
            salaryPreference: updatedProfile.salaryPreference,
            willingToRelocate: updatedProfile.relocationWilling,
            remotePreference: updatedProfile.remotePreference,
            // Account Status
            emailVerified: updatedProfile.emailVerified,
            status: updatedProfile.status,
            createdAt: updatedProfile.createdAt,
            updatedAt: updatedProfile.updatedAt,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
      });
    }
  }

  /**
   * Update candidate password
   * PUT /api/candidate/profile/password
   */
  static async updatePassword(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const candidate = req.candidate;

      if (!candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: currentPassword, newPassword',
        });
        return;
      }

      const result = await CandidateService.updatePassword(candidate.id, currentPassword, newPassword);

      // Check if service returned an error
      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      res.json({
        success: true,
        message: 'Password updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update password',
      });
    }
  }
  /**
   * Export candidate data
   * GET /api/candidate/profile/export
   */
  static async exportData(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const candidate = req.candidate;

      if (!candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const data = await CandidateService.exportCandidateData(candidate.id);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=candidate-data-${candidate.id}.json`);
      res.json(data);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export data',
      });
    }
  }

  /**
   * Delete candidate account
   * DELETE /api/candidate/profile
   */
  static async deleteAccount(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const candidate = req.candidate;

      if (!candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { password } = req.body;

      // Require password confirmation for security
      if (!password) {
        res.status(400).json({
          success: false,
          error: 'Password is required to delete account',
        });
        return;
      }

      // Verify password first (using service internal helper or re-implementing verify here)
      // Since CandidateService doesn't expose a verifyPassword method directly efficiently w/o fetching, 
      // we'll use the updatePassword logic pattern or rely on a new service method.
      // For now, let's reuse updatePassword's verification step equivalent or manual import.
      const { comparePassword } = await import('../../utils/password');
      const { CandidateModel } = await import('../../models/Candidate');

      const candidateRecord = await CandidateModel.findById(candidate.id);
      if (!candidateRecord) {
        res.status(404).json({ success: false, error: 'Candidate not found' });
        return;
      }

      const isValid = await comparePassword(password, candidateRecord.passwordHash);
      if (!isValid) {
        res.status(401).json({
          success: false,
          error: 'Incorrect password',
        });
        return;
      }

      await CandidateService.deleteCandidate(candidate.id);

      // Clear session cookie
      const { getSessionCookieOptions } = await import('../../utils/session');
      res.clearCookie('candidateSessionId', getSessionCookieOptions());

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete account',
      });
    }
  }
}

