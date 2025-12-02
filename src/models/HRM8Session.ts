/**
 * HRM8Session Model
 * Represents HRM8 user sessions for cookie-based authentication
 */

import prisma from '../lib/prisma';

export interface HRM8SessionData {
  id: string;
  sessionId: string;
  hrm8UserId: string;
  email: string;
  expiresAt: Date;
  lastActivity: Date;
  createdAt: Date;
}

export class HRM8SessionModel {
  /**
   * Create a new HRM8 session
   */
  static async create(
    sessionId: string,
    hrm8UserId: string,
    email: string,
    expiresAt: Date
  ): Promise<HRM8SessionData> {
    const session = await prisma.hRM8Session.create({
      data: {
        sessionId,
        hrm8UserId,
        email,
        expiresAt,
        lastActivity: new Date(),
      },
    });

    return this.mapPrismaToSession(session);
  }

  /**
   * Find session by session ID
   */
  static async findBySessionId(sessionId: string): Promise<HRM8SessionData | null> {
    const session = await prisma.hRM8Session.findUnique({
      where: { sessionId },
    });

    if (!session) {
      return null;
    }

    // Check if session expired
    if (new Date() > session.expiresAt) {
      await this.deleteBySessionId(sessionId);
      return null;
    }

    return this.mapPrismaToSession(session);
  }

  /**
   * Update session last activity
   */
  static async updateLastActivity(sessionId: string): Promise<void> {
    await prisma.hRM8Session.update({
      where: { sessionId },
      data: { lastActivity: new Date() },
    });
  }

  /**
   * Delete session by session ID
   */
  static async deleteBySessionId(sessionId: string): Promise<void> {
    await prisma.hRM8Session.delete({
      where: { sessionId },
    }).catch(() => {
      // Session might not exist, ignore error
    });
  }

  /**
   * Delete all sessions for an HRM8 user
   */
  static async deleteAllByHrm8UserId(hrm8UserId: string): Promise<void> {
    await prisma.hRM8Session.deleteMany({
      where: { hrm8UserId },
    });
  }

  /**
   * Delete expired sessions
   */
  static async deleteExpired(): Promise<number> {
    const now = new Date();
    const result = await prisma.hRM8Session.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    return result.count;
  }

  /**
   * Find all sessions for an HRM8 user
   */
  static async findByHrm8UserId(hrm8UserId: string): Promise<HRM8SessionData[]> {
    const sessions = await prisma.hRM8Session.findMany({
      where: { hrm8UserId },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((session) => this.mapPrismaToSession(session));
  }

  /**
   * Map Prisma session to HRM8SessionData interface
   */
  private static mapPrismaToSession(prismaSession: {
    id: string;
    sessionId: string;
    hrm8UserId: string;
    email: string;
    expiresAt: Date;
    lastActivity: Date;
    createdAt: Date;
  }): HRM8SessionData {
    return {
      id: prismaSession.id,
      sessionId: prismaSession.sessionId,
      hrm8UserId: prismaSession.hrm8UserId,
      email: prismaSession.email,
      expiresAt: prismaSession.expiresAt,
      lastActivity: prismaSession.lastActivity,
      createdAt: prismaSession.createdAt,
    };
  }
}

