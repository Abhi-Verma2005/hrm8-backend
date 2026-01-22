/**
 * Employer Messages Routes
 * Routes for HR/employer messaging
 */

import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/auth';
import { EmployerMessageController } from '../controllers/messaging/EmployerMessageController';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

// List all conversations for employer
router.get('/conversations', EmployerMessageController.listConversations);

// Get specific conversation
router.get('/conversations/:id', EmployerMessageController.getConversation);

// Get messages for a conversation
router.get('/conversations/:id/messages', EmployerMessageController.getMessages);

// Send message
router.post('/conversations/:id/messages', EmployerMessageController.sendMessage);

// Mark conversation as read
router.put('/conversations/:id/read', EmployerMessageController.markRead);

export default router;
