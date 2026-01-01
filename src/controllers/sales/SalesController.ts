/**
 * Sales Controller
 * Handles Opportunities and Activities for Sales Agents
 */

import { Response } from 'express';
import { ConsultantAuthenticatedRequest } from '../../middleware/consultantAuth';
import { OpportunityService } from '../../services/sales/OpportunityService';
import { ActivityService } from '../../services/sales/ActivityService';

export class SalesController {
  // --- Opportunities ---

  /**
   * Get Opportunities
   * GET /api/sales/opportunities
   */
  static async getOpportunities(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const opportunities = await OpportunityService.getOpportunities(consultantId, {
        stage: req.query.stage as any,
        companyId: req.query.companyId as string
      });

      res.json({ success: true, data: { opportunities } });
    } catch (error: any) {
      console.error('Get opportunities error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get Pipeline Stats
   * GET /api/sales/opportunities/stats
   */
  static async getPipelineStats(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const stats = await OpportunityService.getPipelineStats(consultantId);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Get pipeline stats error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Create Opportunity
   * POST /api/sales/opportunities
   */
  static async createOpportunity(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const opportunity = await OpportunityService.createOpportunity({
        ...req.body,
        salesAgentId: consultantId
      });

      res.json({ success: true, data: { opportunity } });
    } catch (error: any) {
      console.error('Create opportunity error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Update Opportunity
   * PUT /api/sales/opportunities/:id
   */
  static async updateOpportunity(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const opportunity = await OpportunityService.updateOpportunity(id, req.body);
      res.json({ success: true, data: { opportunity } });
    } catch (error: any) {
      console.error('Update opportunity error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // --- Activities ---

  /**
   * Get Activities
   * GET /api/sales/activities
   */
  static async getActivities(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const activities = await ActivityService.getActivities({
        consultantId,
        companyId: req.query.companyId as string,
        leadId: req.query.leadId as string,
        opportunityId: req.query.opportunityId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
      });

      res.json({ success: true, data: { activities } });
    } catch (error: any) {
      console.error('Get activities error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Create Activity
   * POST /api/sales/activities
   */
  static async createActivity(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const activity = await ActivityService.logActivity({
        ...req.body,
        createdBy: consultantId
      });

      res.json({ success: true, data: { activity } });
    } catch (error: any) {
      console.error('Create activity error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
