/**
 * Employee Controller
 * Handles HTTP requests for employee-related endpoints
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest, EmployeeInvitationRequest, UserRole } from '../../types';
import { InvitationService } from '../../services/invitation/InvitationService';
import { RoleService } from '../../services/rbac/RoleService';
import { UserModel } from '../../models/User';

export class EmployeeController {
  /**
   * Invite employees to company
   * POST /api/employees/invite
   */
  static async inviteEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const invitationData: EmployeeInvitationRequest = req.body;

      // TODO: Validate that user is company admin
      // if (req.user.role !== UserRole.COMPANY_ADMIN) {
      //   res.status(403).json({ error: 'Only company admins can invite employees' });
      //   return;
      // }

      const result = await InvitationService.sendInvitations(
        req.user.companyId,
        req.user.id,
        invitationData
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send invitations',
      });
    }
  }

  /**
   * Get all invitations for company
   * GET /api/employees/invitations
   */
  static async getInvitations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const invitations = await InvitationService.getCompanyInvitations(
        req.user.companyId
      );

      res.json({
        success: true,
        data: invitations,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch invitations',
      });
    }
  }

  /**
   * Cancel an invitation
   * DELETE /api/employees/invitations/:id
   */
  static async cancelInvitation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await InvitationService.cancelInvitation(id);

      res.json({
        success: true,
        data: { message: 'Invitation cancelled successfully' },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel invitation',
      });
    }
  }

  /**
   * Update user role
   * PUT /api/employees/:id/role
   */
  static async updateUserRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const { role } = req.body;

      if (!role || !Object.values(UserRole).includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Invalid role provided',
        });
        return;
      }

      // Assign the role using RoleService
      await RoleService.assignRole(id, role, req.user.id);

      // Get updated user
      const updatedUser = await UserModel.findById(id);
      if (!updatedUser) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
            assignedBy: updatedUser.assignedBy,
          },
        },
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('permission') ? 403 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user role',
      });
    }
  }

  /**
   * Get all users in company
   * GET /api/employees
   */
  static async getCompanyUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const users = await UserModel.findByCompanyId(req.user.companyId);

      // Return user data without sensitive information
      const userData = users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        assignedBy: user.assignedBy,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      }));

      res.json({
        success: true,
        data: userData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users',
      });
    }
  }
}

