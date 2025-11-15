/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 */

import { Request, Response } from 'express';
import { CompanyRegistrationRequest, LoginRequest, AcceptInvitationRequest } from '../../types';
import { CompanyService } from '../../services/company/CompanyService';
import { AuthService } from '../../services/auth/AuthService';
import { InvitationService } from '../../services/invitation/InvitationService';

export class AuthController {
  /**
   * Register a new company and company admin
   * POST /api/auth/register/company
   */
  static async registerCompany(req: Request, res: Response): Promise<void> {
    try {
      const registrationData: CompanyRegistrationRequest = req.body;

      // TODO: Validate request data using validators

      // Register company
      const { company, verificationMethod, verificationRequired } = 
        await CompanyService.registerCompany(registrationData);

      // TODO: Hash password
      // const passwordHash = await bcrypt.hash(registrationData.password, 10);

      // Register company admin
      const adminUser = await AuthService.registerCompanyAdmin(
        company.id,
        registrationData.adminEmail,
        registrationData.adminName,
        'placeholder-password-hash' // TODO: Replace with actual hash
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

      // TODO: Validate request data

      const user = await AuthService.login(loginData);

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      // TODO: Generate JWT token
      const token = 'placeholder-jwt-token';

      // TODO: Get company name
      const company = await CompanyService.findById(user.companyId);
      const companyName = company?.name || '';

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
          },
          token,
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
      const { token, password: _password, name }: AcceptInvitationRequest = req.body;

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

      // TODO: Hash password
      // const passwordHash = await bcrypt.hash(password, 10);

      // Register employee
      const user = await AuthService.registerEmployeeFromInvitation(
        invitation.companyId,
        invitation.email,
        name,
        'placeholder-password-hash' // TODO: Replace with actual hash
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
      const { email, password: _password, name } = req.body;

      // TODO: Validate request data

      // Try to auto-join via email domain
      // TODO: Hash password
      const user = await AuthService.registerEmployeeAutoJoin(
        email,
        name,
        'placeholder-password-hash' // TODO: Replace with actual hash
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
}

