/**
 * Candidate Authentication Service
 * Handles candidate authentication, registration, and login
 */

import { CandidateModel, CandidateData } from '../../models/Candidate';
import { normalizeEmail } from '../../utils/email';
import { comparePassword, hashPassword, isPasswordStrong } from '../../utils/password';

export interface CandidateLoginRequest {
  email: string;
  password: string;
}

export interface CandidateRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export class CandidateAuthService {
  /**
   * Register a new candidate
   */
  static async register(
    registerData: CandidateRegisterRequest
  ): Promise<CandidateData | { error: string; code?: string }> {
    // Validate email format
    const { isValidEmail } = await import('../../utils/email');
    const email = normalizeEmail(registerData.email);
    
    if (!isValidEmail(email)) {
      return { error: 'Invalid email address format', code: 'INVALID_EMAIL' };
    }

    // Check if candidate already exists
    const existing = await CandidateModel.findByEmail(email);
    if (existing) {
      return { error: 'Email already registered', code: 'EMAIL_EXISTS' };
    }

    // Validate password strength
    if (!isPasswordStrong(registerData.password)) {
      return { error: 'Password must be at least 8 characters with uppercase, lowercase, and number', code: 'WEAK_PASSWORD' };
    }

    // Hash password
    const passwordHash = await hashPassword(registerData.password);

    // Create candidate
    try {
      const candidate = await CandidateModel.create({
        email,
        passwordHash,
        firstName: registerData.firstName.trim(),
        lastName: registerData.lastName.trim(),
        phone: registerData.phone?.trim(),
      });

      return candidate;
    } catch (error: any) {
      return { error: error.message || 'Registration failed', code: 'REGISTRATION_FAILED' };
    }
  }

  /**
   * Login candidate
   * Returns candidate if successful, or throws error with status code for specific cases
   */
  static async login(
    loginData: CandidateLoginRequest
  ): Promise<
    { candidate: CandidateData } | { error: string; status: number; details?: Record<string, unknown> }
  > {
    // Find candidate by email
    const candidate = await CandidateModel.findByEmail(normalizeEmail(loginData.email));
    
    if (!candidate) {
      return { 
        error: 'Invalid email or password', 
        status: 401,
        details: { code: 'INVALID_CREDENTIALS' },
      };
    }

    // Verify password
    const isValidPassword = await comparePassword(
      loginData.password,
      candidate.passwordHash
    );

    if (!isValidPassword) {
      return { 
        error: 'Invalid email or password', 
        status: 401,
        details: { code: 'INVALID_CREDENTIALS' },
      };
    }

    // Check candidate status
    if (candidate.status === 'INACTIVE') {
      return { 
        error: 'Your account has been deactivated. Please contact support.', 
        status: 403,
        details: { code: 'ACCOUNT_INACTIVE' },
      };
    }

    if (candidate.status !== 'ACTIVE' && candidate.status !== 'PENDING_VERIFICATION') {
      return { 
        error: 'Your account is not active. Please contact support.', 
        status: 403,
        details: { code: 'ACCOUNT_NOT_ACTIVE' },
      };
    }

    // Update last login
    await CandidateModel.updateLastLogin(candidate.id);

    return { candidate };
  }

  /**
   * Find candidate by email
   */
  static async findByEmail(email: string): Promise<CandidateData | null> {
    return await CandidateModel.findByEmail(normalizeEmail(email));
  }

  /**
   * Find candidate by ID
   */
  static async findById(id: string): Promise<CandidateData | null> {
    return await CandidateModel.findById(id);
  }
}

