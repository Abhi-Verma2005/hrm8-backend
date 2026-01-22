import { ParticipantType, MessageContentType, ConversationStatus, ConversationChannelType } from '@prisma/client';

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
          some: { participant_id: participantId },
        },
        ...(includeArchived ? {} : { status: ConversationStatus.ACTIVE }),
      },
      include: {
        participants: true,
        messages: {
          orderBy: { created_at: 'desc' },
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
        { last_message_at: 'desc' },
        { created_at: 'desc' }, // Fallback ordering for conversations without messages
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
    channelType: ConversationChannelType;
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
        job_id: params.jobId,
        candidate_id: params.candidateId,
        employer_user_id: params.employerUserId,
        consultant_id: params.consultantId,
        channel_type: params.channelType,
        participants: {
          create: params.participants.map((p) => ({
            participant_type: p.participantType,
            participant_id: p.participantId,
            participant_email: p.participantEmail,
            display_name: p.displayName,
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
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'desc' },
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
        job_id: jobId,
        candidate_id: candidateId,
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
        conversation_id: params.conversationId,
        sender_type: params.senderType,
        sender_id: params.senderId,
        sender_email: params.senderEmail,
        content: params.content,
        content_type: params.contentType || MessageContentType.TEXT,
        in_reply_to_message_id: params.inReplyToMessageId,
        attachments: params.attachments
          ? {
            create: params.attachments.map((a) => ({
              file_name: a.fileName,
              file_url: a.fileUrl,
              mime_type: a.mimeType,
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
        last_message_id: message.id,
        last_message_at: message.created_at,
      },
    });

    // Notify other participants
    try {
      const fullConversation = await prisma.conversation.findUnique({
        where: { id: params.conversationId },
        include: { participants: true }
      });

      if (fullConversation) {
        await this.notifyMessageParticipants(message, fullConversation, params.senderId);
      }
    } catch (error) {
      console.error('Failed to notify message participants:', error);
      // Continue without failing the request
    }

    return message;
  }

  /**
   * Mark messages as read for a participant; returns count updated.
   */
  static async markMessagesAsRead(conversationId: string, participantId: string) {
    const { prisma } = await import('../../lib/prisma');
    const unread = await prisma.message.findMany({
      where: {
        conversation_id: conversationId,
        NOT: { read_by: { has: participantId } },
      },
      select: { id: true, read_by: true },
    });

    let updated = 0;
    for (const msg of unread) {
      const newReadBy = Array.from(new Set([...((msg as any).read_by || []), participantId]));
      await prisma.message.update({
        where: { id: msg.id },
        data: {
          read_by: newReadBy,
          read_at: new Date(),
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
          participants: { some: { participant_id: participantId } },
        },
        NOT: { read_by: { has: participantId } },
      },
    });
  }

  /**
   * Notify other participants about a new message
   */
  static async notifyMessageParticipants(
    message: any,
    conversation: any,
    senderId: string
  ) {
    const { UniversalNotificationService } = await import('../notification/UniversalNotificationService');
    const { UniversalNotificationType } = await import('@prisma/client');

    const recipients = conversation.participants.filter(
      (p: any) => p.participant_id !== senderId
    );

    for (const recipient of recipients) {
      let recipientType;
      // Map ParticipantType to NotificationRecipientType
      switch (recipient.participant_type) {
        case 'CANDIDATE':
          recipientType = 'CANDIDATE';
          break;
        case 'CONSULTANT':
          recipientType = 'CONSULTANT';
          break;
        case 'EMPLOYER': // Handles both USER and HRM8
          recipientType = 'USER';
          break;
        default:
          continue; // Skip system or unknown
      }

      // Sender display name
      const sender = conversation.participants.find((p: any) => p.participant_id === senderId);
      const senderName = sender?.display_name || 'Someone';

      await UniversalNotificationService.createNotification({
        recipientType: recipientType as any,
        recipientId: recipient.participant_id,
        type: 'NEW_MESSAGE' as any, // Cast as any until types are fully regenerated and picked up
        title: `New message from ${senderName}`,
        message: message.content_type === 'FILE' ? 'Sent an attachment' : message.content,
        // The frontend expects actionUrl to navigate
        actionUrl: recipientType === 'CONSULTANT'
          ? `/consultant/messages/${conversation.id}`
          : recipientType === 'CANDIDATE'
            ? `/candidate/messages/${conversation.id}`
            : `/messages/${conversation.id}`,
        data: {
          conversationId: conversation.id,
          messageId: message.id,
          senderName,
        }
      });
    }
  }
}
