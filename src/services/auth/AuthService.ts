/**
 * Authentication Service
 * Handles user authentication, registration, and login
 */

import { User, UserRole, UserStatus, LoginRequest } from '../../types';
import { UserModel } from '../../models/User';
import { CompanyService } from '../company/CompanyService';
import { extractEmailDomain } from '../../utils/domain';
import { normalizeEmail } from '../../utils/email';
import { comparePassword, hashPassword } from '../../utils/password';

export class AuthService {
  /**
   * Register company admin during company registration
   */
  static async registerCompanyAdmin(
    companyId: string,
    email: string,
    name: string,
    password: string,
    activate: boolean = false
  ): Promise<User> {
    // Hash password
    const passwordHash = await hashPassword(password);

    const user = await UserModel.create({
      email: normalizeEmail(email),
      name: name.trim(),
      passwordHash,
      companyId,
      role: UserRole.COMPANY_ADMIN,
      status: activate ? UserStatus.ACTIVE : UserStatus.PENDING_VERIFICATION,
      isCompanyAdmin: true,
    });

    return user;
  }

  /**
   * Register employee via invitation
   */
  static async registerEmployeeFromInvitation(
    companyId: string,
    email: string,
    name: string,
    password: string
  ): Promise<User> {
    // Hash password
    const passwordHash = await hashPassword(password);

    const user = await UserModel.create({
      email: normalizeEmail(email),
      name: name.trim(),
      passwordHash,
      companyId,
      role: UserRole.EMPLOYEE,
      status: UserStatus.ACTIVE,
      isCompanyAdmin: false,
    });

    return user;
  }

  /**
   * Register employee via auto-join (email domain matching)
   */
  static async registerEmployeeAutoJoin(
    email: string,
    name: string,
    password: string
  ): Promise<User | null> {
    // Extract email domain
    const emailDomain = extractEmailDomain(email);

    // Find company by domain
    const company = await CompanyService.findByDomain(emailDomain);
    
    if (!company) {
      return null; // No company found for this domain
    }

    // Check if company is verified (optional requirement)
    // You might want to allow auto-join only for verified companies

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create employee user
    const user = await UserModel.create({
      email: normalizeEmail(email),
      name: name.trim(),
      passwordHash,
      companyId: company.id,
      role: UserRole.EMPLOYEE,
      status: UserStatus.ACTIVE,
      isCompanyAdmin: false,
    });

    return user;
  }

  /**
   * Login user
   * Returns user if successful, null if invalid credentials, or throws error with status code for specific cases
   */
  static async login(loginData: LoginRequest): Promise<{ user: User } | { error: string; status: number }> {
    // Find user by email
    const user = await UserModel.findByEmail(normalizeEmail(loginData.email));
    
    if (!user) {
      return { error: 'Invalid email or password', status: 401 };
    }

    // Verify password
    const isValidPassword = await comparePassword(
      loginData.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      return { error: 'Invalid email or password', status: 401 };
    }

    // Check user status
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      return { 
        error: 'Your account is pending verification. Please verify your email to activate your account.', 
        status: 403 
      };
    }

    if (user.status === UserStatus.INACTIVE) {
      return { 
        error: 'Your account has been deactivated. Please contact your administrator.', 
        status: 403 
      };
    }

    if (user.status === UserStatus.INVITED) {
      return { 
        error: 'Please accept your invitation and set up your password first.', 
        status: 403 
      };
    }

    if (user.status !== UserStatus.ACTIVE) {
      return { 
        error: 'Your account is not active. Please contact your administrator.', 
        status: 403 
      };
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    return { user };
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    return await UserModel.findByEmail(normalizeEmail(email));
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    return await UserModel.findById(id);
  }
}

