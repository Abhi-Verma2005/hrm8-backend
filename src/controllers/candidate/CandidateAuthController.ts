/**
 * Candidate Authentication Controller
 * Handles HTTP requests for candidate authentication endpoints
 */

import { Request, Response } from 'express';
import { CandidateAuthService, CandidateLoginRequest, CandidateRegisterRequest } from '../../services/candidate/CandidateAuthService';
import { CandidateService } from '../../services/candidate/CandidateService';
import { CandidateSessionModel } from '../../models/CandidateSession';
import { generateSessionId, getSessionExpiration, getSessionCookieOptions } from '../../utils/session';
import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';

export class CandidateAuthController {
  /**
   * Register a new candidate
   * POST /api/candidate/auth/register
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const registerData: CandidateRegisterRequest = req.body;

      // Validate required fields
      if (!registerData.email || !registerData.password || !registerData.firstName || !registerData.lastName) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: email, password, firstName, lastName',
        });
        return;
      }

      // Validate email format
      const { isValidEmail, normalizeEmail } = await import('../../utils/email');
      const normalizedEmail = normalizeEmail(registerData.email);
      
      if (!isValidEmail(normalizedEmail)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email address format',
          code: 'INVALID_EMAIL',
        });
        return;
      }

      // Register candidate
      const result = await CandidateAuthService.register(registerData);

      // Check if service returned an error
      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      // Send account creation email
      try {
        const { emailService } = await import('../../services/email/EmailService');
        
        await emailService.sendAccountCreationEmail({
          to: result.email,
          name: `${result.firstName} ${result.lastName}`,
          loginEmail: result.email,
          loginPassword: registerData.password, // Send the plain password for first login
        });
      } catch (emailError) {
        console.error('❌ Failed to send account creation email:', emailError);
        console.error('Error details:', emailError instanceof Error ? emailError.message : emailError);
        // Continue even if email fails - don't block registration
      }

      res.status(201).json({
        success: true,
        data: {
          candidate: {
            id: result.id,
            email: result.email,
            firstName: result.firstName,
            lastName: result.lastName,
            emailVerified: result.emailVerified,
            status: result.status,
          },
          message: 'Registration successful. Check your email for account details.',
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  }

  /**
   * Login candidate
   * POST /api/candidate/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: CandidateLoginRequest = req.body;

      // Validate credentials
      const result = await CandidateAuthService.login(loginData);

      // Check if login returned an error
      if ('error' in result) {
        res.status(result.status).json({
          success: false,
          error: result.error,
          ...(result.details ? { details: result.details } : {}),
        });
        return;
      }

      const { candidate } = result;

      // Generate session ID
      const sessionId = generateSessionId();
      const expiresAt = getSessionExpiration(24); // 24 hours

      // Create session in database
      await CandidateSessionModel.create(
        sessionId,
        candidate.id,
        candidate.email,
        expiresAt
      );

      // Set session cookie
      res.cookie('candidateSessionId', sessionId, getSessionCookieOptions());

      res.json({
        success: true,
        data: {
          candidate: {
            id: candidate.id,
            email: candidate.email,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            emailVerified: candidate.emailVerified,
            status: candidate.status,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
    }
  }

  /**
   * Logout candidate
   * POST /api/candidate/auth/logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.cookies?.candidateSessionId;

      if (sessionId) {
        await CandidateSessionModel.deleteBySessionId(sessionId);
      }

      res.clearCookie('candidateSessionId', getSessionCookieOptions());

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      });
    }
  }

  /**
   * Get current candidate
   * GET /api/candidate/auth/me
   */
  static async getCurrentCandidate(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      // This will be handled by middleware that attaches candidate to req
      const candidate = req.candidate;

      if (!candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      // Fetch full candidate profile from database
      const profile = await CandidateService.getProfile(candidate.id);

      if (!profile) {
        res.status(404).json({
          success: false,
          error: 'Profile not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          candidate: {
            id: profile.id,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            phone: profile.phone,
            photo: profile.photo,
            linkedInUrl: profile.linkedInUrl,
            city: profile.city,
            state: profile.state,
            country: profile.country,
            emailVerified: profile.emailVerified,
            status: profile.status,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get candidate',
      });
    }
  }
}

