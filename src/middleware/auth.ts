/**
 * Authentication Middleware
 * Verifies session cookies and attaches user to request
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { SessionModel } from '../models/Session';

/**
 * Middleware to verify session cookie and authenticate user
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId = req.cookies?.sessionId;

    if (!sessionId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login.',
      });
      return;
    }

    const session = await SessionModel.findBySessionId(sessionId);

    if (!session) {
      res.clearCookie('sessionId', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
      });

      res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please login again.',
      });
      return;
    }

    await SessionModel.updateLastActivity(sessionId);

    req.user = {
      id: session.userId,
      email: session.email,
      companyId: session.companyId,
      role: session.userRole,
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Middleware to check if user is company admin
 */
export function requireCompanyAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
    return;
  }

  if (req.user.role !== 'COMPANY_ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Only company admins can perform this action',
    });
    return;
  }

  next();
}
