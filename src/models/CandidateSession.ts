/**
 * CandidateSession Model
 * Represents candidate sessions for cookie-based authentication
 */

import prisma from '../lib/prisma';

export interface CandidateSessionData {
  id: string;
  sessionId: string;
  candidateId: string;
  email: string;
  expiresAt: Date;
  lastActivity: Date;
  createdAt: Date;
}

export class CandidateSessionModel {
  /**
   * Create a new candidate session
   */
  static async create(
    sessionId: string,
    candidateId: string,
    email: string,
    expiresAt: Date
  ): Promise<CandidateSessionData> {
    const session = await prisma.candidateSession.create({
      data: {
        session_id: sessionId,
        candidate_id: candidateId,
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
  static async findBySessionId(sessionId: string): Promise<CandidateSessionData | null> {
    const session = await prisma.candidateSession.findUnique({
      where: { session_id: sessionId },
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
    await prisma.candidateSession.update({
      where: { session_id: sessionId },
      data: { last_activity: new Date() },
    });
  }

  /**
   * Delete session by session ID
   */
  static async deleteBySessionId(sessionId: string): Promise<void> {
    await prisma.candidateSession.delete({
      where: { session_id: sessionId },
    }).catch(() => {
      // Session might not exist, ignore error
    });
  }

  /**
   * Delete all sessions for a candidate
   */
  static async deleteAllByCandidateId(candidateId: string): Promise<void> {
    await prisma.candidateSession.deleteMany({
      where: { candidate_id: candidateId },
    });
  }

  /**
   * Delete expired sessions
   */
  static async deleteExpired(): Promise<number> {
    const now = new Date();
    const result = await prisma.candidateSession.deleteMany({
      where: {
        expires_at: {
          lt: now,
        },
      },
    });

    return result.count;
  }

  /**
   * Find all sessions for a candidate
   */
  static async findByCandidateId(candidateId: string): Promise<CandidateSessionData[]> {
    const sessions = await prisma.candidateSession.findMany({
      where: { candidate_id: candidateId },
      orderBy: { created_at: 'desc' },
    });

    return sessions.map((session) => this.mapPrismaToSession(session));
  }

  /**
   * Map Prisma session to CandidateSessionData interface
   */
  private static mapPrismaToSession(prismaSession: any): CandidateSessionData {
    return {
      id: prismaSession.id,
      sessionId: prismaSession.session_id,
      candidateId: prismaSession.candidate_id,
      email: prismaSession.email,
      expiresAt: prismaSession.expires_at,
      lastActivity: prismaSession.last_activity,
      createdAt: prismaSession.created_at,
    };
  }
}

