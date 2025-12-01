/**
 * Password Reset Service
 * Handles forgot password flows and secure password updates
 */

import { emailService } from '../email/EmailService';
import { normalizeEmail } from '../../utils/email';
import { PasswordResetTokenModel } from '../../models/PasswordResetToken';
import { UserModel } from '../../models/User';
import { generateToken, hashToken } from '../../utils/token';
import { hashPassword } from '../../utils/password';

const DEFAULT_TOKEN_TTL_MINUTES = 60;

export class PasswordResetService {
  /**
   * Request a password reset link.
   * Always resolves successfully to avoid account enumeration.
   */
  static async requestPasswordReset(
    email: string,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    const normalizedEmail = normalizeEmail(email);
    const user = await UserModel.findByEmail(normalizedEmail);

    if (!user) {
      // Intentionally return success even if the user does not exist
      return;
    }

    // Remove any existing active tokens for this user
    await PasswordResetTokenModel.invalidateActiveTokensForUser(user.id);

    const rawToken = generateToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresInMinutes = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES) || DEFAULT_TOKEN_TTL_MINUTES;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    await PasswordResetTokenModel.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      requestedIp: metadata?.ip,
      requestedUserAgent: metadata?.userAgent,
    });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

    await emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
      expiresAt,
    });
  }

  /**
   * Reset password using a token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const tokenRecord = await PasswordResetTokenModel.findByTokenHash(tokenHash);

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    const user = await UserModel.findById(tokenRecord.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const passwordHash = await hashPassword(newPassword);
    await UserModel.updatePassword(user.id, passwordHash);

    await PasswordResetTokenModel.markAsUsed(tokenRecord.id);
    await PasswordResetTokenModel.invalidateActiveTokensForUser(user.id);

    await emailService.sendPasswordChangeConfirmation({
      to: user.email,
      name: user.name,
      changedAt: new Date(),
    });
  }
}






