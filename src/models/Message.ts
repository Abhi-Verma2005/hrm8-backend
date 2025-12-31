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
        conversation_id: messageData.conversationId,
        sender_email: messageData.senderEmail,
        sender_type: messageData.senderType as any,
        sender_id: messageData.senderId || '',
        content: messageData.content,
        content_type: (messageData.type || 'TEXT') as any,
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
        conversation_id: conversationId,
      },
      orderBy: {
        created_at: 'asc',
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
        read_at: new Date(),
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
        conversation_id: conversationId,
        sender_email: {
          not: senderEmail,
        },
      },
    });

    // Filter messages where senderEmail is not in read_by array
    const messages = allMessages.filter(msg => {
      const read_by = Array.isArray(msg.read_by) ? msg.read_by : [];
      return !read_by.includes(senderEmail);
    });

    // Update each message to add sender to read_by array
    const updatePromises = messages.map(async (msg) => {
      const currentReadBy = Array.isArray(msg.read_by) ? msg.read_by : [];
      const updatedReadBy = [...currentReadBy, senderEmail];
      
      return prisma.message.update({
        where: { id: msg.id },
        data: {
          read_by: updatedReadBy,
          read_at: new Date(),
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
      conversationId: prismaMessage.conversation_id || '',
      senderEmail: prismaMessage.sender_email || '',
      senderType: (prismaMessage.sender_type) as MessageSenderType,
      senderId: prismaMessage.sender_id || undefined,
      content: prismaMessage.content,
      type: (prismaMessage.content_type || 'TEXT') as MessageType,
      isRead,
      readAt: prismaMessage.read_at ? new Date(prismaMessage.read_at) : undefined,
      createdAt: prismaMessage.created_at ? new Date(prismaMessage.created_at) : new Date(),
      updatedAt: prismaMessage.updated_at ? new Date(prismaMessage.updated_at) : new Date(),
    };
  }
}












