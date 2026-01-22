/**
 * Consultant 360 Routes
 * Unified API endpoints for Consultant 360 users with access to both
 * recruiter and sales agent features with combined earnings.
 */

import { Router, type Router as RouterType } from 'express';
import { Consultant360Controller } from '../controllers/consultant360/Consultant360Controller';
import { authenticateConsultant } from '../middleware/consultantAuth';

const router: RouterType = Router();

// All routes require consultant authentication
router.use(authenticateConsultant);

// ==================== Dashboard ====================

// GET /api/consultant360/dashboard - Get unified dashboard stats
router.get('/dashboard', Consultant360Controller.getUnifiedDashboard);

// ==================== Sales / Leads ====================

// GET /api/consultant360/leads - Get leads
router.get('/leads', Consultant360Controller.getLeads);

// POST /api/consultant360/leads - Create lead
router.post('/leads', Consultant360Controller.createLead);

// POST /api/consultant360/leads/:id/conversion-request - Submit conversion request
router.post('/leads/:id/conversion-request', Consultant360Controller.submitConversionRequest);

// ==================== Earnings & Commissions ====================

// GET /api/consultant360/earnings - Get unified earnings breakdown
router.get('/earnings', Consultant360Controller.getUnifiedEarnings);

// GET /api/consultant360/commissions - Get commissions with filters
// Query: type (RECRUITER|SALES|ALL), status, limit, offset
router.get('/commissions', Consultant360Controller.getUnifiedCommissions);

// GET /api/consultant360/balance - Get unified withdrawal balance
router.get('/balance', Consultant360Controller.getUnifiedBalance);

// ==================== Withdrawals ====================

// POST /api/consultant360/withdraw - Request withdrawal
router.post('/withdraw', Consultant360Controller.requestWithdrawal);

// GET /api/consultant360/withdrawals - Get withdrawal history
router.get('/withdrawals', Consultant360Controller.getWithdrawals);

// POST /api/consultant360/withdrawals/:id/cancel - Cancel withdrawal
router.post('/withdrawals/:id/cancel', Consultant360Controller.cancelWithdrawal);

// POST /api/consultant360/withdrawals/:id/execute - Execute withdrawal (Stripe payout)
router.post('/withdrawals/:id/execute', Consultant360Controller.executeWithdrawal);

// ==================== Stripe Connect ====================

// POST /api/consultant360/stripe/onboard - Start Stripe onboarding
router.post('/stripe/onboard', Consultant360Controller.stripeOnboard);

// GET /api/consultant360/stripe/status - Get Stripe account status
router.get('/stripe/status', Consultant360Controller.getStripeStatus);

// POST /api/consultant360/stripe/login-link - Get Stripe dashboard login link
router.post('/stripe/login-link', Consultant360Controller.getStripeLoginLink);

export default router;
