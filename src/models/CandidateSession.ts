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
        sessionId,
        candidateId,
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
  static async findBySessionId(sessionId: string): Promise<CandidateSessionData | null> {
    const session = await prisma.candidateSession.findUnique({
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
    await prisma.candidateSession.update({
      where: { sessionId },
      data: { lastActivity: new Date() },
    });
  }

  /**
   * Delete session by session ID
   */
  static async deleteBySessionId(sessionId: string): Promise<void> {
    await prisma.candidateSession.delete({
      where: { sessionId },
    }).catch(() => {
      // Session might not exist, ignore error
    });
  }

  /**
   * Delete all sessions for a candidate
   */
  static async deleteAllByCandidateId(candidateId: string): Promise<void> {
    await prisma.candidateSession.deleteMany({
      where: { candidateId },
    });
  }

  /**
   * Delete expired sessions
   */
  static async deleteExpired(): Promise<number> {
    const now = new Date();
    const result = await prisma.candidateSession.deleteMany({
      where: {
        expiresAt: {
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
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((session) => this.mapPrismaToSession(session));
  }

  /**
   * Map Prisma session to CandidateSessionData interface
   */
  private static mapPrismaToSession(prismaSession: {
    id: string;
    sessionId: string;
    candidateId: string;
    email: string;
    expiresAt: Date;
    lastActivity: Date;
    createdAt: Date;
  }): CandidateSessionData {
    return {
      id: prismaSession.id,
      sessionId: prismaSession.sessionId,
      candidateId: prismaSession.candidateId,
      email: prismaSession.email,
      expiresAt: prismaSession.expiresAt,
      lastActivity: prismaSession.lastActivity,
      createdAt: prismaSession.createdAt,
    };
  }
}

