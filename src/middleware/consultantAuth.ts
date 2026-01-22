/**
 * Consultant Authentication Middleware
 * Verifies consultant session cookies and attaches consultant to request
 */

import { Request, Response, NextFunction } from 'express';
import { ConsultantSessionModel } from '../models/ConsultantSession';
import { ConsultantModel } from '../models/Consultant';
import { getSessionCookieOptions } from '../utils/session';

export interface ConsultantAuthenticatedRequest extends Request {
  consultant?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    regionId: string;
    status: string;
  };
}

/**
 * Middleware to verify consultant session cookie and authenticate consultant
 */
export async function authenticateConsultant(
  req: ConsultantAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId = req.cookies?.consultantSessionId;

    if (!sessionId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login.',
      });
      return;
    }

    const session = await ConsultantSessionModel.findBySessionId(sessionId);

    if (!session) {
      res.clearCookie('consultantSessionId', getSessionCookieOptions());

      res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please login again.',
      });
      return;
    }

    await ConsultantSessionModel.updateLastActivity(sessionId);

    // Get consultant data
    const consultant = await ConsultantModel.findById(session.consultantId);

    if (!consultant) {
      res.clearCookie('consultantSessionId', getSessionCookieOptions());
      res.status(401).json({
        success: false,
        error: 'Consultant not found',
      });
      return;
    }

    // Check if consultant is suspended/inactive
    if (consultant.status === 'SUSPENDED' || consultant.status === 'INACTIVE') {
      res.clearCookie('consultantSessionId', getSessionCookieOptions());
      res.status(403).json({
        success: false,
        error: 'Your consultant account has been suspended. Please contact your regional manager.',
        code: 'CONSULTANT_SUSPENDED',
      });
      return;
    }

    // Check if consultant is on leave
    if (consultant.status === 'ON_LEAVE') {
      // Allow access but with a warning - they can still view data
      // Just adding the status to the request for tracking
    }

    req.consultant = {
      id: consultant.id,
      email: consultant.email,
      firstName: consultant.firstName,
      lastName: consultant.lastName,
      role: consultant.role,
      regionId: consultant.regionId || '',
      status: consultant.status,
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
 * Middleware requiring CONSULTANT_360 role only
 */
export async function requireConsultant360(
  req: ConsultantAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (req.consultant?.role !== 'CONSULTANT_360') {
    res.status(403).json({
      success: false,
      error: 'Access denied. Consultant 360 role required.',
    });
    return;
  }
  next();
}

/**
 * Middleware requiring RECRUITER role ONLY (strict isolation)
 * CONSULTANT_360 should use /api/consultant360/* routes instead
 */
export async function requireRecruiter(
  req: ConsultantAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const role = req.consultant?.role;
  if (role !== 'RECRUITER') {
    res.status(403).json({
      success: false,
      error: 'Access denied. Recruiter role required.',
    });
    return;
  }
  next();
}

/**
 * Middleware requiring SALES_AGENT role ONLY (strict isolation)
 * CONSULTANT_360 should use /api/consultant360/* routes instead
 */
export async function requireSalesAgent(
  req: ConsultantAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const role = req.consultant?.role;
  if (role !== 'SALES_AGENT') {
    res.status(403).json({
      success: false,
      error: 'Access denied. Sales Agent role required.',
    });
    return;
  }
  next();
}

/**
 * Middleware allowing CONSULTANT_360 to access both consultant and sales routes
 * Accepts any authenticated consultant (used for shared resources)
 */
export async function requireConsultant360OrAccess(
  req: ConsultantAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const role = req.consultant?.role;
  if (role === 'CONSULTANT_360' || role === 'RECRUITER' || role === 'SALES_AGENT') {
    next();
    return;
  }
  res.status(403).json({
    success: false,
    error: 'Access denied. Valid consultant role required.',
  });
}
