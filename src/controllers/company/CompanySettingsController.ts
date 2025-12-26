/**
 * Company Settings Controller
 * Handles HTTP requests for company settings (office hours, timezone)
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { CompanySettingsService } from '../../services/company/CompanySettingsService';

export class CompanySettingsController {
  /**
   * Get company settings
   * GET /api/company/settings
   */
  static async getCompanySettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const companyId = req.user.companyId;
      const settings = await CompanySettingsService.getCompanySettings(companyId);

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error('[CompanySettingsController] Error getting company settings:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get company settings',
      });
    }
  }

  /**
   * Update company settings
   * PUT /api/company/settings
   * Requires ADMIN or SUPER_ADMIN role
   */
  static async updateCompanySettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      // Check permissions - ADMIN and SUPER_ADMIN can update company settings
      const canManage = req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN';

      if (!canManage) {
        res.status(403).json({
          success: false,
          error: 'Permission denied. Only company administrators can update company settings.',
        });
        return;
      }

      const companyId = req.user.companyId;
      const { timezone, workDays, startTime, endTime, lunchStart, lunchEnd } = req.body;

      const settings = await CompanySettingsService.updateCompanySettings(companyId, {
        timezone,
        workDays,
        startTime,
        endTime,
        lunchStart,
        lunchEnd,
      });

      res.json({
        success: true,
        data: settings,
        message: 'Company settings updated successfully',
      });
    } catch (error) {
      console.error('[CompanySettingsController] Error updating company settings:', error);
      
      if (error instanceof Error && error.message.includes('Invalid')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update company settings',
      });
    }
  }
}

