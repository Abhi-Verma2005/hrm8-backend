/**
 * Consultant Management Controller
 * Handles HTTP requests for consultant management (HRM8 Admin)
 */

import { Response } from 'express';
import { ConsultantManagementService } from '../../services/hrm8/ConsultantManagementService';
import { EmailProvisioningService } from '../../services/email/EmailProvisioningService';
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
        regionIds?: string[];
        role?: ConsultantRole;
        status?: ConsultantStatus;
      } = {};

      if (req.query.regionId) filters.regionId = req.query.regionId as string;

      // Apply regional isolation for licensees
      if (req.assignedRegionIds) {
        if (filters.regionId) {
          if (!req.assignedRegionIds.includes(filters.regionId)) {
            res.json({ success: true, data: { consultants: [] } });
            return;
          }
        } else {
          filters.regionIds = req.assignedRegionIds;
        }
      }

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

      // Apply regional isolation for licensees
      if (req.assignedRegionIds && consultant.regionId && !req.assignedRegionIds.includes(consultant.regionId)) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this consultant',
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
        !consultantData.role || !consultantData.regionId) {
        res.status(400).json({
          success: false,
          error: 'Email, password, firstName, lastName, role, and regionId are required',
        });
        return;
      }

      // Apply regional isolation for licensees
      if (req.assignedRegionIds && consultantData.regionId && !req.assignedRegionIds.includes(consultantData.regionId)) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this region',
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

      // Optionally provision mailbox in external provider (Google / Microsoft)
      let emailProvisioning;
      const idp = (process.env.EMAIL_IDP || '').toLowerCase();

      if (idp === 'google' || idp === 'microsoft') {
        emailProvisioning = await EmailProvisioningService.provisionEmail(
          result.email,
          result.firstName,
          result.lastName
        );
      }

      res.status(201).json({
        success: true,
        data: { consultant: result, emailProvisioning },
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

      // Verify access to the consultant if licensee
      if (req.assignedRegionIds) {
        const consultant = await ConsultantManagementService.getConsultantById(id);
        if (!consultant || (consultant.regionId && !req.assignedRegionIds.includes(consultant.regionId))) {
          res.status(403).json({ success: false, error: 'Access denied' });
          return;
        }

        // Also check if they are trying to move the consultant to a region they don't own
        if (updateData.regionId && !req.assignedRegionIds.includes(updateData.regionId)) {
          res.status(403).json({ success: false, error: 'Cannot move consultant to this region' });
          return;
        }
      }

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

      // Verify access to both consultant and region if licensee
      if (req.assignedRegionIds) {
        if (!req.assignedRegionIds.includes(regionId)) {
          res.status(403).json({ success: false, error: 'Access denied to this region' });
          return;
        }

        const consultant = await ConsultantManagementService.getConsultantById(id);
        if (!consultant || (consultant.regionId && !req.assignedRegionIds.includes(consultant.regionId))) {
          res.status(403).json({ success: false, error: 'Access denied to this consultant' });
          return;
        }
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

      // Verify access if licensee
      if (req.assignedRegionIds) {
        const consultant = await ConsultantManagementService.getConsultantById(id);
        if (!consultant || (consultant.regionId && !req.assignedRegionIds.includes(consultant.regionId))) {
          res.status(403).json({ success: false, error: 'Access denied' });
          return;
        }
      }

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

      // Verify access if licensee
      if (req.assignedRegionIds) {
        const consultant = await ConsultantManagementService.getConsultantById(id);
        if (!consultant || (consultant.regionId && !req.assignedRegionIds.includes(consultant.regionId))) {
          res.status(403).json({ success: false, error: 'Access denied' });
          return;
        }
      }

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

  /**
   * Delete consultant
   * DELETE /api/hrm8/consultants/:id
   */
  static async delete(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Verify access if licensee
      if (req.assignedRegionIds) {
        const consultant = await ConsultantManagementService.getConsultantById(id);
        if (!consultant || (consultant.regionId && !req.assignedRegionIds.includes(consultant.regionId))) {
          res.status(403).json({ success: false, error: 'Access denied' });
          return;
        }
      }

      const result = await ConsultantManagementService.deleteConsultant(id);

      if (result && 'error' in result) {
        res.status(result.status || 400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Consultant deleted successfully',
      });
    } catch (error) {
      console.error('Delete consultant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete consultant',
      });
    }
  }


  /**
   * Invite consultant (Generate Invitation Link)
   * POST /api/hrm8/consultants/:id/invite
   */
  static async invite(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Verify access if licensee
      if (req.assignedRegionIds) {
        const consultant = await ConsultantManagementService.getConsultantById(id);
        if (!consultant || (consultant.regionId && !req.assignedRegionIds.includes(consultant.regionId))) {
          res.status(403).json({ success: false, error: 'Access denied' });
          return;
        }
      }

      const { generateInvitationToken } = require('../../utils/invitation');
      const token = generateInvitationToken(id);

      // In a real app, we would send an email here.
      // For now, we return the link.
      // Also construct the simplified link for the user.
      const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/consultant/setup-account?token=${token}`;

      console.log(`[INVITE] Link for consultant ${id}: ${inviteLink}`);

      res.json({
        success: true,
        message: 'Invitation link generated successfully',
        data: {
          token,
          inviteLink // For admin to copy-paste if needed, or development visibility
        }
      });
    } catch (error) {
      console.error('Invite consultant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate invitation',
      });
    }
  }

  /**
   * Generate HRM8 email address for consultant
   * POST /api/hrm8/consultants/generate-email
   */
  static async generateEmail(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { firstName, lastName, consultantId } = req.body;

      if (!firstName || !lastName) {
        res.status(400).json({
          success: false,
          error: 'First name and last name are required',
        });
        return;
      }

      const result = await ConsultantManagementService.generateEmail(
        firstName,
        lastName,
        consultantId
      );

      if ('error' in result) {
        res.status(result.status || 400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: { email: result.email },
      });
    } catch (error) {
      console.error('Generate email error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate email address',
      });
    }
  }
}



