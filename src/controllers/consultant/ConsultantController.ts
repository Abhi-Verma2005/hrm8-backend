/**
 * Consultant Controller
 * Handles HTTP requests for consultant self-service endpoints
 */

import { Response } from 'express';
import { ConsultantService } from '../../services/consultant/ConsultantService';
import { ConsultantAuthenticatedRequest } from '../../middleware/consultantAuth';
import { JobAllocationService } from '../../services/hrm8/JobAllocationService';
import { PipelineStage } from '../../types';

export class ConsultantController {
  /**
   * Get consultant profile
   * GET /api/consultant/profile
   */
  static async getProfile(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.consultant) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const consultant = await ConsultantService.getProfile(req.consultant.id);

      if (!consultant) {
        res.status(404).json({
          success: false,
          error: 'Consultant not found',
        });
        return;
      }

      // Don't send password hash
      const { passwordHash, ...consultantData } = consultant;

      res.json({
        success: true,
        data: { consultant: consultantData },
      });
    } catch (error) {
      console.error('Get consultant profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch profile',
      });
    }
  }

  /**
   * Update consultant profile
   * PUT /api/consultant/profile
   */
  static async updateProfile(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.consultant) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const updateData = req.body;

      // Remove fields that shouldn't be updated by consultant
      delete updateData.email;
      delete updateData.passwordHash;
      delete updateData.role;
      delete updateData.status;
      delete updateData.regionId;
      delete updateData.commissionStructure;
      delete updateData.defaultCommissionRate;
      delete updateData.totalCommissionsPaid;
      delete updateData.pendingCommissions;
      delete updateData.totalPlacements;
      delete updateData.totalRevenue;
      delete updateData.successRate;
      delete updateData.averageDaysToFill;
      delete updateData.maxEmployers;
      delete updateData.currentEmployers;
      delete updateData.maxJobs;
      delete updateData.currentJobs;

      const consultant = await ConsultantService.updateProfile(req.consultant.id, updateData);

      // Don't send password hash
      const { passwordHash, ...consultantData } = consultant;

      res.json({
        success: true,
        data: { consultant: consultantData },
      });
    } catch (error) {
      console.error('Update consultant profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
      });
    }
  }

  /**
   * Get assigned jobs
   * GET /api/consultant/jobs
   */
  static async getJobs(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.consultant) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const jobs = await ConsultantService.getAssignedJobs(req.consultant.id);

      res.json({
        success: true,
        data: { jobs },
      });
    } catch (error) {
      console.error('Get consultant jobs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch jobs',
      });
    }
  }

  /**
   * Get pipeline status for a job assigned to the consultant
   * GET /api/consultant/jobs/:id/pipeline
   */
  static async getJobPipeline(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.consultant) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { id: jobId } = req.params;
      if (!jobId) {
        res.status(400).json({ success: false, error: 'Job ID is required' });
        return;
      }

      const pipeline = await JobAllocationService.getPipelineForConsultantJob(req.consultant.id, jobId);
      if (!pipeline) {
        res.status(404).json({ success: false, error: 'Pipeline not found for this job' });
        return;
      }

      res.json({ success: true, data: { pipeline } });
    } catch (error) {
      console.error('Get consultant job pipeline error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch job pipeline',
      });
    }
  }

  /**
   * Update pipeline status for a job assigned to the consultant
   * PATCH /api/consultant/jobs/:id/pipeline
   */
  static async updateJobPipeline(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.consultant) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { id: jobId } = req.params;
      const { stage, progress, note } = req.body || {};

      if (!jobId) {
        res.status(400).json({ success: false, error: 'Job ID is required' });
        return;
      }

      if (!stage) {
        res.status(400).json({ success: false, error: 'Stage is required' });
        return;
      }

      const pipelineStage = stage as PipelineStage;

      const result = await JobAllocationService.updatePipelineForConsultantJob(req.consultant.id, jobId, {
        stage: pipelineStage,
        progress,
        note,
        updatedBy: req.consultant.id,
      });

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error || 'Failed to update pipeline' });
        return;
      }

      res.json({ success: true, data: { pipeline: result.pipeline } });
    } catch (error) {
      console.error('Update consultant job pipeline error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update job pipeline',
      });
    }
  }

  /**
   * Get commissions
   * GET /api/consultant/commissions
   */
  static async getCommissions(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.consultant) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const filters: {
        status?: string;
        commissionType?: string;
      } = {};

      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.commissionType) filters.commissionType = req.query.commissionType as string;

      const commissions = await ConsultantService.getCommissions(req.consultant.id, filters);

      res.json({
        success: true,
        data: { commissions },
      });
    } catch (error) {
      console.error('Get consultant commissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch commissions',
      });
    }
  }

  /**
   * Get performance metrics
   * GET /api/consultant/performance
   */
  static async getPerformance(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.consultant) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const metrics = await ConsultantService.getPerformanceMetrics(req.consultant.id);

      res.json({
        success: true,
        data: { metrics },
      });
    } catch (error) {
      console.error('Get consultant performance error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch performance metrics',
      });
    }
  }
}



