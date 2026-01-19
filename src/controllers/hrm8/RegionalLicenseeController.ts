/**
 * Regional Licensee Controller
 * Handles HTTP requests for regional licensee endpoints with governance automation
 */

import { Response } from 'express';
import { RegionalLicenseeService, SuspendResult, TerminateResult } from '../../services/hrm8/RegionalLicenseeService';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import { LicenseeStatus } from '@prisma/client';
import { logAudit, createAuditDescription } from '../../middleware/auditHelper';

export class RegionalLicenseeController {
  /**
   * Get all licensees
   * GET /api/hrm8/licensees
   */
  static async getAll(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters: { status?: LicenseeStatus; licenseeId?: string } = {};
      if (req.query.status) {
        const statusStr = req.query.status as string;
        if (statusStr === 'ACTIVE' || statusStr === 'SUSPENDED' || statusStr === 'TERMINATED') {
          filters.status = statusStr as LicenseeStatus;
        }
      }

      // Apply regional isolation for licensees
      if (req.hrm8User?.role === 'REGIONAL_LICENSEE') {
        filters.licenseeId = req.hrm8User.licenseeId as string;
      }

      const licensees = await RegionalLicenseeService.getAll(filters);

      res.json({
        success: true,
        data: { licensees },
      });
    } catch (error) {
      console.error('Get licensees error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch licensees',
      });
    }
  }

  /**
   * Get licensee by ID
   * GET /api/hrm8/licensees/:id
   */
  static async getById(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const licensee = await RegionalLicenseeService.getById(id);

      if (!licensee) {
        res.status(404).json({
          success: false,
          error: 'Licensee not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { licensee },
      });
    } catch (error) {
      console.error('Get licensee error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch licensee',
      });
    }
  }

  /**
   * Create licensee
   * POST /api/hrm8/licensees
   */
  static async create(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const licenseeData = req.body;

      // Validate required fields
      if (!licenseeData.name || !licenseeData.legalEntityName || !licenseeData.email ||
        !licenseeData.agreementStartDate || !licenseeData.revenueSharePercent ||
        !licenseeData.managerContact) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
        });
        return;
      }

      const result = await RegionalLicenseeService.create(licenseeData, req.hrm8User?.id);

      if ('error' in result) {
        res.status(result.status || 400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: { licensee: result },
      });

      // Log audit entry
      await logAudit(req, 'Licensee', result.id, 'CREATE', {
        description: createAuditDescription('CREATE', 'Licensee', licenseeData.name),
        changes: { name: licenseeData.name, email: licenseeData.email },
      });
    } catch (error) {
      console.error('Create licensee error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create licensee',
      });
    }
  }

  /**
   * Update licensee
   * PUT /api/hrm8/licensees/:id
   */
  static async update(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Convert status string to enum if provided
      if (updateData.status && typeof updateData.status === 'string') {
        const statusStr = updateData.status;
        if (statusStr === 'ACTIVE' || statusStr === 'SUSPENDED' || statusStr === 'TERMINATED') {
          updateData.status = statusStr as LicenseeStatus;
        } else {
          res.status(400).json({
            success: false,
            error: 'Invalid status. Must be ACTIVE, SUSPENDED, or TERMINATED',
          });
          return;
        }
      }

      const result = await RegionalLicenseeService.update(id, updateData, req.hrm8User?.id);

      if ('error' in result) {
        res.status(result.status || 400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: { licensee: result },
      });

      // Log audit entry
      await logAudit(req, 'Licensee', id, 'UPDATE', {
        description: createAuditDescription('UPDATE', 'Licensee', result.name),
        changes: updateData,
      });
    } catch (error) {
      console.error('Update licensee error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update licensee',
      });
    }
  }

  /**
   * Get impact preview before suspend/terminate
   * GET /api/hrm8/licensees/:id/impact-preview
   */
  static async getImpactPreview(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const impact = await RegionalLicenseeService.getImpactPreview(id);

      res.json({
        success: true,
        data: impact,
      });

      // Log audit entry
      await logAudit(req, 'Licensee', id, 'SUSPEND', {
        description: createAuditDescription('SUSPEND', 'Licensee'),
      });
    } catch (error) {
      console.error('Get impact preview error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get impact preview',
      });
    }
  }

  /**
   * Suspend licensee (AUTOMATED)
   * POST /api/hrm8/licensees/:id/suspend
   * - Pauses all active jobs in licensee's regions
   * - Creates audit log
   * - Returns impact counts
   */
  static async suspend(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const result: SuspendResult = await RegionalLicenseeService.suspend(id, {
        performedBy: req.hrm8User?.id,
        notes,
      });

      res.json({
        success: true,
        message: 'Licensee suspended successfully',
        data: {
          licenseeId: result.licenseeId,
          jobsPaused: result.jobsPaused,
          regionsAffected: result.regionsAffected,
        },
      });
    } catch (error: any) {
      console.error('Suspend licensee error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to suspend licensee',
      });
    }
  }

  /**
   * Reactivate a suspended licensee
   * POST /api/hrm8/licensees/:id/reactivate
   */
  static async reactivate(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const result = await RegionalLicenseeService.reactivate(id, {
        performedBy: req.hrm8User?.id,
        notes,
      });

      res.json({
        success: true,
        message: 'Licensee reactivated successfully',
        data: {
          jobsResumed: result.jobsResumed,
        },
      });
    } catch (error: any) {
      console.error('Reactivate licensee error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to reactivate licensee',
      });
    }
  }

  /**
   * Terminate licensee (AUTOMATED)
   * POST /api/hrm8/licensees/:id/terminate
   * - Unassigns all regions (returns to HRM8)
   * - Generates final settlement
   * - Creates audit log
   * - Returns impact counts
   */
  static async terminate(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const result: TerminateResult = await RegionalLicenseeService.terminate(id, {
        performedBy: req.hrm8User?.id,
        notes,
      });

      res.json({
        success: true,
        message: 'Licensee terminated successfully',
        data: {
          licenseeId: result.licenseeId,
          regionsUnassigned: result.regionsUnassigned,
          consultantsAffected: result.consultantsAffected,
          finalSettlement: result.finalSettlement,
        },
      });

      // Log audit entry
      await logAudit(req, 'Licensee', id, 'TERMINATE', {
        description: createAuditDescription('TERMINATE', 'Licensee'),
      });
    } catch (error) {
      console.error('Terminate licensee error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to terminate licensee',
      });
    }
  }
}
