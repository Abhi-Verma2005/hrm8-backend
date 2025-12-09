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
      const { CommissionModel } = await import('../../models/Commission');
      const commission = await CommissionModel.findById(id);

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
      const commissionData = req.body;
      const { CommissionModel } = await import('../../models/Commission');
      const commission = await CommissionModel.create(commissionData);

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
      const result = await CommissionService.confirmCommissionForJob(id);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to confirm commission',
        });
        return;
      }

      const { CommissionModel } = await import('../../models/Commission');
      const commission = await CommissionModel.findById(id);

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
      const { paymentReference } = req.body;
      const result = await CommissionService.processPayment(id, paymentReference);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to process payment',
        });
        return;
      }

      const { CommissionModel } = await import('../../models/Commission');
      const commission = await CommissionModel.findById(id);

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
   * Process multiple commission payments (for HR admin)
   * POST /api/hrm8/commissions/pay
   */
  static async processPayments(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { commissionIds, paymentReference } = req.body;

      if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'commissionIds must be a non-empty array',
        });
        return;
      }

      if (!paymentReference || typeof paymentReference !== 'string') {
        res.status(400).json({
          success: false,
          error: 'paymentReference is required',
        });
        return;
      }

      const result = await CommissionService.processPayments(commissionIds, paymentReference);

      res.json({
        success: result.success,
        data: {
          processed: result.processed,
          total: commissionIds.length,
          errors: result.errors,
        },
      });
    } catch (error) {
      console.error('Process payments error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process payments',
      });
    }
  }

  /**
   * Get commissions by region
   * GET /api/hrm8/commissions/regional
   */
  static async getRegional(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const regionId = req.query.regionId as string;
      const statusStr = req.query.status as string | undefined;

      const filters: { regionId?: string; status?: CommissionStatus } = {};
      if (regionId) {
        filters.regionId = regionId;
      }
      if (statusStr) {
        filters.status = statusStr as CommissionStatus;
      }

      const commissions = await CommissionService.getAllCommissions(filters);

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



