/**
 * Company Controller
 * Handles HTTP requests for company-related endpoints
 */

import { Request, Response } from 'express';
import { CompanyService } from '../../services/company/CompanyService';
import { VerificationService } from '../../services/verification/VerificationService';
import { CompanyProfileService } from '../../services/company/CompanyProfileService';
import { CompanyStatsService } from '../../services/company/CompanyStatsService';
import { UpdateCompanyProfileRequest, AuthenticatedRequest, JobAssignmentMode } from '../../types';
import { CompanyModel } from '../../models/Company';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const companyStatsService = new CompanyStatsService(prisma);

export class CompanyController {
  /**
   * Get company details
   * GET /api/companies/:id
   */
  static async getCompany(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const company = await CompanyService.findById(id);

      if (!company) {
        res.status(404).json({
          success: false,
          error: 'Company not found',
        });
        return;
      }

      res.json({
        success: true,
        data: company,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch company',
      });
    }
  }

  /**
   * Get company verification status
   * GET /api/companies/:id/verification-status
   */
  static async getVerificationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const status = await CompanyService.getVerificationStatus(id);

      if (status === null) {
        res.status(404).json({
          success: false,
          error: 'Company not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { status },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch verification status',
      });
    }
  }

  /**
   * Verify company via email token
   * POST /api/companies/:id/verify/email
   */
  static async verifyByEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { token } = req.body;

      const verified = await VerificationService.verifyByEmailToken(id, token);

      if (!verified) {
        res.status(400).json({
          success: false,
          error: 'Invalid or expired verification token',
        });
        return;
      }

      res.json({
        success: true,
        data: { message: 'Company verified successfully' },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      });
    }
  }

  /**
   * Initiate manual verification
   * POST /api/companies/:id/verify/manual
   */
  static async initiateManualVerification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { gstNumber, registrationNumber, linkedInUrl } = req.body;

      await VerificationService.initiateManualVerification(id, {
        gstNumber,
        registrationNumber,
        linkedInUrl,
      });

      res.json({
        success: true,
        data: {
          message: 'Verification request submitted. Our team will review it shortly.'
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate verification',
      });
    }
  }

  /**
   * Get company onboarding profile
   * GET /api/companies/:id/profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = await CompanyProfileService.getProgress(id);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load profile',
      });
    }
  }

  /**
   * Update onboarding profile section
   * PUT /api/companies/:id/profile
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const payload: UpdateCompanyProfileRequest = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const profile = await CompanyProfileService.updateSection(id, payload, userId);

      res.json({
        success: true,
        data: {
          profile,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
      });
    }
  }

  /**
   * Complete onboarding profile
   * POST /api/companies/:id/profile/complete
   */
  static async completeProfile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const profile = await CompanyProfileService.completeProfile(id);

      res.json({
        success: true,
        data: {
          profile,
          message: 'Company profile completed successfully.',
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete profile',
      });
    }
  }

  /**
   * Get job assignment settings
   * GET /api/companies/:id/job-assignment-settings
   */
  static async getJobAssignmentSettings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const settings = await CompanyModel.getJobAssignmentSettings(id);

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch job assignment settings',
      });
    }
  }

  /**
   * Update job assignment mode
   * PUT /api/companies/:id/job-assignment-mode
   */
  static async updateJobAssignmentMode(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { mode } = req.body;

      if (!mode || (mode !== 'AUTO_RULES_ONLY' && mode !== 'MANUAL_ONLY')) {
        res.status(400).json({
          success: false,
          error: 'Invalid mode. Must be AUTO_RULES_ONLY or MANUAL_ONLY',
        });
        return;
      }

      const company = await CompanyModel.updateJobAssignmentMode(id, mode as JobAssignmentMode);

      res.json({
        success: true,
        data: {
          company,
          message: 'Job assignment mode updated successfully',
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update job assignment mode',
      });
    }
  }

  /**
   * Get company statistics
   * GET /api/companies/:id/stats
   */
  static async getCompanyStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      console.log('[getCompanyStats] Request received:', {
        requestedCompanyId: id,
        userId: req.user?.id,
        userCompanyId: req.user?.companyId,
        userRole: req.user?.role,
        headers: {
          authorization: req.headers.authorization ? 'present' : 'missing',
          cookie: req.headers.cookie ? 'present' : 'missing',
        },
      });

      // Verify the user belongs to this company
      if (req.user?.companyId !== id) {
        console.log('[getCompanyStats] Unauthorized: user companyId mismatch', {
          userCompanyId: req.user?.companyId,
          requestedId: id,
        });
        res.status(403).json({
          success: false,
          error: 'Unauthorized to access this company\'s statistics',
        });
        return;
      }

      console.log('[getCompanyStats] Fetching stats for company:', id);
      const stats = await companyStatsService.getCompanyStats(id);
      console.log('[getCompanyStats] Stats fetched successfully');

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('[getCompanyStats] Error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch company statistics',
      });
    }
  }
}

