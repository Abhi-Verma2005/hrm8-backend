/**
 * Consultant Authentication Service
 * Handles consultant authentication
 */

import { ConsultantModel, ConsultantData } from '../../models/Consultant';
import { normalizeEmail } from '../../utils/email';
import { comparePassword } from '../../utils/password';
import { ConsultantStatus } from '@prisma/client';

export interface ConsultantLoginRequest {
  email: string;
  password: string;
}

export class ConsultantAuthService {
  /**
   * Login consultant
   */
  static async login(
    loginData: ConsultantLoginRequest
  ): Promise<
    { consultant: ConsultantData } | { error: string; status: number; details?: Record<string, unknown> }
  > {
    // Find consultant by email
    const consultant = await ConsultantModel.findByEmail(normalizeEmail(loginData.email));
    
    if (!consultant) {
      return { 
        error: 'Invalid email or password', 
        status: 401,
        details: { code: 'INVALID_CREDENTIALS' },
      };
    }

    // Check if consultant is active
    if (consultant.status !== ConsultantStatus.ACTIVE) {
      return {
        error: 'Account is not active',
        status: 403,
        details: { code: 'ACCOUNT_INACTIVE', status: consultant.status },
      };
    }

    // Verify password
    const passwordValid = await comparePassword(loginData.password, consultant.passwordHash);
    if (!passwordValid) {
      return {
        error: 'Invalid email or password',
        status: 401,
        details: { code: 'INVALID_CREDENTIALS' },
      };
    }

    // Update last login
    await ConsultantModel.updateLastLogin(consultant.id);

    return { consultant };
  }

  /**
   * Find consultant by email
   */
  static async findByEmail(email: string): Promise<ConsultantData | null> {
    return await ConsultantModel.findByEmail(normalizeEmail(email));
  }

  /**
   * Find consultant by ID
   */
  static async findById(id: string): Promise<ConsultantData | null> {
    return await ConsultantModel.findById(id);
  }
}

