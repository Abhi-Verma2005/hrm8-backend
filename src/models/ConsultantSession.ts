/**
 * ConsultantSession Model
 * Represents consultant sessions for cookie-based authentication
 */

import prisma from '../lib/prisma';

export interface ConsultantSessionData {
  id: string;
  sessionId: string;
  consultantId: string;
  email: string;
  expiresAt: Date;
  lastActivity: Date;
  createdAt: Date;
}

export class ConsultantSessionModel {
  /**
   * Create a new consultant session
   */
  static async create(
    sessionId: string,
    consultantId: string,
    email: string,
    expiresAt: Date
  ): Promise<ConsultantSessionData> {
    const session = await prisma.consultantSession.create({
      data: {
        session_id: sessionId,
        consultant_id: consultantId,
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
  static async findBySessionId(sessionId: string): Promise<ConsultantSessionData | null> {
    const session = await prisma.consultantSession.findUnique({
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
    await prisma.consultantSession.update({
      where: { session_id: sessionId },
      data: { last_activity: new Date() },
    });
  }

  /**
   * Delete session by session ID
   */
  static async deleteBySessionId(sessionId: string): Promise<void> {
    await prisma.consultantSession.delete({
      where: { session_id: sessionId },
    }).catch(() => {
      // Session might not exist, ignore error
    });
  }

  /**
   * Delete all sessions for a consultant
   */
  static async deleteAllByConsultantId(consultantId: string): Promise<void> {
    await prisma.consultantSession.deleteMany({
      where: { consultant_id: consultantId },
    });
  }

  /**
   * Delete expired sessions
   */
  static async deleteExpired(): Promise<number> {
    const now = new Date();
    const result = await prisma.consultantSession.deleteMany({
      where: {
        expires_at: {
          lt: now,
        },
      },
    });

    return result.count;
  }

  /**
   * Find all sessions for a consultant
   */
  static async findByConsultantId(consultantId: string): Promise<ConsultantSessionData[]> {
    const sessions = await prisma.consultantSession.findMany({
      where: { consultant_id: consultantId },
      orderBy: { created_at: 'desc' },
    });

    return sessions.map((session) => this.mapPrismaToSession(session));
  }

  /**
   * Map Prisma session to ConsultantSessionData interface
   */
  private static mapPrismaToSession(prismaSession: any): ConsultantSessionData {
    return {
      id: prismaSession.id,
      sessionId: prismaSession.session_id,
      consultantId: prismaSession.consultant_id,
      email: prismaSession.email,
      expiresAt: prismaSession.expires_at,
      lastActivity: prismaSession.last_activity,
      createdAt: prismaSession.created_at,
    };
  }
}

