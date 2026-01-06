/**
 * Regional Sales Controller
 * Endpoints for Regional Licensees to view Sales Data
 */

import { Response } from 'express';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import { RegionalSalesService } from '../../services/hrm8/RegionalSalesService';

export class RegionalSalesController {
  
  /**
   * Get Regional Pipeline (Opportunities)
   * GET /api/hrm8/sales/regional/opportunities
   */
  static async getRegionalOpportunities(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let regionId = req.query.regionId as string;
      let regionIds: string[] | undefined;

      // Apply regional isolation for licensees
      if (req.assignedRegionIds) {
        if (regionId) {
          if (!req.assignedRegionIds.includes(regionId)) {
            res.json({ success: true, data: { opportunities: [] } });
            return;
          }
        } else {
          regionIds = req.assignedRegionIds;
        }
      } else if (!regionId) {
        res.status(400).json({ success: false, error: 'regionId is required' });
        return;
      }

      const opportunities = await RegionalSalesService.getRegionalOpportunities(regionId, regionIds, {
        stage: req.query.stage as any,
        salesAgentId: req.query.salesAgentId as string
      });

      res.json({ success: true, data: { opportunities } });
    } catch (error: any) {
      console.error('Get regional opportunities error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get Regional Pipeline Stats (Forecast)
   * GET /api/hrm8/sales/regional/stats
   */
  static async getRegionalStats(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let regionId = req.query.regionId as string;
      let regionIds: string[] | undefined;

      // Apply regional isolation for licensees
      if (req.assignedRegionIds) {
        if (regionId) {
          if (!req.assignedRegionIds.includes(regionId)) {
            res.json({ success: true, data: {} });
            return;
          }
        } else {
          regionIds = req.assignedRegionIds;
        }
      } else if (!regionId) {
        res.status(400).json({ success: false, error: 'regionId is required' });
        return;
      }

      const stats = await RegionalSalesService.getRegionalPipelineStats(regionId, regionIds);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Get regional stats error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get Regional Activity Feed
   * GET /api/hrm8/sales/regional/activities
   */
  static async getRegionalActivities(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let regionId = req.query.regionId as string;
      let regionIds: string[] | undefined;

      // Apply regional isolation for licensees
      if (req.assignedRegionIds) {
        if (regionId) {
          if (!req.assignedRegionIds.includes(regionId)) {
            res.json({ success: true, data: { activities: [] } });
            return;
          }
        } else {
          regionIds = req.assignedRegionIds;
        }
      } else if (!regionId) {
        res.status(400).json({ success: false, error: 'regionId is required' });
        return;
      }

      const activities = await RegionalSalesService.getRegionalActivities(regionId, regionIds);
      res.json({ success: true, data: { activities } });
    } catch (error: any) {
      console.error('Get regional activities error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
