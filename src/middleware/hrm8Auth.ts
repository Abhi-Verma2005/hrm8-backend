/**
 * HRM8 Authentication Middleware
 * Verifies HRM8 session cookies and attaches HRM8 user to request
 */

import { Request, Response, NextFunction } from 'express';
import { HRM8SessionModel } from '../models/HRM8Session';
import { HRM8UserModel } from '../models/HRM8User';
import { getSessionCookieOptions } from '../utils/session';

import { HRM8UserRole } from '../types';
import { RegionService } from '../services/hrm8/RegionService';
import prisma from '../lib/prisma';

export interface Hrm8AuthenticatedRequest extends Request {
  hrm8User?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    licenseeId?: string;
    licenseeStatus?: string;
  };
  assignedRegionIds?: string[];
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

    // Check if licensee is suspended or terminated
    let licenseeStatus: string | undefined;
    if (hrm8User.role === HRM8UserRole.REGIONAL_LICENSEE && hrm8User.licenseeId) {
      const licensee = await prisma.regionalLicensee.findUnique({
        where: { id: hrm8User.licenseeId },
        select: { status: true },
      });

      if (licensee) {
        licenseeStatus = licensee.status;

        if (licensee.status === 'SUSPENDED') {
          res.clearCookie('hrm8SessionId', getSessionCookieOptions());
          res.status(403).json({
            success: false,
            error: 'Your licensee account has been suspended. Please contact HRM8 support.',
            code: 'LICENSEE_SUSPENDED',
          });
          return;
        }

        if (licensee.status === 'TERMINATED') {
          res.clearCookie('hrm8SessionId', getSessionCookieOptions());
          res.status(403).json({
            success: false,
            error: 'Your licensee account has been terminated. Please contact HRM8 support.',
            code: 'LICENSEE_TERMINATED',
          });
          return;
        }
      }
    }

    req.hrm8User = {
      id: hrm8User.id,
      email: hrm8User.email,
      firstName: hrm8User.firstName,
      lastName: hrm8User.lastName,
      role: hrm8User.role,
      licenseeId: hrm8User.licenseeId,
      licenseeStatus,
    };

    // If licensee, attach assigned region IDs
    if (hrm8User.role === HRM8UserRole.REGIONAL_LICENSEE && hrm8User.licenseeId) {
      const regions = await RegionService.getAll({ licenseeId: hrm8User.licenseeId });
      req.assignedRegionIds = regions.map(region => region.id);
    }

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Middleware to require a specific HRM8 role
 */
export function requireHrm8Role(roles: string[]) {
  return (req: Hrm8AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.hrm8User) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.hrm8User.role)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient permissions',
      });
      return;
    }

    next();
  };
}

