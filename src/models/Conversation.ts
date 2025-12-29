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
    const { randomUUID } = await import('crypto');
    const conversation = await prisma.conversation.create({
      data: {
        id: randomUUID(),
        job_id: conversationData.jobId,
        candidate_id: conversationData.candidateId,
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
      include: {
        participants: true,
      },
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
    const conversation = await prisma.conversation.findFirst({
      where: {
        job_id: jobId,
        candidate_id: candidateId,
      },
      include: {
        participants: true,
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
          some: {
            participant_email: email,
          },
        },
      },
      include: {
        participants: true,
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    return conversations.map((conv: any) => this.mapPrismaToConversation(conv));
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
        last_message_id: lastMessageId,
        last_message_at: new Date(),
      },
      include: {
        participants: true,
      },
    });

    return this.mapPrismaToConversation(conversation);
  }

  /**
   * Map Prisma conversation to ConversationData interface
   */
  private static mapPrismaToConversation(prismaConversation: any): ConversationData {
    // Fetch participants from ConversationParticipant relation
    const participants: string[] = [];
    if (prismaConversation.participants) {
      participants.push(...prismaConversation.participants.map((p: any) => p.participant_email));
    }
    
    return {
      id: prismaConversation.id,
      jobId: prismaConversation.job_id || '',
      candidateId: prismaConversation.candidate_id || '',
      participants,
      lastMessageId: prismaConversation.last_message_id || undefined,
      createdAt: prismaConversation.created_at,
      updatedAt: prismaConversation.updated_at,
    };
  }
}










