/**
 * Password Reset Token Model
 * Handles secure password reset token storage and retrieval
 */

import prisma from '../lib/prisma';

export interface PasswordResetTokenData {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  requestedIp?: string | null;
  requestedUserAgent?: string | null;
  createdAt: Date;
}

export class PasswordResetTokenModel {
  /**
   * Create a password reset token (hashed)
   */
  static async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    requestedIp?: string;
    requestedUserAgent?: string;
  }): Promise<PasswordResetTokenData> {
    const token = await prisma.passwordResetToken.create({
      data: {
        user_id: data.userId,
        token_hash: data.tokenHash,
        expires_at: data.expiresAt,
        requested_ip: data.requestedIp,
        requested_user_agent: data.requestedUserAgent,
      },
    });

    return this.mapToData(token);
  }

  /**
   * Find token by hashed value
   */
  static async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenData | null> {
    const token = await prisma.passwordResetToken.findUnique({
      where: { token_hash: tokenHash },
    });

    return token ? this.mapToData(token) : null;
  }

  /**
   * Delete or invalidate all active tokens for a user
   */
  static async invalidateActiveTokensForUser(userId: string): Promise<number> {
    const result = await prisma.passwordResetToken.deleteMany({
      where: {
        user_id: userId,
        used_at: null,
      },
    });

    return result.count;
  }

  /**
   * Mark a token as used
   */
  static async markAsUsed(id: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id },
      data: { used_at: new Date() },
    });
  }

  /**
   * Delete expired tokens (cleanup job)
   */
  static async deleteExpiredTokens(): Promise<number> {
    const result = await prisma.passwordResetToken.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  private static mapToData(token: any): PasswordResetTokenData {
    return {
      id: token.id,
      userId: token.user_id,
      tokenHash: token.token_hash,
      expiresAt: token.expires_at,
      usedAt: token.used_at,
      requestedIp: token.requested_ip,
      requestedUserAgent: token.requested_user_agent,
      createdAt: token.created_at,
    };
  }
}


