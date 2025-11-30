/**
 * Conversation Model
 * Represents a conversation between a candidate and recruiters for a specific job
 */

import prisma from '../lib/prisma';

export interface ConversationData {
  id: string;
  jobId: string;
  candidateId: string;
  participants: string[];
  lastMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ConversationModel {
  /**
   * Create a new conversation
   */
  static async create(conversationData: {
    jobId: string;
    candidateId: string;
    participants: string[];
  }): Promise<ConversationData> {
    const conversation = await prisma.conversation.create({
      data: {
        jobId: conversationData.jobId,
        candidateId: conversationData.candidateId,
        participants: conversationData.participants,
      },
    });

    return this.mapPrismaToConversation(conversation);
  }

  /**
   * Find conversation by ID
   */
  static async findById(id: string): Promise<ConversationData | null> {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    return conversation ? this.mapPrismaToConversation(conversation) : null;
  }

  /**
   * Find conversation by job and candidate
   */
  static async findByJobAndCandidate(
    jobId: string,
    candidateId: string
  ): Promise<ConversationData | null> {
    const conversation = await prisma.conversation.findUnique({
      where: {
        jobId_candidateId: {
          jobId,
          candidateId,
        },
      },
    });

    return conversation ? this.mapPrismaToConversation(conversation) : null;
  }

  /**
   * Find all conversations for a participant (by email)
   */
  static async findByParticipantEmail(
    email: string
  ): Promise<ConversationData[]> {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          has: email,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return conversations.map((conv) => this.mapPrismaToConversation(conv));
  }

  /**
   * Update last message ID and updatedAt
   */
  static async updateLastMessage(
    conversationId: string,
    lastMessageId: string
  ): Promise<ConversationData> {
    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageId,
        updatedAt: new Date(),
      },
    });

    return this.mapPrismaToConversation(conversation);
  }

  /**
   * Map Prisma conversation to ConversationData interface
   */
  private static mapPrismaToConversation(prismaConversation: {
    id: string;
    jobId: string;
    candidateId: string;
    participants: string[];
    lastMessageId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ConversationData {
    return {
      id: prismaConversation.id,
      jobId: prismaConversation.jobId,
      candidateId: prismaConversation.candidateId,
      participants: prismaConversation.participants,
      lastMessageId: prismaConversation.lastMessageId || undefined,
      createdAt: prismaConversation.createdAt,
      updatedAt: prismaConversation.updatedAt,
    };
  }
}










