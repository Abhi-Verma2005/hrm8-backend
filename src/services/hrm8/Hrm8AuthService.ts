/**
 * HRM8 Authentication Service
 * Handles HRM8 Global Admin and Regional Licensee authentication
 */

import { HRM8UserModel, HRM8UserData } from '../../models/HRM8User';
import { normalizeEmail } from '../../utils/email';
import { comparePassword } from '../../utils/password';
import { HRM8UserStatus } from '@prisma/client';

export interface Hrm8LoginRequest {
  email: string;
  password: string;
}

export class Hrm8AuthService {
  /**
   * Login HRM8 user
   */
  static async login(
    loginData: Hrm8LoginRequest
  ): Promise<
    { hrm8User: HRM8UserData } | { error: string; status: number; details?: Record<string, unknown> }
  > {
    // Find HRM8 user by email
    const hrm8User = await HRM8UserModel.findByEmail(normalizeEmail(loginData.email));
    
    if (!hrm8User) {
      return { 
        error: 'Invalid email or password', 
        status: 401,
        details: { code: 'INVALID_CREDENTIALS' },
      };
    }

    // Check if user is active
    if (hrm8User.status !== HRM8UserStatus.ACTIVE) {
      return {
        error: 'Account is not active',
        status: 403,
        details: { code: 'ACCOUNT_INACTIVE', status: hrm8User.status },
      };
    }

    // Verify password
    const passwordValid = await comparePassword(loginData.password, hrm8User.passwordHash);
    if (!passwordValid) {
      return {
        error: 'Invalid email or password',
        status: 401,
        details: { code: 'INVALID_CREDENTIALS' },
      };
    }

    // Update last login
    await HRM8UserModel.updateLastLogin(hrm8User.id);

    return { hrm8User };
  }

  /**
   * Find HRM8 user by email
   */
  static async findByEmail(email: string): Promise<HRM8UserData | null> {
    return await HRM8UserModel.findByEmail(normalizeEmail(email));
  }

  /**
   * Find HRM8 user by ID
   */
  static async findById(id: string): Promise<HRM8UserData | null> {
    return await HRM8UserModel.findById(id);
  }
}

