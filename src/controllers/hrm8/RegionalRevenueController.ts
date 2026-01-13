/**
 * Regional Revenue Controller
 * Handles HTTP requests for regional revenue endpoints
 */

import { Response } from 'express';
import { RegionalRevenueService } from '../../services/hrm8/RegionalRevenueService';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import { RevenueStatus } from '@prisma/client';

export class RegionalRevenueController {
  /**
   * Get all revenue records
   * GET /api/hrm8/revenue
   */
  static async getAll(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters: {
        regionId?: string;
        regionIds?: string[];
        licenseeId?: string;
        status?: RevenueStatus;
        periodStart?: Date;
        periodEnd?: Date;
      } = {};

      if (req.query.regionId) filters.regionId = req.query.regionId as string;
      if (req.query.licenseeId) filters.licenseeId = req.query.licenseeId as string;

      // Apply regional isolation for licensees
      if (req.assignedRegionIds) {
        if (filters.regionId) {
          if (!req.assignedRegionIds.includes(filters.regionId)) {
            res.json({ success: true, data: { revenues: [] } });
            return;
          }
        } else {
          filters.regionIds = req.assignedRegionIds;
        }

        // Also ensure licenseeId matches
        if (filters.licenseeId && filters.licenseeId !== req.hrm8User?.licenseeId) {
          res.json({ success: true, data: { revenues: [] } });
          return;
        }
        filters.licenseeId = req.hrm8User?.licenseeId;
      }

      if (req.query.status) {
        const statusStr = req.query.status as string;
        if (statusStr === 'PENDING' || statusStr === 'CONFIRMED' || statusStr === 'PAID') {
          filters.status = statusStr as RevenueStatus;
        }
      }
      if (req.query.periodStart) filters.periodStart = new Date(req.query.periodStart as string);
      if (req.query.periodEnd) filters.periodEnd = new Date(req.query.periodEnd as string);

      const revenues = await RegionalRevenueService.getAllRevenue(filters);

      res.json({
        success: true,
        data: { revenues },
      });
    } catch (error) {
      console.error('Get revenue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch revenue records',
      });
    }
  }

  /**
   * Get revenue by ID
   * GET /api/hrm8/revenue/:id
   */
  static async getById(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const revenue = await RegionalRevenueService.getRevenueById(id);

      if (!revenue) {
        res.status(404).json({
          success: false,
          error: 'Revenue record not found',
        });
        return;
      }

      // Apply regional isolation for licensees
      if (req.assignedRegionIds && !req.assignedRegionIds.includes(revenue.regionId)) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this revenue record',
        });
        return;
      }

      res.json({
        success: true,
        data: { revenue },
      });
    } catch (error) {
      console.error('Get revenue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch revenue record',
      });
    }
  }

  /**
   * Create revenue record
   * POST /api/hrm8/revenue
   */
  static async create(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const revenueData = req.body;

      // Validate required fields
      if (!revenueData.regionId || !revenueData.periodStart ||
        !revenueData.periodEnd || revenueData.totalRevenue === undefined) {
        res.status(400).json({
          success: false,
          error: 'Region ID, period start, period end, and total revenue are required',
        });
        return;
      }

      // Apply regional isolation for licensees
      if (req.assignedRegionIds && !req.assignedRegionIds.includes(revenueData.regionId)) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this region',
        });
        return;
      }

      // For licensees, force their licenseeId
      if (req.hrm8User?.role === 'REGIONAL_LICENSEE') {
        revenueData.licenseeId = req.hrm8User.licenseeId;
      }

      // Calculate shares if not provided
      let licenseeShare = revenueData.licenseeShare;
      let hrm8Share = revenueData.hrm8Share;

      if (licenseeShare === undefined || hrm8Share === undefined) {
        // Default: 100% HRM8 if no licensee
        hrm8Share = revenueData.totalRevenue;
        licenseeShare = 0;
      }

      const revenue = await RegionalRevenueService.createRevenue({
        ...revenueData,
        licenseeShare,
        hrm8Share,
        periodStart: new Date(revenueData.periodStart),
        periodEnd: new Date(revenueData.periodEnd),
      });

      res.status(201).json({
        success: true,
        data: { revenue },
      });
    } catch (error) {
      console.error('Create revenue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create revenue record',
      });
    }
  }

  /**
   * Confirm revenue
   * PUT /api/hrm8/revenue/:id/confirm
   */
  static async confirm(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const revenue = await RegionalRevenueService.getRevenueById(id);

      if (!revenue) {
        res.status(404).json({ success: false, error: 'Revenue record not found' });
        return;
      }

      // Apply regional isolation for licensees
      if (req.assignedRegionIds && !req.assignedRegionIds.includes(revenue.regionId)) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      const updatedRevenue = await RegionalRevenueService.confirmRevenue(id);

      res.json({
        success: true,
        data: { revenue: updatedRevenue },
      });
    } catch (error) {
      console.error('Confirm revenue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to confirm revenue',
      });
    }
  }

  /**
   * Mark revenue as paid
   * PUT /api/hrm8/revenue/:id/pay
   */
  static async markAsPaid(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const revenue = await RegionalRevenueService.getRevenueById(id);

      if (!revenue) {
        res.status(404).json({ success: false, error: 'Revenue record not found' });
        return;
      }

      // Apply regional isolation for licensees
      if (req.assignedRegionIds && !req.assignedRegionIds.includes(revenue.regionId)) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      const updatedRevenue = await RegionalRevenueService.markAsPaid(id);

      res.json({
        success: true,
        data: { revenue: updatedRevenue },
      });
    } catch (error) {
      console.error('Mark revenue as paid error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark revenue as paid',
      });
    }
  }
  /**
   * Get company revenue breakdown
   * GET /api/hrm8/revenue/companies
   */
  static async getCompanyRevenueBreakdown(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters: { regionIds?: string[] } = {};

      // Apply regional isolation
      if (req.assignedRegionIds) {
        filters.regionIds = req.assignedRegionIds;
      }

      const companies = await RegionalRevenueService.getCompanyRevenueBreakdown(filters);

      res.json({
        success: true,
        data: { companies },
      });
    } catch (error) {
      console.error('Get company revenue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch company revenue breakdown',
      });
    }
  }
}




