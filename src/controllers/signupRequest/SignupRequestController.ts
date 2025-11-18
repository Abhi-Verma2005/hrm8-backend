/**
 * SignupRequest Controller
 * Handles HTTP requests for signup request endpoints
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest, EmployeeSignupRequest, RejectSignupRequest } from '../../types';
import { SignupRequestService } from '../../services/signupRequest/SignupRequestService';

export class SignupRequestController {
  /**
   * Create a new signup request (public route)
   * POST /api/auth/signup
   */
  static async createSignupRequest(req: Request, res: Response): Promise<void> {
    try {
      const signupData: EmployeeSignupRequest = req.body;

      const signupRequest = await SignupRequestService.createSignupRequest(signupData);

      res.status(201).json({
        success: true,
        data: {
          requestId: signupRequest.id,
          message: 'Signup request submitted. The company admin will review your request.',
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create signup request',
      });
    }
  }

  /**
   * Get all pending signup requests for company (admin only)
   * GET /api/signup-requests/pending
   */
  static async getPendingSignupRequests(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // TODO: Validate that user is company admin
      // if (req.user.role !== UserRole.COMPANY_ADMIN) {
      //   res.status(403).json({ error: 'Only company admins can view signup requests' });
      //   return;
      // }

      const signupRequests = await SignupRequestService.getPendingSignupRequests(
        req.user.companyId
      );

      res.json({
        success: true,
        data: signupRequests,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch signup requests',
      });
    }
  }

  /**
   * Get all signup requests for company (admin only)
   * GET /api/signup-requests
   */
  static async getSignupRequests(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const signupRequests = await SignupRequestService.getSignupRequests(
        req.user.companyId
      );

      res.json({
        success: true,
        data: signupRequests,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch signup requests',
      });
    }
  }

  /**
   * Approve signup request (admin only)
   * POST /api/signup-requests/:id/approve
   */
  static async approveSignupRequest(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;

      const result = await SignupRequestService.approveSignupRequest(
        id,
        req.user.id
      );

      res.json({
        success: true,
        data: {
          signupRequest: result.signupRequest,
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
          },
          message: 'Signup request approved and user account created',
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve signup request',
      });
    }
  }

  /**
   * Reject signup request (admin only)
   * POST /api/signup-requests/:id/reject
   */
  static async rejectSignupRequest(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const { reason }: RejectSignupRequest = req.body;

      const signupRequest = await SignupRequestService.rejectSignupRequest(
        id,
        req.user.id,
        reason
      );

      res.json({
        success: true,
        data: {
          signupRequest,
          message: 'Signup request rejected',
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject signup request',
      });
    }
  }
}

