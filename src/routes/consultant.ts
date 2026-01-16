/**
 * Consultant Routes
 * Routes for consultants
 */

import { Router, type Router as RouterType } from 'express';
import { ConsultantAuthController } from '../controllers/consultant/ConsultantAuthController';
import { ConsultantController } from '../controllers/consultant/ConsultantController';
import { ConsultantMessageController } from '../controllers/consultant/ConsultantMessageController';
import { ConsultantCandidateController } from '../controllers/consultant/ConsultantCandidateController';
import { ConsultantAnalyticsController } from '../controllers/consultant/ConsultantAnalyticsController';
import { WithdrawalController } from '../controllers/sales/WithdrawalController';

import { authenticateConsultant } from '../middleware/consultantAuth';

const router: RouterType = Router();

// Public auth routes
// Public auth routes
router.post('/auth/login', ConsultantAuthController.login);
router.post('/auth/setup-account', ConsultantAuthController.setupAccount);

// Protected routes (require authentication)
router.use(authenticateConsultant);

// Auth routes
router.post('/auth/logout', ConsultantAuthController.logout);
router.get('/auth/me', ConsultantAuthController.getCurrentConsultant);

// Profile routes
router.get('/profile', ConsultantController.getProfile);
router.put('/profile', ConsultantController.updateProfile);

// Job routes
router.get('/jobs', ConsultantController.getJobs);
router.get('/jobs/:id', ConsultantController.getJobDetails);
router.post('/jobs/:id/shortlist', ConsultantController.submitShortlist);
router.post('/jobs/:id/flag', ConsultantController.flagJob);
router.post('/jobs/:id/log', ConsultantController.logJobActivity);
router.get('/jobs/:id/pipeline', ConsultantController.getJobPipeline);
router.patch('/jobs/:id/pipeline', ConsultantController.updateJobPipeline);

// Commission routes
router.get('/commissions', ConsultantController.getCommissions);

// Performance routes
router.get('/performance', ConsultantController.getPerformance);

// Analytics routes
router.get('/analytics/dashboard', ConsultantAnalyticsController.getDashboardAnalytics);

// Messaging routes
router.get('/messages', ConsultantMessageController.listConversations);
router.get('/messages/:conversationId', ConsultantMessageController.getMessages);
router.post('/messages/:conversationId', ConsultantMessageController.sendMessage);
router.put('/messages/:conversationId/read', ConsultantMessageController.markRead);

// Candidate pipeline routes
router.get('/jobs/:jobId/candidates', ConsultantCandidateController.getPipeline);
router.get('/jobs/:jobId/rounds', ConsultantCandidateController.getJobRounds);
router.post('/candidates/:applicationId/status', ConsultantCandidateController.updateStatus);
router.post('/candidates/:applicationId/note', ConsultantCandidateController.addNote);
router.post('/candidates/:applicationId/move-to-round', ConsultantCandidateController.moveToRound);
router.post('/candidates/:applicationId/stage', ConsultantCandidateController.updateStage);

// Withdrawal routes
router.get('/commissions/balance', WithdrawalController.getBalance);
router.post('/commissions/withdraw', WithdrawalController.requestWithdrawal);
router.get('/commissions/withdrawals', WithdrawalController.getWithdrawals);
router.post('/commissions/withdrawals/:id/cancel', WithdrawalController.cancelWithdrawal);
router.post('/commissions/withdrawals/:id/execute', WithdrawalController.executeWithdrawal);

// Stripe Connect routes
router.post('/stripe/onboard', WithdrawalController.stripeOnboard);
router.get('/stripe/status', WithdrawalController.getStripeStatus);
router.post('/stripe/login-link', WithdrawalController.getStripeLoginLink);

export default router;
