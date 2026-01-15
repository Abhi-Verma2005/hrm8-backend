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

    req.consultant = {
      id: consultant.id,
      email: consultant.email,
      firstName: consultant.firstName,
      lastName: consultant.lastName,
      role: consultant.role,
      regionId: consultant.regionId || '',
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

