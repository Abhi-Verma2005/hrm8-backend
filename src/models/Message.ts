/**
 * Message Model
 * Represents a message in a conversation
 */

import prisma from '../lib/prisma';

export type MessageSenderType = 'USER' | 'CANDIDATE' | 'SYSTEM';
export type MessageType = 'TEXT' | 'SYSTEM' | 'APPLICATION_SUBMITTED';

export interface MessageData {
  id: string;
  conversationId: string;
  senderEmail: string;
  senderType: MessageSenderType;
  senderId?: string;
  content: string;
  type: MessageType;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class MessageModel {
  /**
   * Create a new message
   */
  static async create(messageData: {
    conversationId: string;
    senderEmail: string;
    senderType: MessageSenderType;
    senderId?: string;
    content: string;
    type?: MessageType;
  }): Promise<MessageData> {
    const message = await prisma.message.create({
      data: {
        conversationId: messageData.conversationId,
        senderEmail: messageData.senderEmail,
        senderType: messageData.senderType,
        senderId: messageData.senderId,
        content: messageData.content,
        type: messageData.type || 'TEXT',
      },
    });

    return this.mapPrismaToMessage(message);
  }

  /**
   * Find all messages for a conversation
   */
  static async findByConversationId(
    conversationId: string
  ): Promise<MessageData[]> {
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return messages.map((msg) => this.mapPrismaToMessage(msg));
  }

  /**
   * Mark a message as read
   */
  static async markAsRead(messageId: string): Promise<MessageData> {
    const message = await prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return this.mapPrismaToMessage(message);
  }

  /**
   * Mark multiple messages as read
   */
  static async markMultipleAsRead(
    conversationId: string,
    senderEmail: string
  ): Promise<number> {
    const result = await prisma.message.updateMany({
      where: {
        conversationId,
        senderEmail: {
          not: senderEmail,
        },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Map Prisma message to MessageData interface
   */
  private static mapPrismaToMessage(prismaMessage: {
    id: string;
    conversationId: string;
    senderEmail: string;
    senderType: MessageSenderType;
    senderId: string | null;
    content: string;
    type: MessageType;
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): MessageData {
    return {
      id: prismaMessage.id,
      conversationId: prismaMessage.conversationId,
      senderEmail: prismaMessage.senderEmail,
      senderType: prismaMessage.senderType,
      senderId: prismaMessage.senderId || undefined,
      content: prismaMessage.content,
      type: prismaMessage.type,
      isRead: prismaMessage.isRead,
      readAt: prismaMessage.readAt || undefined,
      createdAt: prismaMessage.createdAt,
      updatedAt: prismaMessage.updatedAt,
    };
  }
}











