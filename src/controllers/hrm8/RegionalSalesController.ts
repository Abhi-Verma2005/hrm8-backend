/**
 * Regional Sales Controller
 * Endpoints for Regional Licensees to view Sales Data
 */

import { Response } from 'express';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import { RegionalSalesService } from '../../services/hrm8/RegionalSalesService';
import { RegionModel } from '../../models/Region';
import { HRM8UserModel } from '../../models/HRM8User';

export class RegionalSalesController {
  
  /**
   * Helper to verify region access
   */
  private static async verifyRegionAccess(req: Hrm8AuthenticatedRequest, regionId: string): Promise<boolean> {
    if (!req.hrm8User) return false;
    
    // Global Admin has access to all regions
    if (req.hrm8User.role === 'GLOBAL_ADMIN') return true;
    
    // Regional Licensee can only access assigned regions
    if (req.hrm8User.role === 'REGIONAL_LICENSEE') {
      const hrm8User = await HRM8UserModel.findById(req.hrm8User.id);
      if (!hrm8User || !hrm8User.licenseeId) return false;
      
      const region = await RegionModel.findById(regionId);
      return region?.licenseeId === hrm8User.licenseeId;
    }
    
    return false;
  }

  /**
   * Get Regional Pipeline (Opportunities)
   * GET /api/hrm8/sales/regional/opportunities
   */
  static async getRegionalOpportunities(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const regionId = req.query.regionId as string;
      
      if (!regionId) {
        res.status(400).json({ success: false, error: 'regionId is required' });
        return;
      }

      // Security check
      const hasAccess = await this.verifyRegionAccess(req, regionId);
      if (!hasAccess) {
        res.status(403).json({ success: false, error: 'Access denied to this region' });
        return;
      }

      const opportunities = await RegionalSalesService.getRegionalOpportunities(regionId, {
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
      const regionId = req.query.regionId as string;
      if (!regionId) {
        res.status(400).json({ success: false, error: 'regionId is required' });
        return;
      }

      // Security check
      const hasAccess = await this.verifyRegionAccess(req, regionId);
      if (!hasAccess) {
        res.status(403).json({ success: false, error: 'Access denied to this region' });
        return;
      }

      const stats = await RegionalSalesService.getRegionalPipelineStats(regionId);
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
      const regionId = req.query.regionId as string;
      if (!regionId) {
        res.status(400).json({ success: false, error: 'regionId is required' });
        return;
      }

      // Security check
      const hasAccess = await this.verifyRegionAccess(req, regionId);
      if (!hasAccess) {
        res.status(403).json({ success: false, error: 'Access denied to this region' });
        return;
      }

      const activities = await RegionalSalesService.getRegionalActivities(regionId);
      res.json({ success: true, data: { activities } });
    } catch (error: any) {
      console.error('Get regional activities error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
