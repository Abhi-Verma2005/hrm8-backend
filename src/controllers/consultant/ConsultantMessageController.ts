import { Request, Response } from 'express';
import { ConsultantAuthenticatedRequest } from '../../middleware/consultantAuth';
import { ConversationService } from '../../services/messaging/ConversationService';
import { ParticipantType, ConversationChannelType, ConversationStatus } from '@prisma/client';

export class ConsultantMessageController {
    /**
     * List conversations for the authenticated consultant.
     * Only returns ACTIVE conversations by default.
     */
    static async listConversations(req: Request, res: Response) {
        try {
            const consultantId = (req as ConsultantAuthenticatedRequest).consultant?.id;
            if (!consultantId) {
                return res.status(401).json({ success: false, error: 'Not authenticated' });
            }

            console.log(`Fetching conversations for consultant ${consultantId}`);
            const conversations = await ConversationService.listConversationsForParticipant(consultantId);

            return res.json({ success: true, data: conversations });
        } catch (error) {
            console.error('Error listing conversations:', error);
            return res.status(500).json({ success: false, error: 'Failed to list conversations' });
        }
    }

    /**
     * Get messages for a specific conversation.
     */
    static async getMessages(req: Request, res: Response) {
        try {
            const consultantId = (req as ConsultantAuthenticatedRequest).consultant?.id;
            if (!consultantId) {
                return res.status(401).json({ success: false, error: 'Not authenticated' });
            }

            const { conversationId } = req.params;
            const { limit = '50', cursor } = req.query;

            const conversation = await ConversationService.getConversation(conversationId);
            if (!conversation) {
                return res.status(404).json({ success: false, error: 'Conversation not found' });
            }

            // Security Check: Is this consultant a participant?
            const isParticipant = conversation.participants.some(
                (p) => p.participant_id === consultantId
            );
            if (!isParticipant) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            const messages = await ConversationService.listMessages(conversationId, parseInt(limit as string, 10), cursor as string | undefined);
            return res.json({ success: true, data: messages });
        } catch (error) {
            console.error('Error listing messages:', error);
            return res.status(500).json({ success: false, error: 'Failed to list messages' });
        }
    }

    /**
     * Send a message as a consultant.
     */
    static async sendMessage(req: Request, res: Response) {
        try {
            const consultant = (req as ConsultantAuthenticatedRequest).consultant;
            if (!consultant) {
                return res.status(401).json({ success: false, error: 'Not authenticated' });
            }

            const { conversationId } = req.params;
            const { content, contentType, attachments } = req.body;

            if (!content || !content.toString().trim()) {
                return res.status(400).json({ success: false, error: 'Content is required' });
            }

            // Security Check
            const conversation = await ConversationService.getConversation(conversationId);
            if (!conversation) {
                return res.status(404).json({ success: false, error: 'Conversation not found' });
            }

            const isParticipant = conversation.participants.some(
                (p) => p.participant_id === consultant.id
            );
            if (!isParticipant) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            if (conversation.status !== ConversationStatus.ACTIVE) {
                return res.status(403).json({ success: false, error: 'Conversation is not active' });
            }

            const message = await ConversationService.createMessage({
                conversationId,
                senderType: ParticipantType.CONSULTANT,
                senderId: consultant.id,
                senderEmail: consultant.email,
                content: content.toString(),
                contentType,
                attachments
            });

            return res.status(201).json({ success: true, data: message });

        } catch (error) {
            console.error('Error sending message:', error);
            return res.status(500).json({ success: false, error: 'Failed to send message' });
        }
    }

    /**
     * Mark messages in a conversation as read.
     */
    static async markRead(req: Request, res: Response) {
        try {
            const consultantId = (req as ConsultantAuthenticatedRequest).consultant?.id;
            if (!consultantId) {
                return res.status(401).json({ success: false, error: 'Not authenticated' });
            }

            const { conversationId } = req.params;

            // Security Check
            const conversation = await ConversationService.getConversation(conversationId);
            if (!conversation) {
                return res.status(404).json({ success: false, error: 'Conversation not found' });
            }
            const isParticipant = conversation.participants.some(
                (p) => p.participant_id === consultantId
            );
            if (!isParticipant) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            const updatedCount = await ConversationService.markMessagesAsRead(conversationId, consultantId);

            return res.json({ success: true, data: { updated: updatedCount } });
        } catch (error) {
            console.error('Error marking read:', error);
            return res.status(500).json({ success: false, error: 'Failed to mark read' });
        }
    }
}
