/**
 * HRM8 Authentication Controller
 * Handles HTTP requests for HRM8 authentication endpoints
 */

import { Request, Response } from 'express';
import { Hrm8AuthService, Hrm8LoginRequest } from '../../services/hrm8/Hrm8AuthService';
import { HRM8SessionModel } from '../../models/HRM8Session';
import { generateSessionId, getSessionExpiration, getSessionCookieOptions } from '../../utils/session';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';

export class Hrm8AuthController {
  /**
   * Login HRM8 user
   * POST /api/hrm8/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: Hrm8LoginRequest = req.body;

      // Validate required fields
      if (!loginData.email || !loginData.password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
        return;
      }

      // Login HRM8 user
      const result = await Hrm8AuthService.login(loginData);

      // Check if service returned an error
      if ('error' in result) {
        res.status(result.status || 401).json({
          success: false,
          error: result.error,
          ...(result.details ? { details: result.details } : {}),
        });
        return;
      }

      const { hrm8User } = result;

      // Create session
      const sessionId = generateSessionId();
      const expiresAt = getSessionExpiration();

      await HRM8SessionModel.create(
        sessionId,
        hrm8User.id,
        hrm8User.email,
        expiresAt
      );

      // Set session cookie
      res.cookie('hrm8SessionId', sessionId, getSessionCookieOptions());

      // Return user data (without password hash)
      res.json({
        success: true,
        data: {
          hrm8User: {
            id: hrm8User.id,
            email: hrm8User.email,
            firstName: hrm8User.firstName,
            lastName: hrm8User.lastName,
            role: hrm8User.role,
            status: hrm8User.status,
            licenseeId: hrm8User.licenseeId,
          },
        },
      });
    } catch (error) {
      console.error('HRM8 login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed. Please try again.',
      });
    }
  }

  /**
   * Logout HRM8 user
   * POST /api/hrm8/auth/logout
   */
  static async logout(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sessionId = req.cookies?.hrm8SessionId;

      if (sessionId) {
        await HRM8SessionModel.deleteBySessionId(sessionId);
      }

      res.clearCookie('hrm8SessionId', getSessionCookieOptions());

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('HRM8 logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
      });
    }
  }

  /**
   * Get current HRM8 user
   * GET /api/hrm8/auth/me
   */
  static async getCurrentHrm8User(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.hrm8User) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const hrm8User = await Hrm8AuthService.findById(req.hrm8User.id);

      if (!hrm8User) {
        res.status(404).json({
          success: false,
          error: 'HRM8 user not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          hrm8User: {
            id: hrm8User.id,
            email: hrm8User.email,
            firstName: hrm8User.firstName,
            lastName: hrm8User.lastName,
            role: hrm8User.role,
            status: hrm8User.status,
            licenseeId: hrm8User.licenseeId,
          },
        },
      });
    } catch (error) {
      console.error('Get current HRM8 user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user information',
      });
    }
  }
}

