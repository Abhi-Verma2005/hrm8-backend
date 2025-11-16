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
        sessionId,
        userId,
        companyId,
        userRole,
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
  static async findBySessionId(sessionId: string): Promise<SessionData | null> {
    const session = await prisma.session.findUnique({
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
    await prisma.session.update({
      where: { sessionId },
      data: { lastActivity: new Date() },
    });
  }

  /**
   * Delete session by session ID
   */
  static async deleteBySessionId(sessionId: string): Promise<void> {
    await prisma.session.delete({
      where: { sessionId },
    }).catch(() => {
      // Session might not exist, ignore error
    });
  }

  /**
   * Delete all sessions for a user
   */
  static async deleteAllByUserId(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId },
    });
  }

  /**
   * Delete expired sessions
   */
  static async deleteExpired(): Promise<number> {
    const now = new Date();
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
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
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((session) => this.mapPrismaToSession(session));
  }

  /**
   * Map Prisma session to SessionData interface
   */
  private static mapPrismaToSession(prismaSession: {
    id: string;
    sessionId: string;
    userId: string;
    companyId: string;
    userRole: UserRole;
    email: string;
    expiresAt: Date;
    lastActivity: Date;
    createdAt: Date;
  }): SessionData {
    return {
      id: prismaSession.id,
      sessionId: prismaSession.sessionId,
      userId: prismaSession.userId,
      companyId: prismaSession.companyId,
      userRole: prismaSession.userRole,
      email: prismaSession.email,
      expiresAt: prismaSession.expiresAt,
      lastActivity: prismaSession.lastActivity,
      createdAt: prismaSession.createdAt,
    };
  }
}

