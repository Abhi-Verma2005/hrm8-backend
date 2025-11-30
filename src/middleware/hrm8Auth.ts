/**
 * HRM8 Authentication Middleware
 * Verifies HRM8 session cookies and attaches HRM8 user to request
 */

import { Request, Response, NextFunction } from 'express';
import { HRM8SessionModel } from '../models/HRM8Session';
import { HRM8UserModel } from '../models/HRM8User';
import { getSessionCookieOptions } from '../utils/session';

export interface Hrm8AuthenticatedRequest extends Request {
  hrm8User?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

/**
 * Middleware to verify HRM8 session cookie and authenticate HRM8 user
 */
export async function authenticateHrm8User(
  req: Hrm8AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId = req.cookies?.hrm8SessionId;

    if (!sessionId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login.',
      });
      return;
    }

    const session = await HRM8SessionModel.findBySessionId(sessionId);

    if (!session) {
      res.clearCookie('hrm8SessionId', getSessionCookieOptions());

      res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please login again.',
      });
      return;
    }

    await HRM8SessionModel.updateLastActivity(sessionId);

    // Get HRM8 user data
    const hrm8User = await HRM8UserModel.findById(session.hrm8UserId);

    if (!hrm8User) {
      res.clearCookie('hrm8SessionId', getSessionCookieOptions());
      res.status(401).json({
        success: false,
        error: 'HRM8 user not found',
      });
      return;
    }

    req.hrm8User = {
      id: hrm8User.id,
      email: hrm8User.email,
      firstName: hrm8User.firstName,
      lastName: hrm8User.lastName,
      role: hrm8User.role,
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

