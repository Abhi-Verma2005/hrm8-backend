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
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        requestedIp: data.requestedIp,
        requestedUserAgent: data.requestedUserAgent,
      },
    });

    return this.mapToData(token);
  }

  /**
   * Find token by hashed value
   */
  static async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenData | null> {
    const token = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    return token ? this.mapToData(token) : null;
  }

  /**
   * Delete or invalidate all active tokens for a user
   */
  static async invalidateActiveTokensForUser(userId: string): Promise<number> {
    const result = await prisma.passwordResetToken.deleteMany({
      where: {
        userId,
        usedAt: null,
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
      data: { usedAt: new Date() },
    });
  }

  /**
   * Delete expired tokens (cleanup job)
   */
  static async deleteExpiredTokens(): Promise<number> {
    const result = await prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  private static mapToData(token: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    requestedIp: string | null;
    requestedUserAgent: string | null;
    createdAt: Date;
  }): PasswordResetTokenData {
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      requestedIp: token.requestedIp,
      requestedUserAgent: token.requestedUserAgent,
      createdAt: token.createdAt,
    };
  }
}


