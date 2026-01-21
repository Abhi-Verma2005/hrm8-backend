/**
 * Employer Message Controller
 * Handles messaging endpoints for employers/HR
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { ConversationService } from '../../services/messaging/ConversationService';
import { ParticipantType } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export class EmployerMessageController {
    /**
     * List conversations for the authenticated employer/HR user
     * These are conversations where the user is a participant as EMPLOYER type
     */
    static async listConversations(req: Request, res: Response) {
        try {
            const user = (req as AuthenticatedRequest).user;
            if (!user) {
                return res.status(401).json({ success: false, error: 'Not authenticated' });
            }

            // Find all conversations where this user is a participant as EMPLOYER
            const conversations = await prisma.conversation.findMany({
                where: {
                    OR: [
                        { employer_user_id: user.id },
                        {
                            participants: {
                                some: {
                                    participant_id: user.id,
                                    participant_type: ParticipantType.EMPLOYER,
                                },
                            },
                        },
                    ],
                },
                include: {
                    participants: true,
                    job: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
                orderBy: { updated_at: 'desc' },
            });

            // Fetch candidate info and last message for each conversation
            const transformedConversations = await Promise.all(
                conversations.map(async (conv) => {
                    // Get candidate info if candidate_id exists
                    let candidateInfo = null;
                    if (conv.candidate_id) {
                        const candidate = await prisma.candidate.findUnique({
                            where: { id: conv.candidate_id },
                            select: { id: true, first_name: true, last_name: true, email: true },
                        });
                        if (candidate) {
                            candidateInfo = {
                                id: candidate.id,
                                name: `${candidate.first_name} ${candidate.last_name}`.trim(),
                                email: candidate.email,
                            };
                        }
                    }

                    // Get last message
                    const lastMessage = await prisma.message.findFirst({
                        where: { conversation_id: conv.id },
                        orderBy: { created_at: 'desc' },
                    });

                    return {
                        id: conv.id,
                        jobId: conv.job_id,
                        candidateId: conv.candidate_id,
                        employerUserId: conv.employer_user_id,
                        consultantId: conv.consultant_id,
                        channelType: conv.channel_type,
                        status: conv.status,
                        createdAt: conv.created_at.toISOString(),
                        updatedAt: conv.updated_at.toISOString(),
                        participants: conv.participants.map(p => ({
                            id: p.id,
                            participantType: p.participant_type,
                            participantId: p.participant_id,
                            participantEmail: p.participant_email,
                            displayName: p.display_name,
                        })),
                        job: conv.job ? { id: conv.job.id, title: conv.job.title } : null,
                        candidate: candidateInfo,
                        lastMessage: lastMessage ? {
                            id: lastMessage.id,
                            content: lastMessage.content,
                            senderType: lastMessage.sender_type,
                            createdAt: lastMessage.created_at.toISOString(),
                        } : null,
                    };
                })
            );

            return res.json({ success: true, data: transformedConversations });
        } catch (error) {
            console.error('Error listing employer conversations:', error);
            return res.status(500).json({ success: false, error: 'Failed to list conversations' });
        }
    }

    /**
     * Get conversation details with messages
     */
    static async getConversation(req: Request, res: Response) {
        try {
            const user = (req as AuthenticatedRequest).user;
            if (!user) {
                return res.status(401).json({ success: false, error: 'Not authenticated' });
            }

            const { id } = req.params;
            const conversation = await ConversationService.getConversation(id);

            if (!conversation) {
                return res.status(404).json({ success: false, error: 'Conversation not found' });
            }

            // Check access
            const isParticipant = conversation.employer_user_id === user.id ||
                conversation.participants.some(p => p.participant_id === user.id);

            if (!isParticipant) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            // Fetch candidate info
            let candidateInfo = null;
            if (conversation.candidate_id) {
                const candidate = await prisma.candidate.findUnique({
                    where: { id: conversation.candidate_id },
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone: true,
                    },
                });
                if (candidate) {
                    candidateInfo = {
                        id: candidate.id,
                        firstName: candidate.first_name,
                        lastName: candidate.last_name,
                        name: `${candidate.first_name} ${candidate.last_name}`.trim(),
                        email: candidate.email,
                        phone: candidate.phone,
                    };
                }
            }

            // Fetch job info
            let jobInfo = null;
            if (conversation.job_id) {
                const job = await prisma.job.findUnique({
                    where: { id: conversation.job_id },
                    select: {
                        id: true,
                        title: true,
                    },
                });
                if (job) {
                    jobInfo = {
                        id: job.id,
                        title: job.title,
                    };
                }
            }

            // Transform response to include candidate and job info
            const transformedConversation = {
                id: conversation.id,
                jobId: conversation.job_id,
                candidateId: conversation.candidate_id,
                employerUserId: conversation.employer_user_id,
                consultantId: conversation.consultant_id,
                channelType: conversation.channel_type,
                status: conversation.status,
                createdAt: conversation.created_at?.toISOString?.() || conversation.created_at,
                updatedAt: conversation.updated_at?.toISOString?.() || conversation.updated_at,
                participants: conversation.participants.map((p: any) => ({
                    id: p.id,
                    participantType: p.participant_type,
                    participantId: p.participant_id,
                    participantEmail: p.participant_email,
                    displayName: p.display_name,
                })),
                candidate: candidateInfo,
                job: jobInfo,
            };

            return res.json({ success: true, data: transformedConversation });
        } catch (error) {
            console.error('Error fetching conversation:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch conversation' });
        }
    }

    /**
     * Get messages for a conversation
     */
    static async getMessages(req: Request, res: Response) {
        try {
            const user = (req as AuthenticatedRequest).user;
            if (!user) {
                return res.status(401).json({ success: false, error: 'Not authenticated' });
            }

            const { id } = req.params;
            const { limit = '50', cursor } = req.query;

            const conversation = await ConversationService.getConversation(id);
            if (!conversation) {
                return res.status(404).json({ success: false, error: 'Conversation not found' });
            }

            // Check access
            const isParticipant = conversation.employer_user_id === user.id ||
                conversation.participants.some(p => p.participant_id === user.id);

            if (!isParticipant) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            const messages = await ConversationService.listMessages(id, parseInt(limit as string, 10), cursor as string | undefined);
            return res.json({ success: true, data: messages });
        } catch (error) {
            console.error('Error fetching messages:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch messages' });
        }
    }

    /**
     * Send message in a conversation (HR/Employer - no restrictions)
     */
    static async sendMessage(req: Request, res: Response) {
        try {
            const user = (req as AuthenticatedRequest).user;
            if (!user) {
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

            // Check access
            const isParticipant = conversation.employer_user_id === user.id ||
                conversation.participants.some(p => p.participant_id === user.id);

            if (!isParticipant) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            // Check conversation status
            if (conversation.status !== 'ACTIVE') {
                return res.status(403).json({
                    success: false,
                    error: `Cannot send messages in ${conversation.status.toLowerCase()} conversations`,
                });
            }

            // Create message (no reply restrictions for employers)
            const message = await ConversationService.createMessage({
                conversationId,
                senderType: ParticipantType.EMPLOYER,
                senderId: user.id,
                senderEmail: user.email,
                content: content.toString(),
                contentType,
                attachments,
            });

            return res.status(201).json({ success: true, data: message });
        } catch (error) {
            console.error('Error sending message:', error);
            return res.status(500).json({ success: false, error: 'Failed to send message' });
        }
    }

    /**
     * Mark messages as read
     */
    static async markRead(req: Request, res: Response) {
        try {
            const user = (req as AuthenticatedRequest).user;
            if (!user) {
                return res.status(401).json({ success: false, error: 'Not authenticated' });
            }

            const { id: conversationId } = req.params;
            const conversation = await ConversationService.getConversation(conversationId);

            if (!conversation) {
                return res.status(404).json({ success: false, error: 'Conversation not found' });
            }

            // Check access
            const isParticipant = conversation.employer_user_id === user.id ||
                conversation.participants.some(p => p.participant_id === user.id);

            if (!isParticipant) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            const updated = await ConversationService.markMessagesAsRead(conversationId, user.id);
            return res.json({ success: true, data: { updated } });
        } catch (error) {
            console.error('Error marking messages as read:', error);
            return res.status(500).json({ success: false, error: 'Failed to mark as read' });
        }
    }
}
