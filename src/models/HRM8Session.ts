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
        session_id: sessionId,
        hrm8_user_id: hrm8UserId,
        email,
        expires_at: expiresAt,
        last_activity: new Date(),
      },
    });

    return this.mapPrismaToSession(session);
  }

  /**
   * Find session by session ID
   */
  static async findBySessionId(sessionId: string): Promise<HRM8SessionData | null> {
    const session = await prisma.hRM8Session.findUnique({
      where: { session_id: sessionId },
    });

    if (!session) {
      return null;
    }

    // Check if session expired
    if (new Date() > (session as any).expires_at) {
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
      where: { session_id: sessionId },
      data: { last_activity: new Date() },
    });
  }

  /**
   * Delete session by session ID
   */
  static async deleteBySessionId(sessionId: string): Promise<void> {
    await prisma.hRM8Session.delete({
      where: { session_id: sessionId },
    }).catch(() => {
      // Session might not exist, ignore error
    });
  }

  /**
   * Delete all sessions for an HRM8 user
   */
  static async deleteAllByHrm8UserId(hrm8UserId: string): Promise<void> {
    await prisma.hRM8Session.deleteMany({
      where: { hrm8_user_id: hrm8UserId },
    });
  }

  /**
   * Delete expired sessions
   */
  static async deleteExpired(): Promise<number> {
    const now = new Date();
    const result = await prisma.hRM8Session.deleteMany({
      where: {
        expires_at: {
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
      where: { hrm8_user_id: hrm8UserId },
      orderBy: { created_at: 'desc' },
    });

    return sessions.map((session) => this.mapPrismaToSession(session));
  }

  /**
   * Map Prisma session to HRM8SessionData interface
   */
  private static mapPrismaToSession(prismaSession: any): HRM8SessionData {
    return {
      id: prismaSession.id,
      sessionId: prismaSession.session_id,
      hrm8UserId: prismaSession.hrm8_user_id,
      email: prismaSession.email,
      expiresAt: prismaSession.expires_at,
      lastActivity: prismaSession.last_activity,
      createdAt: prismaSession.created_at,
    };
  }
}

