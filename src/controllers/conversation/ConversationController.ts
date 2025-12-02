/**
 * Conversation Controller
 * Handles HTTP requests for conversations and messages
 */

import { Response } from 'express';
import { ConversationModel } from '../../models/Conversation';
import { MessageModel } from '../../models/Message';
import { JobModel } from '../../models/Job';
import { CandidateModel } from '../../models/Candidate';
import { AuthenticatedRequest } from '../../types';
import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';
import prisma from '../../lib/prisma';

/**
 * Get all conversations for the authenticated user/candidate
 * GET /api/conversations
 */
export async function getConversations(
  req: AuthenticatedRequest | CandidateAuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    // Determine if this is a user or candidate request
    const isCandidate = 'candidate' in req && req.candidate;
    const email = isCandidate
      ? (req as CandidateAuthenticatedRequest).candidate!.email
      : (req as AuthenticatedRequest).user!.email;

    // Get conversations for this participant
    const conversations = await ConversationModel.findByParticipantEmail(email);

    // Fetch related data (job, candidate, last message) for each conversation
    const conversationsWithData = await Promise.all(
      conversations.map(async (conv) => {
        // Fetch job
        const job = await JobModel.findById(conv.jobId);

        // Fetch candidate
        const candidate = await CandidateModel.findById(conv.candidateId);

        // Fetch last message if exists
        let lastMessage = null;
        if (conv.lastMessageId) {
          const message = await prisma.message.findUnique({
            where: { id: conv.lastMessageId },
          });
          if (message) {
            lastMessage = {
              id: message.id,
              conversationId: message.conversationId,
              senderEmail: message.senderEmail,
              senderType: message.senderType,
              senderId: message.senderId || undefined,
              content: message.content,
              type: message.type,
              isRead: message.isRead,
              readAt: message.readAt?.toISOString() || undefined,
              createdAt: message.createdAt.toISOString(),
              updatedAt: message.updatedAt.toISOString(),
            };
          }
        }

        return {
          id: conv.id,
          jobId: conv.jobId,
          candidateId: conv.candidateId,
          participants: conv.participants,
          lastMessageId: conv.lastMessageId || undefined,
          createdAt: conv.createdAt.toISOString(),
          updatedAt: conv.updatedAt.toISOString(),
          job: job
            ? {
                id: job.id,
                title: job.title,
              }
            : undefined,
          candidate: candidate
            ? {
                id: candidate.id,
                firstName: candidate.firstName,
                lastName: candidate.lastName,
                email: candidate.email,
              }
            : undefined,
          lastMessage: lastMessage || undefined,
        };
      })
    );

    res.json({
      success: true,
      data: {
        conversations: conversationsWithData,
      },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch conversations',
    });
  }
}

/**
 * Get a specific conversation by ID
 * GET /api/conversations/:id
 */
export async function getConversation(
  req: AuthenticatedRequest | CandidateAuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    // Determine if this is a user or candidate request
    const isCandidate = 'candidate' in req && req.candidate;
    const email = isCandidate
      ? (req as CandidateAuthenticatedRequest).candidate!.email
      : (req as AuthenticatedRequest).user!.email;

    // Get conversation
    const conversation = await ConversationModel.findById(id);

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    // Check if user is a participant
    if (!conversation.participants.includes(email)) {
      res.status(403).json({
        success: false,
        error: 'Access denied to this conversation',
      });
      return;
    }

    // Fetch related data
    const job = await JobModel.findById(conversation.jobId);
    const candidate = await CandidateModel.findById(conversation.candidateId);

    // Fetch last message if exists
    let lastMessage = null;
    if (conversation.lastMessageId) {
      const message = await prisma.message.findUnique({
        where: { id: conversation.lastMessageId },
      });
      if (message) {
        lastMessage = {
          id: message.id,
          conversationId: message.conversationId,
          senderEmail: message.senderEmail,
          senderType: message.senderType,
          senderId: message.senderId || undefined,
          content: message.content,
          type: message.type,
          isRead: message.isRead,
          readAt: message.readAt?.toISOString() || undefined,
          createdAt: message.createdAt.toISOString(),
          updatedAt: message.updatedAt.toISOString(),
        };
      }
    }

    res.json({
      success: true,
      data: {
        conversation: {
        id: conversation.id,
        jobId: conversation.jobId,
        candidateId: conversation.candidateId,
        participants: conversation.participants,
        lastMessageId: conversation.lastMessageId || undefined,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        job: job
          ? {
              id: job.id,
              title: job.title,
            }
          : undefined,
        candidate: candidate
          ? {
              id: candidate.id,
              firstName: candidate.firstName,
              lastName: candidate.lastName,
              email: candidate.email,
            }
          : undefined,
        lastMessage: lastMessage || undefined,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch conversation',
    });
  }
}

/**
 * Get messages for a conversation
 * GET /api/conversations/:id/messages
 */
export async function getMessages(
  req: AuthenticatedRequest | CandidateAuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id: conversationId } = req.params;

    // Determine if this is a user or candidate request
    const isCandidate = 'candidate' in req && req.candidate;
    const email = isCandidate
      ? (req as CandidateAuthenticatedRequest).candidate!.email
      : (req as AuthenticatedRequest).user!.email;

    // Get conversation to verify access
    const conversation = await ConversationModel.findById(conversationId);

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    // Check if user is a participant
    if (!conversation.participants.includes(email)) {
      res.status(403).json({
        success: false,
        error: 'Access denied to this conversation',
      });
      return;
    }

    // Get messages
    const messages = await MessageModel.findByConversationId(conversationId);

    // Format messages for frontend
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      senderEmail: msg.senderEmail,
      senderType: msg.senderType,
      senderId: msg.senderId || undefined,
      content: msg.content,
      type: msg.type,
      isRead: msg.isRead,
      readAt: msg.readAt?.toISOString() || undefined,
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt.toISOString(),
      isOwn: msg.senderEmail === email,
    }));

    res.json({
      success: true,
      data: {
        messages: formattedMessages,
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch messages',
    });
  }
}

