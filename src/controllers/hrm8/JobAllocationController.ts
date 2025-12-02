/**
 * Job Allocation Controller
 * Handles HTTP requests for job allocation endpoints
 */

import { Response } from 'express';
import { JobAllocationService } from '../../services/hrm8/JobAllocationService';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';

export class JobAllocationController {
  /**
   * Assign job to consultant
   * POST /api/hrm8/jobs/:id/assign-consultant
   */
  static async assignConsultant(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: jobId } = req.params;
      const { consultantId } = req.body;

      if (!consultantId) {
        res.status(400).json({
          success: false,
          error: 'Consultant ID is required',
        });
        return;
      }

      const assignedBy = req.hrm8User?.id || 'system';
      const result = await JobAllocationService.assignJobToConsultant(jobId, consultantId, assignedBy);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to assign job',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Job assigned to consultant successfully',
      });
    } catch (error) {
      console.error('Assign consultant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign job to consultant',
      });
    }
  }

  /**
   * Assign job to region
   * POST /api/hrm8/jobs/:id/assign-region
   */
  static async assignRegion(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: jobId } = req.params;
      const { regionId } = req.body;

      if (!regionId) {
        res.status(400).json({
          success: false,
          error: 'Region ID is required',
        });
        return;
      }

      const assignedBy = req.hrm8User?.id || 'system';
      const result = await JobAllocationService.assignJobToRegion(jobId, regionId, assignedBy);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to assign job to region',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Job assigned to region successfully',
      });
    } catch (error) {
      console.error('Assign region error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign job to region',
      });
    }
  }

  /**
   * Unassign job
   * POST /api/hrm8/jobs/:id/unassign
   */
  static async unassign(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: jobId } = req.params;

      const result = await JobAllocationService.unassignJob(jobId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to unassign job',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Job unassigned successfully',
      });
    } catch (error) {
      console.error('Unassign job error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unassign job',
      });
    }
  }

  /**
   * Get consultants assigned to job
   * GET /api/hrm8/jobs/:id/consultants
   */
  static async getJobConsultants(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: jobId } = req.params;

      const consultants = await JobAllocationService.getJobConsultants(jobId);

      res.json({
        success: true,
        data: { consultants },
      });
    } catch (error) {
      console.error('Get job consultants error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch job consultants',
      });
    }
  }
}



