/**
 * Candidate Authentication Service
 * Handles candidate authentication, registration, and login
 */

import { CandidateModel, CandidateData } from '../../models/Candidate';
import { normalizeEmail, isValidEmail } from '../../utils/email';
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
  ): Promise<
    | { candidate: CandidateData; verificationToken: string; expiresAt: Date }
    | { error: string; code?: string }
  > {
    // Validate email format
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

    // Create candidate with email_verified: false and status: PENDING_VERIFICATION
    try {
      const candidate = await CandidateModel.create({
        email,
        passwordHash,
        firstName: registerData.firstName.trim(),
        lastName: registerData.lastName.trim(),
        phone: registerData.phone?.trim(),
      });

      // Generate verification token
      const { generateVerificationToken } = await import('../../utils/token');
      const token = generateVerificationToken();

      // Set expiration (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Store token in database
      const { CandidateVerificationTokenModel } = await import('../../models/CandidateVerificationToken');
      await CandidateVerificationTokenModel.create({
        candidateId: candidate.id,
        email: candidate.email,
        token,
        expiresAt,
      });

      return { candidate, verificationToken: token, expiresAt };
    } catch (error: any) {
      return { error: error.message || 'Registration failed', code: 'REGISTRATION_FAILED' };
    }
  }

  /**
   * Verify candidate email using verification token
   * Marks email as verified, activates account, and creates session for auto-login
   */
  static async verifyEmail(
    token: string
  ): Promise<
    | { candidate: CandidateData; sessionId: string }
    | { error: string; code?: string }
  > {
    const { CandidateVerificationTokenModel } = await import('../../models/CandidateVerificationToken');

    // Get token data first to check if it exists
    const tokenData = await CandidateVerificationTokenModel.findByToken(token);
    if (!tokenData) {
      return { error: 'Invalid verification token', code: 'INVALID_TOKEN' };
    }

    // Validate token (check expiration and usage)
    const isValid = await CandidateVerificationTokenModel.isValidToken(token);
    if (!isValid) {
      if (tokenData.usedAt) {
        return { error: 'This verification link has already been used', code: 'TOKEN_USED' };
      }
      if (tokenData.expiresAt < new Date()) {
        return { error: 'This verification link has expired. Please request a new one.', code: 'TOKEN_EXPIRED' };
      }
      return { error: 'Invalid verification token', code: 'INVALID_TOKEN' };
    }

    // Get candidate
    const candidate = await CandidateModel.findById(tokenData.candidateId);
    if (!candidate) {
      return { error: 'Candidate not found', code: 'CANDIDATE_NOT_FOUND' };
    }

    // Mark token as used
    await CandidateVerificationTokenModel.markAsUsed(tokenData.id);

    // Update candidate: email_verified = true, status = ACTIVE
    await CandidateModel.updateEmailVerified(candidate.id, true);
    await CandidateModel.updateStatus(candidate.id, 'ACTIVE');

    // Create session for auto-login
    const { generateSessionId, getSessionExpiration } = await import('../../utils/session');
    const { CandidateSessionModel } = await import('../../models/CandidateSession');

    const sessionId = generateSessionId();
    const expiresAt = getSessionExpiration(24); // 24 hours

    await CandidateSessionModel.create(
      sessionId,
      candidate.id,
      candidate.email,
      expiresAt
    );

    // Fetch updated candidate
    const updatedCandidate = await CandidateModel.findById(candidate.id);
    if (!updatedCandidate) {
      return { error: 'Failed to retrieve updated candidate', code: 'UPDATE_FAILED' };
    }

    return { candidate: updatedCandidate, sessionId };
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

