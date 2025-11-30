/**
 * Conversation Routes
 * Handles HTTP endpoints for conversations and messages
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  getConversations,
  getConversation,
  getMessages,
} from '../controllers/conversation/ConversationController';
import { authenticate } from '../middleware/auth';
import { authenticateCandidate } from '../middleware/candidateAuth';
import { AuthenticatedRequest } from '../types';
import { CandidateAuthenticatedRequest } from '../middleware/candidateAuth';

const router = Router();

// Middleware to handle both user and candidate authentication
// Simply checks which cookie exists and calls the appropriate middleware
const authenticateUserOrCandidate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userSessionId = req.cookies?.sessionId;
  const candidateSessionId = req.cookies?.candidateSessionId;

  // Prefer user authentication if both exist
  if (userSessionId) {
    await authenticate(req as AuthenticatedRequest, res, next);
  } else if (candidateSessionId) {
    await authenticateCandidate(
      req as CandidateAuthenticatedRequest,
      res,
      next
    );
  } else {
    res.status(401).json({
      success: false,
      error: 'Not authenticated. Please login.',
    });
  }
};

// Get all conversations (supports both users and candidates)
router.get('/', authenticateUserOrCandidate, getConversations);

// Get a specific conversation (supports both users and candidates)
router.get('/:id', authenticateUserOrCandidate, getConversation);

// Get messages for a conversation (supports both users and candidates)
router.get('/:id/messages', authenticateUserOrCandidate, getMessages);

export default router;

