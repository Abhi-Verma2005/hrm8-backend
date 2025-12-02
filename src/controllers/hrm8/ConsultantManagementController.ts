/**
 * Consultant Management Controller
 * Handles HTTP requests for consultant management (HRM8 Admin)
 */

import { Response } from 'express';
import { ConsultantManagementService } from '../../services/hrm8/ConsultantManagementService';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import { ConsultantRole, ConsultantStatus } from '@prisma/client';

export class ConsultantManagementController {
  /**
   * Get all consultants
   * GET /api/hrm8/consultants
   */
  static async getAll(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters: {
        regionId?: string;
        role?: ConsultantRole;
        status?: ConsultantStatus;
      } = {};

      if (req.query.regionId) filters.regionId = req.query.regionId as string;
      if (req.query.role) {
        const roleStr = req.query.role as string;
        if (roleStr === 'RECRUITER' || roleStr === 'SALES_AGENT' || roleStr === 'CONSULTANT_360') {
          filters.role = roleStr as ConsultantRole;
        }
      }
      if (req.query.status) {
        const statusStr = req.query.status as string;
        if (statusStr === 'ACTIVE' || statusStr === 'ON_LEAVE' || statusStr === 'INACTIVE' || statusStr === 'SUSPENDED') {
          filters.status = statusStr as ConsultantStatus;
        }
      }

      const consultants = await ConsultantManagementService.getAllConsultants(filters);

      res.json({
        success: true,
        data: { consultants },
      });
    } catch (error) {
      console.error('Get consultants error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch consultants',
      });
    }
  }

  /**
   * Get consultant by ID
   * GET /api/hrm8/consultants/:id
   */
  static async getById(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const consultant = await ConsultantManagementService.getConsultantById(id);

      if (!consultant) {
        res.status(404).json({
          success: false,
          error: 'Consultant not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { consultant },
      });
    } catch (error) {
      console.error('Get consultant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch consultant',
      });
    }
  }

  /**
   * Create consultant
   * POST /api/hrm8/consultants
   */
  static async create(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const consultantData = req.body;

      // Validate required fields
      if (!consultantData.email || !consultantData.password || 
          !consultantData.firstName || !consultantData.lastName || 
          !consultantData.role) {
        res.status(400).json({
          success: false,
          error: 'Email, password, firstName, lastName, and role are required',
        });
        return;
      }

      // Convert role string to enum if provided
      if (consultantData.role && typeof consultantData.role === 'string') {
        const roleStr = consultantData.role;
        if (roleStr === 'RECRUITER' || roleStr === 'SALES_AGENT' || roleStr === 'CONSULTANT_360') {
          consultantData.role = roleStr as ConsultantRole;
        } else {
          res.status(400).json({
            success: false,
            error: 'Invalid role. Must be RECRUITER, SALES_AGENT, or CONSULTANT_360',
          });
          return;
        }
      }

      const result = await ConsultantManagementService.createConsultant(consultantData);

      if ('error' in result) {
        res.status(result.status || 400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: { consultant: result },
      });
    } catch (error) {
      console.error('Create consultant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create consultant',
      });
    }
  }

  /**
   * Update consultant
   * PUT /api/hrm8/consultants/:id
   */
  static async update(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Don't allow password updates here (use separate endpoint)
      delete updateData.password;
      delete updateData.passwordHash;

      // Convert role string to enum if provided
      if (updateData.role && typeof updateData.role === 'string') {
        const roleStr = updateData.role;
        if (roleStr === 'RECRUITER' || roleStr === 'SALES_AGENT' || roleStr === 'CONSULTANT_360') {
          updateData.role = roleStr as ConsultantRole;
        } else {
          res.status(400).json({
            success: false,
            error: 'Invalid role. Must be RECRUITER, SALES_AGENT, or CONSULTANT_360',
          });
          return;
        }
      }

      // Convert status string to enum if provided
      if (updateData.status && typeof updateData.status === 'string') {
        const statusStr = updateData.status;
        if (statusStr === 'ACTIVE' || statusStr === 'ON_LEAVE' || statusStr === 'INACTIVE' || statusStr === 'SUSPENDED') {
          updateData.status = statusStr as ConsultantStatus;
        } else {
          res.status(400).json({
            success: false,
            error: 'Invalid status. Must be ACTIVE, ON_LEAVE, INACTIVE, or SUSPENDED',
          });
          return;
        }
      }

      const result = await ConsultantManagementService.updateConsultant(id, updateData);

      if ('error' in result) {
        res.status(result.status || 400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: { consultant: result },
      });
    } catch (error) {
      console.error('Update consultant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update consultant',
      });
    }
  }

  /**
   * Assign consultant to region
   * POST /api/hrm8/consultants/:id/assign-region
   */
  static async assignRegion(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { regionId } = req.body;

      if (!regionId) {
        res.status(400).json({
          success: false,
          error: 'Region ID is required',
        });
        return;
      }

      const result = await ConsultantManagementService.assignToRegion(id, regionId);

      if ('error' in result) {
        res.status(result.status || 400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: { consultant: result },
      });
    } catch (error) {
      console.error('Assign region error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign consultant to region',
      });
    }
  }

  /**
   * Suspend consultant
   * POST /api/hrm8/consultants/:id/suspend
   */
  static async suspend(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await ConsultantManagementService.suspendConsultant(id);

      res.json({
        success: true,
        message: 'Consultant suspended successfully',
      });
    } catch (error) {
      console.error('Suspend consultant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to suspend consultant',
      });
    }
  }

  /**
   * Reactivate consultant
   * POST /api/hrm8/consultants/:id/reactivate
   */
  static async reactivate(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await ConsultantManagementService.reactivateConsultant(id);

      res.json({
        success: true,
        message: 'Consultant reactivated successfully',
      });
    } catch (error) {
      console.error('Reactivate consultant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reactivate consultant',
      });
    }
  }
}



