import { Request, Response } from 'express';
import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';
import { ConversationService } from '../../services/messaging/ConversationService';
import { ParticipantType, ConversationChannelType } from '@prisma/client';

export class CandidateMessageController {
  /**
   * List conversations for the authenticated candidate.
   */
  static async listConversations(req: Request, res: Response) {
    try {
      const candidateId = (req as CandidateAuthenticatedRequest).candidate?.id;
      if (!candidateId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const conversations = await ConversationService.listConversationsForParticipant(candidateId);
      return res.json({ success: true, data: conversations });
    } catch (error) {
      console.error('Error listing conversations:', error);
      return res.status(500).json({ success: false, error: 'Failed to list conversations' });
    }
  }

  /**
   * Get conversation messages (paginated, newest first).
   */
  static async getConversationMessages(req: Request, res: Response) {
    try {
      const candidateId = (req as CandidateAuthenticatedRequest).candidate?.id;
      if (!candidateId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { id } = req.params;
      const { limit = '50', cursor } = req.query;
      const conversation = await ConversationService.getConversation(id);

      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      const isParticipant = conversation.participants.some(
        (p) => p.participantId === candidateId
      );
      if (!isParticipant) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const messages = await ConversationService.listMessages(id, parseInt(limit as string, 10), cursor as string | undefined);
      return res.json({ success: true, data: messages });
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch messages' });
    }
  }

  /**
   * Create a new conversation (candidate-initiated).
   */
  static async createConversation(req: Request, res: Response) {
    try {
      const candidate = (req as CandidateAuthenticatedRequest).candidate;
      if (!candidate) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { subject, jobId, employerUserId, consultantId } = req.body;

      const participants = [
        {
          participantType: ParticipantType.CANDIDATE,
          participantId: candidate.id,
          participantEmail: candidate.email,
          displayName: `${candidate.firstName} ${candidate.lastName}`.trim(),
        },
      ];

      if (employerUserId) {
        const { prisma } = await import('../../lib/prisma');
        const employer = await prisma.user.findUnique({ where: { id: employerUserId } });
        if (employer) {
          participants.push({
            participantType: ParticipantType.EMPLOYER,
            participantId: employer.id,
            participantEmail: employer.email,
            displayName: employer.name,
          });
        }
      }

      if (consultantId) {
        const { prisma } = await import('../../lib/prisma');
        const consultant = await prisma.consultant.findUnique({ where: { id: consultantId } });
        if (consultant) {
          participants.push({
            participantType: ParticipantType.CONSULTANT,
            participantId: consultant.id,
            participantEmail: consultant.email,
            displayName: `${consultant.firstName} ${consultant.lastName}`.trim(),
          });
        }
      }

      const conversation = await ConversationService.createConversation({
        subject,
        jobId,
        candidateId: candidate.id,
        employerUserId,
        consultantId,
        channelType: consultantId ? ConversationChannelType.CANDIDATE_CONSULTANT : ConversationChannelType.CANDIDATE_EMPLOYER,
        participants,
      });

      return res.status(201).json({ success: true, data: conversation });
    } catch (error) {
      console.error('Error creating conversation:', error);
      return res.status(500).json({ success: false, error: 'Failed to create conversation' });
    }
  }

  /**
   * Send a message in a conversation.
   */
  static async sendMessage(req: Request, res: Response) {
    try {
      const candidate = (req as CandidateAuthenticatedRequest).candidate;
      if (!candidate) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { id: conversationId } = req.params;
      const { content, contentType, attachments } = req.body;

      if (!content || !content.toString().trim()) {
        return res.status(400).json({ success: false, error: 'Content is required' });
      }

      const conversation = await ConversationService.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      const isParticipant = conversation.participants.some(
        (p) => p.participantId === candidate.id
      );
      if (!isParticipant) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      // Check conversation status before allowing message
      const { ConversationStatus } = await import('@prisma/client');
      if (conversation.status !== ConversationStatus.ACTIVE) {
        return res.status(403).json({
          success: false,
          error: `Cannot send messages in ${conversation.status.toLowerCase()} conversations`,
        });
      }

      const message = await ConversationService.createMessage({
        conversationId,
        senderType: ParticipantType.CANDIDATE,
        senderId: candidate.id,
        senderEmail: candidate.email,
        content: content.toString(),
        contentType,
        attachments,
      });

      return res.status(201).json({ success: true, data: message });
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      const statusCode = errorMessage.includes('archived') || errorMessage.includes('closed') ? 403 : 500;
      return res.status(statusCode).json({ success: false, error: errorMessage });
    }
  }

  /**
   * Mark messages as read for this candidate in a conversation.
   */
  static async markRead(req: Request, res: Response) {
    try {
      const candidate = (req as CandidateAuthenticatedRequest).candidate;
      if (!candidate) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { id: conversationId } = req.params;
      const conversation = await ConversationService.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }

      const isParticipant = conversation.participants.some(
        (p) => p.participantId === candidate.id
      );
      if (!isParticipant) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const updated = await ConversationService.markMessagesAsRead(conversationId, candidate.id);
      return res.json({ success: true, data: { updated } });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return res.status(500).json({ success: false, error: 'Failed to mark as read' });
    }
  }

  /**
   * Unread count for candidate.
   */
  static async unreadCount(req: Request, res: Response) {
    try {
      const candidate = (req as CandidateAuthenticatedRequest).candidate;
      if (!candidate) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const count = await ConversationService.getUnreadCount(candidate.id);
      return res.json({ success: true, data: { count } });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch unread count' });
    }
  }
}

