/**
 * Candidate Routes
 */

import { Router, type Router as RouterType } from 'express';
import { CandidateAuthController } from '../controllers/candidate/CandidateAuthController';
import { CandidateController } from '../controllers/candidate/CandidateController';
import { authenticateCandidate } from '../middleware/candidateAuth';

const router: RouterType = Router();

// Public auth routes
router.post('/auth/register', CandidateAuthController.register);
router.post('/auth/login', CandidateAuthController.login);

// Protected routes (require authentication)
router.use(authenticateCandidate);

// Auth routes
router.post('/auth/logout', CandidateAuthController.logout);
router.get('/auth/me', CandidateAuthController.getCurrentCandidate);

// Profile routes
router.get('/profile', CandidateController.getProfile);
router.put('/profile', CandidateController.updateProfile);
router.put('/profile/password', CandidateController.updatePassword);

export default router;

