import { Prisma, ParticipantType, MessageContentType, ConversationStatus } from '@prisma/client';

/**
 * Messaging/Conversation service using Prisma
 * NOTE: Keep operations additive and membership-safe. Attachments are accepted as metadata (fileUrl, etc.).
 */
export class ConversationService {
  /**
   * Fetch a conversation with participants (for access control).
   */
  static async getConversation(conversationId: string) {
    const { prisma } = await import('../../lib/prisma');
    return prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
        job: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * List conversations for a participant (by participantId).
   * By default, only shows ACTIVE conversations, but can include archived/closed.
   */
  static async listConversationsForParticipant(
    participantId: string,
    includeArchived = false
  ) {
    const { prisma } = await import('../../lib/prisma');
    return prisma.conversation.findMany({
      where: {
        participants: {
          some: { participantId },
        },
        ...(includeArchived ? {} : { status: ConversationStatus.ACTIVE }),
      },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        job: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: [
        { lastMessageAt: 'desc' },
        { createdAt: 'desc' }, // Fallback ordering for conversations without messages
      ],
    });
  }

  /**
   * Create a conversation with participants.
   */
  static async createConversation(params: {
    subject?: string;
    jobId?: string;
    candidateId?: string;
    employerUserId?: string;
    consultantId?: string;
    channelType: Prisma.ConversationCreateInput['channelType'];
    participants: Array<{
      participantType: ParticipantType;
      participantId: string;
      participantEmail: string;
      displayName?: string;
    }>;
  }) {
    const { prisma } = await import('../../lib/prisma');
    return prisma.conversation.create({
      data: {
        subject: params.subject,
        jobId: params.jobId,
        candidateId: params.candidateId,
        employerUserId: params.employerUserId,
        consultantId: params.consultantId,
        channelType: params.channelType,
        participants: {
          create: params.participants.map((p) => ({
            participantType: p.participantType,
            participantId: p.participantId,
            participantEmail: p.participantEmail,
            displayName: p.displayName,
          })),
        },
      },
      include: { participants: true },
    });
  }

  /**
   * Fetch messages for a conversation (paginated).
   */
  static async listMessages(conversationId: string, limit = 50, cursor?: string) {
    const { prisma } = await import('../../lib/prisma');
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
      include: { attachments: true },
    });
  }

  /**
   * Find conversation by jobId and candidateId.
   */
  static async findConversationByJobAndCandidate(jobId: string, candidateId: string) {
    const { prisma } = await import('../../lib/prisma');
    return prisma.conversation.findFirst({
      where: {
        jobId,
        candidateId,
      },
      include: { participants: true },
    });
  }

  /**
   * Archive a conversation (when application is withdrawn).
   */
  static async archiveConversation(conversationId: string, reason: string) {
    const { prisma } = await import('../../lib/prisma');
    
    // Update conversation status
    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: ConversationStatus.ARCHIVED },
      include: { participants: true },
    });

    // Add system message about archiving
    try {
      await this.createMessage({
        conversationId,
        senderType: ParticipantType.SYSTEM,
        senderId: 'system',
        senderEmail: 'system@hrm8.com',
        content: reason,
      });
    } catch (error) {
      console.error('Failed to add archive message:', error);
      // Continue even if message creation fails
    }

    return conversation;
  }

  /**
   * Close a conversation (when application is deleted).
   */
  static async closeConversation(conversationId: string, reason: string) {
    const { prisma } = await import('../../lib/prisma');
    
    // Update conversation status
    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: ConversationStatus.CLOSED },
      include: { participants: true },
    });

    // Add system message about closing
    try {
      await this.createMessage({
        conversationId,
        senderType: ParticipantType.SYSTEM,
        senderId: 'system',
        senderEmail: 'system@hrm8.com',
        content: reason,
      });
    } catch (error) {
      console.error('Failed to add close message:', error);
      // Continue even if message creation fails
    }

    return conversation;
  }

  /**
   * Create a message and update conversation last message fields.
   * Throws error if conversation is not ACTIVE.
   */
  static async createMessage(params: {
    conversationId: string;
    senderType: ParticipantType;
    senderId: string;
    senderEmail: string;
    content: string;
    contentType?: MessageContentType;
    inReplyToMessageId?: string;
    attachments?: Array<{
      fileName: string;
      fileUrl: string;
      mimeType: string;
      size: number;
    }>;
  }) {
    const { prisma } = await import('../../lib/prisma');
    
    // Check conversation status (allow system messages even in archived/closed conversations)
    if (params.senderType !== ParticipantType.SYSTEM) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: params.conversationId },
        select: { status: true },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (conversation.status !== ConversationStatus.ACTIVE) {
        throw new Error(`Cannot send messages in ${conversation.status.toLowerCase()} conversations`);
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId: params.conversationId,
        senderType: params.senderType,
        senderId: params.senderId,
        senderEmail: params.senderEmail,
        content: params.content,
        contentType: params.contentType || MessageContentType.TEXT,
        inReplyToMessageId: params.inReplyToMessageId,
        attachments: params.attachments
          ? {
              create: params.attachments.map((a) => ({
                fileName: a.fileName,
                fileUrl: a.fileUrl,
                mimeType: a.mimeType,
                size: a.size,
              })),
            }
          : undefined,
      },
      include: { attachments: true },
    });

    await prisma.conversation.update({
      where: { id: params.conversationId },
      data: {
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
      },
    });

    return message;
  }

  /**
   * Mark messages as read for a participant; returns count updated.
   */
  static async markMessagesAsRead(conversationId: string, participantId: string) {
    const { prisma } = await import('../../lib/prisma');
    const unread = await prisma.message.findMany({
      where: {
        conversationId,
        NOT: { readBy: { has: participantId } },
      },
      select: { id: true, readBy: true },
    });

    let updated = 0;
    for (const msg of unread) {
      const newReadBy = Array.from(new Set([...(msg.readBy || []), participantId]));
      await prisma.message.update({
        where: { id: msg.id },
        data: {
          readBy: newReadBy,
          readAt: new Date(),
        },
      });
      updated += 1;
    }
    return updated;
  }

  /**
   * Unread count for participant.
   */
  static async getUnreadCount(participantId: string) {
    const { prisma } = await import('../../lib/prisma');
    return prisma.message.count({
      where: {
        conversation: {
          participants: { some: { participantId } },
        },
        NOT: { readBy: { has: participantId } },
      },
    });
  }
}

