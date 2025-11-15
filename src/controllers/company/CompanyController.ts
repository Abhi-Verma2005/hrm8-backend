/**
 * Company Controller
 * Handles HTTP requests for company-related endpoints
 */

import { Request, Response } from 'express';
import { CompanyService } from '../../services/company/CompanyService';
import { VerificationService } from '../../services/verification/VerificationService';

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
}

