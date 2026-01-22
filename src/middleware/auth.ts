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

    console.log('[authenticate] Auth check:', {
      path: req.path,
      method: req.method,
      hasSessionCookie: !!sessionId,
      hasCookieHeader: !!req.headers.cookie,
      hasAuthHeader: !!req.headers.authorization,
    });

    if (!sessionId) {
      console.log('[authenticate] No sessionId cookie found');
      res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login.',
      });
      return;
    }

    const session = await SessionModel.findBySessionId(sessionId);

    if (!session) {
      console.log('[authenticate] Session not found or expired for sessionId:', sessionId.substring(0, 8) + '...');
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
      name: session.name,
      companyId: session.companyId,
      role: session.userRole,
      type: session.companyId ? 'COMPANY' : undefined,
    };

    console.log('[authenticate] User authenticated:', {
      userId: session.userId,
      email: session.email,
      companyId: session.companyId,
      role: session.userRole,
      type: req.user.type,
    });

    next();
  } catch (error) {
    console.error('[authenticate] Error during authentication:', error);
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
