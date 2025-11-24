/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 */

import { Request, Response } from 'express';
import { CompanyRegistrationRequest, LoginRequest, AcceptInvitationRequest, AuthenticatedRequest, UserStatus } from '../../types';
import { CompanyService } from '../../services/company/CompanyService';
import { CompanyProfileService } from '../../services/company/CompanyProfileService';
import { AuthService } from '../../services/auth/AuthService';
import { InvitationService } from '../../services/invitation/InvitationService';
import { VerificationService } from '../../services/verification/VerificationService';
import { SessionModel } from '../../models/Session';
import { UserModel } from '../../models/User';
import { generateSessionId, getSessionExpiration, getSessionCookieOptions } from '../../utils/session';
import { CompanyAlreadyExistsError } from '../../models/Company';

export class AuthController {
  /**
   * Register a new company and company admin
   * POST /api/auth/register/company
   */
  static async registerCompany(req: Request, res: Response): Promise<void> {
    try {
      const registrationData: CompanyRegistrationRequest = req.body;
      const adminFullName = `${registrationData.adminFirstName} ${registrationData.adminLastName}`.trim();

      // TODO: Validate request data using validators

      // Register company
      const { company, verificationMethod, verificationRequired } = 
        await CompanyService.registerCompany(registrationData);

      // Register company admin
      // Activate user only if email domain matches (auto-verified)
      // Otherwise, user will be activated after email verification
      const adminUser = await AuthService.registerCompanyAdmin(
        company.id,
        registrationData.adminEmail,
        adminFullName,
        registrationData.password,
        !verificationRequired // Only activate if auto-verified via email domain check
      );

      res.status(201).json({
        success: true,
        data: {
          companyId: company.id,
          adminUserId: adminUser.id,
          verificationRequired,
          verificationMethod,
          message: verificationRequired
            ? 'Company registered. Please verify your email to activate your account.'
            : 'Company registered and verified successfully.',
        },
      });
    } catch (error) {
      // Handle specific errors
      if (error instanceof CompanyAlreadyExistsError) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }

      // Handle other errors
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: LoginRequest = req.body;

      // Validate credentials
      const result = await AuthService.login(loginData);

      // Check if login returned an error
      if ('error' in result) {
        res.status(result.status).json({
          success: false,
          error: result.error,
          ...(result.details ? { details: result.details } : {}),
        });
        return;
      }

      const { user } = result;

      // Generate session ID
      const sessionId = generateSessionId();
      const expiresAt = getSessionExpiration(24); // 24 hours

      // Create session in database
      await SessionModel.create(
        sessionId,
        user.id,
        user.companyId,
        user.role,
        user.email,
        expiresAt
      );

      // Set session cookie
      res.cookie('sessionId', sessionId, getSessionCookieOptions());

      // Get company name
      const company = await CompanyService.findById(user.companyId);
      const companyName = company?.name || '';
      const companyWebsite = company?.website || '';
      const companyDomain = company?.domain || '';

      const profile = await CompanyProfileService.getProfileSummary(user.companyId);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId,
            companyName,
            companyWebsite,
            companyDomain,
          },
          profile,
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
   * Accept invitation and register employee
   * POST /api/auth/accept-invitation
   */
  static async acceptInvitation(req: Request, res: Response): Promise<void> {
    try {
      const { token, password, name }: AcceptInvitationRequest = req.body;

      // TODO: Validate request data

      // Find invitation by token
      const invitation = await InvitationService.findByToken(token);

      if (!invitation) {
        res.status(404).json({
          success: false,
          error: 'Invitation not found',
        });
        return;
      }

      // Check if invitation is valid
      if (!InvitationService.isInvitationValid(invitation)) {
        res.status(400).json({
          success: false,
          error: 'Invitation is expired or already used',
        });
        return;
      }

      // Register employee
      const user = await AuthService.registerEmployeeFromInvitation(
        invitation.companyId,
        invitation.email,
        name,
        password
      );

      // Mark invitation as accepted
      await InvitationService.acceptInvitation(invitation.id);

      res.status(201).json({
        success: true,
        data: {
          userId: user.id,
          message: 'Account created successfully. You can now login.',
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to accept invitation',
      });
    }
  }

  /**
   * Register employee via auto-join (email domain matching)
   * POST /api/auth/register/employee
   */
  static async registerEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;

      // Try to auto-join via email domain
      const user = await AuthService.registerEmployeeAutoJoin(
        email,
        name,
        password
      );

      if (!user) {
        res.status(400).json({
          success: false,
          error: 'No company found for this email domain. Please contact your company admin for an invitation.',
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: {
          userId: user.id,
          message: 'Account created successfully. You can now login.',
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  }

  /**
   * Get current user
   * GET /api/auth/me
   */
  static async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      // Get user details from database
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Get company name
      const company = await CompanyService.findById(user.companyId);
      const companyName = company?.name || '';
      const companyWebsite = company?.website || '';
      const companyDomain = company?.domain || '';

      const profile = await CompanyProfileService.getProfileSummary(user.companyId);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId,
            companyName,
            companyWebsite,
            companyDomain,
          },
          profile,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user',
      });
    }
  }

  /**
   * Verify company via email token (public route, no authentication required)
   * POST /api/auth/verify-company
   */
  static async verifyCompany(req: Request, res: Response): Promise<void> {
    try {
      const { token, companyId } = req.body;

      if (!token || !companyId) {
        res.status(400).json({
          success: false,
          error: 'Token and companyId are required',
        });
        return;
      }

      const result = await VerificationService.verifyByEmailToken(companyId, token);

      if (!result.verified) {
        res.status(400).json({
          success: false,
          error: result.error || 'Invalid or expired verification token',
        });
        return;
      }

      // After successful verification, automatically create a session for the user
      // since they've proven their identity via email verification
      if (result.email) {
        const user = await UserModel.findByEmail(result.email);
        
        if (user && user.status === UserStatus.ACTIVE) {
          // Generate session ID
          const sessionId = generateSessionId();
          const expiresAt = getSessionExpiration(24); // 24 hours

          // Create session in database
          await SessionModel.create(
            sessionId,
            user.id,
            user.companyId,
            user.role,
            user.email,
            expiresAt
          );

          // Set session cookie
          res.cookie('sessionId', sessionId, {
            httpOnly: true, // Prevent XSS attacks
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Lax for local development, strict for production
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            path: '/', // Available on all routes
            domain: process.env.NODE_ENV === 'production' ? undefined : undefined, // Don't set domain for localhost
          });

          // Update last login
          await UserModel.updateLastLogin(user.id);

          // Get company name
          const company = await CompanyService.findById(user.companyId);
          const companyName = company?.name || '';
          const companyWebsite = company?.website || '';
          const companyDomain = company?.domain || '';

          const profile = await CompanyProfileService.getProfileSummary(user.companyId);

          res.json({
            success: true,
            data: { 
              message: 'Company verified successfully. You have been automatically logged in.',
              email: result.email,
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                companyId: user.companyId,
                companyName,
                companyWebsite,
                companyDomain,
              },
              profile,
            },
          });
          return;
        }
      }

      // Fallback: verification succeeded but couldn't create session
      res.json({
        success: true,
        data: { 
          message: 'Company verified successfully. You can now login.',
          email: result.email, // Return email for frontend to use for auto-login
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      });
    }
  }

  /**
   * Resend verification email for pending company admins
   * POST /api/auth/resend-verification
   */
  static async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body as { email: string };

      const result = await VerificationService.resendVerificationEmail(email);

      res.json({
        success: true,
        data: {
          message: 'Verification email sent. Please check your inbox.',
          ...result,
        },
      });
    } catch (error) {
      console.error('[AuthController.resendVerification] Failed to resend verification email', {
        email: req.body?.email,
        error,
      });

      const status =
        error instanceof Error && 'status' in error && typeof (error as { status?: number }).status === 'number'
          ? (error as { status: number }).status
          : 400;

      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resend verification email',
      });
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.cookies.sessionId;

      if (sessionId) {
        // Delete session from database
        await SessionModel.deleteBySessionId(sessionId);
      }

      // Clear session cookie (use same options as when setting)
      res.clearCookie('sessionId', getSessionCookieOptions());

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
}

