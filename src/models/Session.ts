/**
 * Session Model
 * Represents user sessions for cookie-based authentication
 */

import { UserRole } from '@prisma/client';
import prisma from '../lib/prisma';

export interface SessionData {
  id: string;
  sessionId: string;
  userId: string;
  companyId: string;
  userRole: UserRole;
  email: string;
  name: string;
  expiresAt: Date;
  lastActivity: Date;
  createdAt: Date;
}

export class SessionModel {
  /**
   * Create a new session
   */
  static async create(
    sessionId: string,
    userId: string,
    companyId: string,
    userRole: UserRole,
    email: string,
    expiresAt: Date
  ): Promise<SessionData> {
    const session = await prisma.session.create({
      data: {
        session_id: sessionId,
        user_id: userId,
        company_id: companyId,
        user_role: userRole,
        email,
        expires_at: expiresAt,
        last_activity: new Date(),
      },
      include: { user: { select: { name: true } } },
    });

    return this.mapPrismaToSession(session);
  }

  /**
   * Find session by session ID
   */
  static async findBySessionId(sessionId: string): Promise<SessionData | null> {
    const session = await prisma.session.findUnique({
      where: { session_id: sessionId },
      include: { user: { select: { name: true } } },
    });

    if (!session) {
      return null;
    }

    // Check if session expired
    if (new Date() > session.expires_at) {
      await this.deleteBySessionId(sessionId);
      return null;
    }

    return this.mapPrismaToSession(session);
  }

  /**
   * Update session last activity
   */
  static async updateLastActivity(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { session_id: sessionId },
      data: { last_activity: new Date() },
    });
  }

  /**
   * Delete session by session ID
   */
  static async deleteBySessionId(sessionId: string): Promise<void> {
    await prisma.session.delete({
      where: { session_id: sessionId },
    }).catch(() => {
      // Session might not exist, ignore error
    });
  }

  /**
   * Delete all sessions for a user
   */
  static async deleteAllByUserId(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { user_id: userId },
    });
  }

  /**
   * Delete expired sessions
   */
  static async deleteExpired(): Promise<number> {
    const now = new Date();
    const result = await prisma.session.deleteMany({
      where: {
        expires_at: {
          lt: now,
        },
      },
    });

    return result.count;
  }

  /**
   * Find all sessions for a user
   */
  static async findByUserId(userId: string): Promise<SessionData[]> {
    const sessions = await prisma.session.findMany({
      where: { user_id: userId },
      include: { user: { select: { name: true } } },
      orderBy: { created_at: 'desc' },
    });

    return sessions.map((session) => this.mapPrismaToSession(session));
  }

  /**
   * Map Prisma session to SessionData interface
   */
  private static mapPrismaToSession(prismaSession: any): SessionData {
    return {
      id: prismaSession.id,
      sessionId: prismaSession.session_id,
      userId: prismaSession.user_id,
      companyId: prismaSession.company_id,
      userRole: prismaSession.user_role,
      email: prismaSession.email,
      name: prismaSession.user?.name || '',
      expiresAt: prismaSession.expires_at,
      lastActivity: prismaSession.last_activity,
      createdAt: prismaSession.created_at,
    };
  }
}

