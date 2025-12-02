/**
 * Talent Pool Routes (Recruiter-facing)
 */

import { Router, type Router as RouterType } from 'express';
import { TalentPoolController } from '../controllers/talent/TalentPoolController';
import { authenticate } from '../middleware/auth';

const router: RouterType = Router();

// All routes require authentication
router.get('/search', authenticate, TalentPoolController.searchTalentPool);
router.post('/invite', authenticate, TalentPoolController.sendJobInvitation);

// Public route for getting invitation (no auth required)
router.get('/invitation/:token', TalentPoolController.getJobInvitationByToken);

export default router;

