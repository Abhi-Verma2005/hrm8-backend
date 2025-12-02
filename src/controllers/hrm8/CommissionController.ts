/**
 * Commission Controller
 * Handles HTTP requests for commission endpoints
 */

import { Response } from 'express';
import { CommissionService } from '../../services/hrm8/CommissionService';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import { CommissionStatus, CommissionType } from '@prisma/client';

export class CommissionController {
  /**
   * Get all commissions
   * GET /api/hrm8/commissions
   */
  static async getAll(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Build filters from validated query parameters
      const filters: {
        consultantId?: string;
        regionId?: string;
        jobId?: string;
        status?: CommissionStatus;
        type?: CommissionType;
      } = {};

      if (req.query.consultantId) filters.consultantId = req.query.consultantId as string;
      if (req.query.regionId) filters.regionId = req.query.regionId as string;
      if (req.query.jobId) filters.jobId = req.query.jobId as string;
      if (req.query.status) {
        filters.status = req.query.status as CommissionStatus;
      }
      if (req.query.type || req.query.commissionType) {
        filters.type = (req.query.type || req.query.commissionType) as CommissionType;
      }

      const commissions = await CommissionService.getAllCommissions(filters);

      res.json({
        success: true,
        data: { commissions },
      });
    } catch (error) {
      console.error('Get commissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch commissions',
      });
    }
  }

  /**
   * Get commission by ID
   * GET /api/hrm8/commissions/:id
   */
  static async getById(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const commission = await CommissionService.getCommissionById(id);

      if (!commission) {
        res.status(404).json({
          success: false,
          error: 'Commission not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { commission },
      });
    } catch (error) {
      console.error('Get commission error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch commission',
      });
    }
  }

  /**
   * Create commission
   * POST /api/hrm8/commissions
   */
  static async create(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Request body is already validated by validateCreateCommission middleware
      const commissionData = req.body;

      const commission = await CommissionService.createCommission(commissionData);

      res.status(201).json({
        success: true,
        data: { commission },
      });
    } catch (error) {
      console.error('Create commission error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create commission',
      });
    }
  }

  /**
   * Confirm commission
   * PUT /api/hrm8/commissions/:id/confirm
   */
  static async confirm(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const commission = await CommissionService.confirmCommission(id);

      res.json({
        success: true,
        data: { commission },
      });
    } catch (error) {
      console.error('Confirm commission error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to confirm commission',
      });
    }
  }

  /**
   * Mark commission as paid
   * PUT /api/hrm8/commissions/:id/pay
   */
  static async markAsPaid(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      // Request body is already validated by validateMarkAsPaid middleware
      const { paymentReference } = req.body;
      const commission = await CommissionService.markAsPaid(id, paymentReference);

      res.json({
        success: true,
        data: { commission },
      });
    } catch (error) {
      console.error('Mark commission as paid error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark commission as paid',
      });
    }
  }

  /**
   * Get commissions by region
   * GET /api/hrm8/commissions/regional
   */
  static async getRegional(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Query parameters are already validated by validateRegionalCommissionsQuery middleware
      const regionId = req.query.regionId as string;
      const statusStr = req.query.status as string | undefined;

      const filterOptions: { status?: CommissionStatus } = {};
      if (statusStr) {
          filterOptions.status = statusStr as CommissionStatus;
      }

      const commissions = await CommissionService.getRegionalCommissions(regionId, filterOptions);

      res.json({
        success: true,
        data: { commissions },
      });
    } catch (error) {
      console.error('Get regional commissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch regional commissions',
      });
    }
  }
}



