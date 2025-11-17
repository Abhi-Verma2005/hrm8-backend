/**
 * Verification Token Model
 * Handles verification tokens for company email verification
 */

import prisma from '../lib/prisma';

export interface VerificationTokenData {
  id: string;
  companyId: string;
  email: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export class VerificationTokenModel {
  /**
   * Create a new verification token
   */
  static async create(data: {
    companyId: string;
    email: string;
    token: string;
    expiresAt: Date;
  }): Promise<VerificationTokenData> {
    const verificationToken = await prisma.verificationToken.create({
      data: {
        companyId: data.companyId,
        email: data.email.toLowerCase(),
        token: data.token,
        expiresAt: data.expiresAt,
      },
    });

    return {
      id: verificationToken.id,
      companyId: verificationToken.companyId,
      email: verificationToken.email,
      token: verificationToken.token,
      expiresAt: verificationToken.expiresAt,
      usedAt: verificationToken.usedAt,
      createdAt: verificationToken.createdAt,
    };
  }

  /**
   * Find verification token by token string
   */
  static async findByToken(token: string): Promise<VerificationTokenData | null> {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return null;
    }

    return {
      id: verificationToken.id,
      companyId: verificationToken.companyId,
      email: verificationToken.email,
      token: verificationToken.token,
      expiresAt: verificationToken.expiresAt,
      usedAt: verificationToken.usedAt,
      createdAt: verificationToken.createdAt,
    };
  }

  /**
   * Mark token as used
   */
  static async markAsUsed(tokenId: string): Promise<void> {
    await prisma.verificationToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  /**
   * Delete expired tokens (cleanup)
   */
  static async deleteExpiredTokens(): Promise<number> {
    const result = await prisma.verificationToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Check if token is valid (not expired and not used)
   */
  static async isValidToken(token: string): Promise<boolean> {
    const verificationToken = await this.findByToken(token);
    
    if (!verificationToken) {
      return false;
    }

    if (verificationToken.usedAt) {
      return false; // Already used
    }

    if (verificationToken.expiresAt < new Date()) {
      return false; // Expired
    }

    return true;
  }
}

