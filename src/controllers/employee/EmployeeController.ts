/**
 * Employee Controller
 * Handles HTTP requests for employee-related endpoints
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest, EmployeeInvitationRequest } from '../../types';
import { InvitationService } from '../../services/invitation/InvitationService';

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
}

