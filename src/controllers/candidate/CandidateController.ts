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
            requiresSponsorship: profile.requiresSponsorship,
            // Job Preferences
            jobTypePreference: profile.jobTypePreference,
            expectedSalaryMin: profile.expectedSalaryMin,
            expectedSalaryMax: profile.expectedSalaryMax,
            salaryCurrency: profile.salaryCurrency,
            salaryPreference: profile.salaryPreference,
            willingToRelocate: profile.relocationWilling,
            preferredLocations: profile.preferredLocations,
            remotePreference: profile.remotePreference,
            // Privacy & Visibility
            profileVisibility: profile.profileVisibility,
            showContactInfo: profile.showContactInfo,
            showSalaryExpectations: profile.showSalaryExpectations,
            allowRecruiterContact: profile.allowRecruiterContact,
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
            requiresSponsorship: updatedProfile.requiresSponsorship,
            // Job Preferences
            jobTypePreference: updatedProfile.jobTypePreference,
            expectedSalaryMin: updatedProfile.expectedSalaryMin,
            expectedSalaryMax: updatedProfile.expectedSalaryMax,
            salaryCurrency: updatedProfile.salaryCurrency,
            salaryPreference: updatedProfile.salaryPreference,
            willingToRelocate: updatedProfile.relocationWilling,
            preferredLocations: updatedProfile.preferredLocations,
            remotePreference: updatedProfile.remotePreference,
            // Privacy & Visibility
            profileVisibility: updatedProfile.profileVisibility,
            showContactInfo: updatedProfile.showContactInfo,
            showSalaryExpectations: updatedProfile.showSalaryExpectations,
            allowRecruiterContact: updatedProfile.allowRecruiterContact,
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
}

