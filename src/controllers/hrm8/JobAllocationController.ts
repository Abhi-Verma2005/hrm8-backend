/**
 * Job Allocation Controller
 * Handles HTTP requests for job allocation endpoints
 */

import { Response } from 'express';
import { JobAllocationService } from '../../services/hrm8/JobAllocationService';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import { AssignmentSource, HRM8UserRole } from '@prisma/client';
import { JobModel } from '../../models/Job';

export class JobAllocationController {
  /**
   * Assign job to consultant
   * POST /api/hrm8/jobs/:id/assign-consultant
   */
  static async assignConsultant(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: jobId } = req.params;
      const { consultantId, assignmentSource } = req.body;

      if (!consultantId) {
        res.status(400).json({
          success: false,
          error: 'Consultant ID is required',
        });
        return;
      }

      const assignedBy = req.hrm8User?.id || 'system';
      
      // Determine assignment source based on user role if not provided
      let source: AssignmentSource | undefined = assignmentSource;
      if (!source) {
        const userRole = req.hrm8User?.role;
        if (userRole === HRM8UserRole.REGIONAL_LICENSEE) {
          source = AssignmentSource.MANUAL_LICENSEE;
        } else {
          source = AssignmentSource.MANUAL_HRM8;
        }
      }

      const result = await JobAllocationService.assignJobToConsultant(
        jobId,
        consultantId,
        assignedBy,
        source
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to assign job',
        });
        return;
      }

      // Get updated job to return assignment info
      const job = await JobModel.findById(jobId);
      const consultants = await JobAllocationService.getJobConsultants(jobId);

      res.json({
        success: true,
        message: 'Job assigned to consultant successfully',
        data: {
          job: job ? {
            id: job.id,
            assignedConsultantId: job.assignedConsultantId,
            assignmentSource: job.assignmentSource,
            assignmentMode: job.assignmentMode,
          } : null,
          consultants,
        },
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

  /**
   * Get unassigned jobs
   * GET /api/hrm8/jobs/unassigned
   */
  static async getUnassignedJobs(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { regionId, companyId, limit, offset } = req.query;

      const limitNum = limit ? parseInt(limit as string, 10) : undefined;
      const offsetNum = offset ? parseInt(offset as string, 10) : undefined;

      const filters: any = {
        regionId: regionId as string | undefined,
        companyId: companyId as string | undefined,
        limit: limitNum,
        offset: offsetNum,
      };

      // Apply regional isolation for licensees
      if (req.assignedRegionIds) {
        if (filters.regionId) {
          // If a specific regionId was requested, ensure it's in the user's assigned regions
          if (!req.assignedRegionIds.includes(filters.regionId)) {
            res.json({ success: true, data: { jobs: [] } });
            return;
          }
        } else {
          // Otherwise filter by all assigned regions
          filters.regionIds = req.assignedRegionIds;
        }
      }

      const jobs = await JobAllocationService.getUnassignedJobs(filters);

      res.json({
        success: true,
        data: { jobs },
      });
    } catch (error) {
      console.error('Get unassigned jobs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch unassigned jobs',
      });
    }
  }

  /**
   * Get job assignment info
   * GET /api/hrm8/jobs/:id/assignment-info
   */
  static async getAssignmentInfo(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: jobId } = req.params;

      const job = await JobModel.findById(jobId);
      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }

      const consultants = await JobAllocationService.getJobConsultants(jobId);
      const pipeline = await JobAllocationService.getPipelineForJob(jobId, job.assignedConsultantId || undefined);

      res.json({
        success: true,
        data: {
          job: {
            id: job.id,
            title: job.title,
            assignedConsultantId: job.assignedConsultantId,
            assignmentSource: job.assignmentSource,
            assignmentMode: job.assignmentMode,
            regionId: job.regionId,
          },
          consultants,
          ...(pipeline && { pipeline }),
        },
      });
    } catch (error) {
      console.error('Get assignment info error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch assignment info',
      });
    }
  }

  /**
   * Manually trigger auto-assignment
   * POST /api/hrm8/jobs/:id/auto-assign
   */
  static async autoAssign(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: jobId } = req.params;

      const result = await JobAllocationService.autoAssignJob(jobId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to auto-assign job',
        });
        return;
      }

      // Get updated job info
      const job = await JobModel.findById(jobId);
      const consultants = await JobAllocationService.getJobConsultants(jobId);

      res.json({
        success: true,
        message: 'Job auto-assigned successfully',
        data: {
          consultantId: result.consultantId,
          job: job ? {
            id: job.id,
            assignedConsultantId: job.assignedConsultantId,
            assignmentSource: job.assignmentSource,
          } : null,
          consultants,
        },
      });
    } catch (error) {
      console.error('Auto-assign error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to auto-assign job',
      });
    }
  }

  /**
   * Get consultants available for assignment
   * GET /api/hrm8/consultants/for-assignment
   */
  static async getConsultantsForAssignment(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { regionId, role, availability, industry, language, search } = req.query;

      if (!regionId) {
        res.status(400).json({
          success: false,
          error: 'Region ID is required',
        });
        return;
      }

      // Apply regional isolation for licensees
      if (req.assignedRegionIds) {
        if (!req.assignedRegionIds.includes(regionId as string)) {
          res.json({ success: true, data: { consultants: [] } });
          return;
        }
      }

      const consultants = await JobAllocationService.getConsultantsForAssignment({
        regionId: regionId as string,
        role: role as any,
        availability: availability as any,
        industry: industry as string | undefined,
        language: language as string | undefined,
        search: search as string | undefined,
      });

      res.json({
        success: true,
        data: { consultants },
      });
    } catch (error) {
      console.error('Get consultants for assignment error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch consultants',
      });
    }
  }
}



