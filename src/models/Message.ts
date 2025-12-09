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
    const { randomUUID } = await import('crypto');
    const message = await prisma.message.create({
      data: {
        id: randomUUID(),
        conversationId: messageData.conversationId,
        senderEmail: messageData.senderEmail,
        senderType: messageData.senderType as any,
        senderId: messageData.senderId || '',
        content: messageData.content,
        contentType: (messageData.type || 'TEXT') as any,
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
        conversationId: conversationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return messages.map((msg: any) => this.mapPrismaToMessage(msg));
  }

  /**
   * Mark a message as read
   */
  static async markAsRead(messageId: string): Promise<MessageData> {
    const message = await prisma.message.update({
      where: { id: messageId },
      data: {
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
    // Get messages that haven't been read by this sender
    const allMessages = await prisma.message.findMany({
      where: {
        conversationId: conversationId,
        senderEmail: {
          not: senderEmail,
        },
      },
    });

    // Filter messages where senderEmail is not in readBy array
    const messages = allMessages.filter(msg => {
      const readBy = Array.isArray(msg.readBy) ? msg.readBy : [];
      return !readBy.includes(senderEmail);
    });

    // Update each message to add sender to readBy array
    const updatePromises = messages.map(async (msg) => {
      const currentReadBy = Array.isArray(msg.readBy) ? msg.readBy : [];
      const updatedReadBy = [...currentReadBy, senderEmail];
      
      return prisma.message.update({
        where: { id: msg.id },
        data: {
          readBy: updatedReadBy,
          readAt: new Date(),
        },
      });
    });

    await Promise.all(updatePromises);
    
    return messages.length;
  }

  /**
   * Map Prisma message to MessageData interface
   */
  private static mapPrismaToMessage(prismaMessage: any): MessageData {
    // Check if message is read (has read_by array with at least one entry)
    const isRead = prismaMessage.read_by && Array.isArray(prismaMessage.read_by) && prismaMessage.read_by.length > 0;
    
    return {
      id: prismaMessage.id,
      conversationId: prismaMessage.conversation_id || prismaMessage.conversationId,
      senderEmail: prismaMessage.sender_email || prismaMessage.senderEmail,
      senderType: (prismaMessage.sender_type || prismaMessage.senderType) as MessageSenderType,
      senderId: prismaMessage.sender_id || prismaMessage.senderId || undefined,
      content: prismaMessage.content,
      type: (prismaMessage.content_type || prismaMessage.type || 'TEXT') as MessageType,
      isRead,
      readAt: prismaMessage.read_at ? new Date(prismaMessage.read_at) : (prismaMessage.readAt ? new Date(prismaMessage.readAt) : undefined),
      createdAt: prismaMessage.created_at ? new Date(prismaMessage.created_at) : new Date(prismaMessage.createdAt),
      updatedAt: prismaMessage.updated_at ? new Date(prismaMessage.updated_at) : new Date(prismaMessage.updatedAt),
    };
  }
}












