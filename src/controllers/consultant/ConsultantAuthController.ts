/**
 * Consultant Authentication Controller
 * Handles HTTP requests for consultant authentication endpoints
 */

import { Request, Response } from 'express';
import { ConsultantAuthService, ConsultantLoginRequest } from '../../services/consultant/ConsultantAuthService';
import { ConsultantSessionModel } from '../../models/ConsultantSession';
import { generateSessionId, getSessionExpiration, getSessionCookieOptions } from '../../utils/session';
import { ConsultantAuthenticatedRequest } from '../../middleware/consultantAuth';

export class ConsultantAuthController {
  /**
   * Login consultant
   * POST /api/consultant/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: ConsultantLoginRequest = req.body;

      // Validate required fields
      if (!loginData.email || !loginData.password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
        return;
      }

      // Login consultant
      const result = await ConsultantAuthService.login(loginData);

      // Check if service returned an error
      if ('error' in result) {
        res.status(result.status || 401).json({
          success: false,
          error: result.error,
          ...(result.details ? { details: result.details } : {}),
        });
        return;
      }

      const { consultant } = result;

      // Create session
      const sessionId = generateSessionId();
      const expiresAt = getSessionExpiration();

      await ConsultantSessionModel.create(
        sessionId,
        consultant.id,
        consultant.email,
        expiresAt
      );

      // Set session cookie
      res.cookie('consultantSessionId', sessionId, getSessionCookieOptions());

      // Return consultant data (without password hash)
      res.json({
        success: true,
        data: {
          consultant: {
            id: consultant.id,
            email: consultant.email,
            firstName: consultant.firstName,
            lastName: consultant.lastName,
            role: consultant.role,
            status: consultant.status,
          },
        },
      });
    } catch (error) {
      console.error('Consultant login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed. Please try again.',
      });
    }
  }

  /**
   * Logout consultant
   * POST /api/consultant/auth/logout
   */
  static async logout(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sessionId = req.cookies?.consultantSessionId;

      if (sessionId) {
        await ConsultantSessionModel.deleteBySessionId(sessionId);
      }

      res.clearCookie('consultantSessionId', getSessionCookieOptions());

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('Consultant logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
      });
    }
  }

  /**
   * Get current consultant
   * GET /api/consultant/auth/me
   */
  static async getCurrentConsultant(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.consultant) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const consultant = await ConsultantAuthService.findById(req.consultant.id);

      if (!consultant) {
        res.status(404).json({
          success: false,
          error: 'Consultant not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          consultant: {
            id: consultant.id,
            email: consultant.email,
            firstName: consultant.firstName,
            lastName: consultant.lastName,
            role: consultant.role,
            status: consultant.status,
          },
        },
      });
    } catch (error) {
      console.error('Get current consultant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get consultant information',
      });
    }
  }
}

