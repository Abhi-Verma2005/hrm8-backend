/**
 * Candidate Authentication Middleware
 * Verifies candidate session cookies and attaches candidate to request
 */

import { Request, Response, NextFunction } from 'express';
import { CandidateSessionModel } from '../models/CandidateSession';
import { CandidateModel } from '../models/Candidate';
import { getSessionCookieOptions } from '../utils/session';

export interface CandidateAuthenticatedRequest extends Request {
  candidate?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Middleware to verify candidate session cookie and authenticate candidate
 */
export async function authenticateCandidate(
  req: CandidateAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId = req.cookies?.candidateSessionId;

    if (!sessionId) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated. Please login.',
      });
      return;
    }

    const session = await CandidateSessionModel.findBySessionId(sessionId);

    if (!session) {
      res.clearCookie('candidateSessionId', getSessionCookieOptions());

      res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please login again.',
      });
      return;
    }

    await CandidateSessionModel.updateLastActivity(sessionId);

    // Get candidate data
    const candidate = await CandidateModel.findById(session.candidateId);

    if (!candidate) {
      res.clearCookie('candidateSessionId', getSessionCookieOptions());
      res.status(401).json({
        success: false,
        error: 'Candidate not found',
      });
      return;
    }

    req.candidate = {
      id: candidate.id,
      email: candidate.email,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

