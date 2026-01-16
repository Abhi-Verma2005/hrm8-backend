/**
 * Universal Authentication Middleware
 * Attempts to authenticate the user using multiple strategies (Company, Candidate, Consultant, HRM8)
 * and populates the request object with the authenticated user's details.
 */

import { Request, Response, NextFunction } from 'express';
import { SessionModel } from '../models/Session';
import { CandidateSessionModel } from '../models/CandidateSession';
import { ConsultantSessionModel } from '../models/ConsultantSession';
import { HRM8SessionModel } from '../models/HRM8Session';
import { CandidateModel } from '../models/Candidate';
import { ConsultantModel } from '../models/Consultant';
import { HRM8UserModel } from '../models/HRM8User';
import { getSessionCookieOptions } from '../utils/session';
import { AuthenticatedRequest } from '../types';
import { CandidateAuthenticatedRequest } from './candidateAuth';
import { ConsultantAuthenticatedRequest } from './consultantAuth';
import { Hrm8AuthenticatedRequest } from './hrm8Auth';

export interface UniversalAuthenticatedRequest extends Request {
    user?: AuthenticatedRequest['user'];
    candidate?: CandidateAuthenticatedRequest['candidate'];
    consultant?: ConsultantAuthenticatedRequest['consultant'];
    hrm8User?: Hrm8AuthenticatedRequest['hrm8User'];
}

export async function authenticateUniversal(
    req: UniversalAuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    // Check for Company User Session
    if (req.cookies?.sessionId) {
        const session = await SessionModel.findBySessionId(req.cookies.sessionId);
        if (session) {
            await SessionModel.updateLastActivity(req.cookies.sessionId);
            req.user = {
                id: session.userId,
                email: session.email,
                name: session.name,
                companyId: session.companyId,
                role: session.userRole,
                type: session.companyId ? 'COMPANY' : undefined,
            };
            return next();
        }
    }

    // Check for Candidate Session
    if (req.cookies?.candidateSessionId) {
        const session = await CandidateSessionModel.findBySessionId(req.cookies.candidateSessionId);
        if (session) {
            await CandidateSessionModel.updateLastActivity(req.cookies.candidateSessionId);
            const candidate = await CandidateModel.findById(session.candidateId);
            if (candidate) {
                req.candidate = {
                    id: candidate.id,
                    email: candidate.email,
                    firstName: candidate.firstName,
                    lastName: candidate.lastName,
                };
                return next();
            }
        }
    }

    // Check for Consultant Session
    if (req.cookies?.consultantSessionId) {
        const session = await ConsultantSessionModel.findBySessionId(req.cookies.consultantSessionId);
        if (session) {
            await ConsultantSessionModel.updateLastActivity(req.cookies.consultantSessionId);
            const consultant = await ConsultantModel.findById(session.consultantId);
            if (consultant) {
                req.consultant = {
                    id: consultant.id,
                    email: consultant.email,
                    firstName: consultant.firstName,
                    lastName: consultant.lastName,
                    role: consultant.role,
                    regionId: consultant.regionId || '',
                };
                return next();
            }
        }
    }

    // Check for HRM8 User Session
    if (req.cookies?.hrm8SessionId) {
        const session = await HRM8SessionModel.findBySessionId(req.cookies.hrm8SessionId);
        if (session) {
            await HRM8SessionModel.updateLastActivity(req.cookies.hrm8SessionId);
            const hrm8User = await HRM8UserModel.findById(session.hrm8UserId);
            if (hrm8User) {
                req.hrm8User = {
                    id: hrm8User.id,
                    email: hrm8User.email,
                    firstName: hrm8User.firstName,
                    lastName: hrm8User.lastName,
                    role: hrm8User.role,
                    licenseeId: hrm8User.licenseeId,
                };
                return next();
            }
        }
    }

    // If no valid session found
    res.status(401).json({
        success: false,
        error: 'Not authenticated',
    });
}
