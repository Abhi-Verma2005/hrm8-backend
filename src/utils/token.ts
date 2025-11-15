/**
 * Token Generation Utilities
 * Used for invitation tokens, verification tokens, etc.
 */

import crypto from 'crypto';

/**
 * Generate a secure random token
 * @param length - Length of the token (default: 32)
 * @returns Random token string
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate an invitation token
 * @returns Invitation token
 */
export function generateInvitationToken(): string {
  return generateToken(32);
}

/**
 * Generate a verification token
 * @returns Verification token
 */
export function generateVerificationToken(): string {
  return generateToken(32);
}

/**
 * Hash a token (for storage in database)
 * @param token - Token to hash
 * @returns Hashed token
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Compare a token with a hashed token
 * @param token - Plain token
 * @param hashedToken - Hashed token from database
 * @returns true if tokens match
 */
export function compareToken(token: string, hashedToken: string): boolean {
  const hashed = hashToken(token);
  return hashed === hashedToken;
}

