/**
 * Authentication Middleware
 * Verifies session cookies and attaches user to request
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { SessionModel } from '../models/Session';
import { getSessionCookieOptions } from '../utils/session';

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
      res.clearCookie('sessionId', getSessionCookieOptions());

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
 * Middleware to check if user is super admin or admin
 */
export function requireAdmin(
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

  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Only administrators can perform this action',
    });
    return;
  }

  next();
}

/**
 * Middleware to check if user is super admin
 */
export function requireSuperAdmin(
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

  if (req.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Only super administrators can perform this action',
    });
    return;
  }

  next();
}

/**
 * Middleware to check if user has job posting permission
 * SUPER_ADMIN and ADMIN can post jobs
 */
export function requireJobPostingPermission(
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

  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'You do not have permission to post jobs. Contact your administrator.',
    });
    return;
  }

  next();
}

/**
 * Legacy middleware - kept for backward compatibility
 * @deprecated Use requireAdmin instead
 */
export const requireCompanyAdmin = requireAdmin;
