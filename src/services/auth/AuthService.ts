/**
 * Authentication Service
 * Handles user authentication, registration, and login
 */

import { User, UserRole, UserStatus, LoginRequest } from '../../types';
import { UserModel } from '../../models/User';
import { CompanyService } from '../company/CompanyService';
import { extractEmailDomain } from '../../utils/domain';
import { normalizeEmail } from '../../utils/email';

export class AuthService {
  /**
   * Register company admin during company registration
   */
  static async registerCompanyAdmin(
    companyId: string,
    email: string,
    name: string,
    passwordHash: string
  ): Promise<User> {
    const user = await UserModel.create({
      email: normalizeEmail(email),
      name: name.trim(),
      passwordHash,
      companyId,
      role: UserRole.COMPANY_ADMIN,
      status: UserStatus.PENDING_VERIFICATION,
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
    passwordHash: string
  ): Promise<User> {
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
    passwordHash: string
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
   */
  static async login(loginData: LoginRequest): Promise<User | null> {
    // TODO: Implement password verification
    // For now, placeholder logic
    
    const user = await UserModel.findByEmail(normalizeEmail(loginData.email));
    
    if (!user) {
      return null;
    }

    // TODO: Verify password hash matches
    // const isValidPassword = await bcrypt.compare(loginData.password, user.passwordHash);
    // if (!isValidPassword) return null;

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      return null;
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    return user;
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

