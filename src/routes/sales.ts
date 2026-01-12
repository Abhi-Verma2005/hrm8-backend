/**
 * Sales Routes
 * API endpoints for the Sales Agent CRM module
 */

import { Router } from 'express';
import { authenticateConsultant } from '../middleware/consultantAuth';
import { LeadController } from '../controllers/sales/LeadController';
import { SalesDashboardController } from '../controllers/sales/SalesDashboardController';
import { SalesController } from '../controllers/sales/SalesController';
import { WithdrawalController } from '../controllers/sales/WithdrawalController';

const router: Router = Router();

// Apply auth middleware to all sales routes
router.use(authenticateConsultant);

// Lead Routes
router.post('/leads', (req, res, next) => LeadController.create(req, res).catch(next));
router.get('/leads', (req, res, next) => LeadController.getMyLeads(req, res).catch(next));
router.post('/leads/:id/convert', (req, res, next) => LeadController.convert(req, res).catch(next));

// Opportunity Routes (Pipeline)
router.get('/opportunities', SalesController.getOpportunities);
router.post('/opportunities', SalesController.createOpportunity);
router.put('/opportunities/:id', SalesController.updateOpportunity);
router.get('/opportunities/stats', SalesController.getPipelineStats);

// Activity Routes
router.get('/activities', SalesController.getActivities);
router.post('/activities', SalesController.createActivity);

// Withdrawal Routes
router.get('/commissions/balance', WithdrawalController.getBalance);
router.post('/commissions/withdraw', WithdrawalController.requestWithdrawal);
router.get('/commissions/withdrawals', WithdrawalController.getWithdrawals);
router.post('/commissions/withdrawals/:id/cancel', WithdrawalController.cancelWithdrawal);
router.post('/commissions/withdrawals/:id/execute', WithdrawalController.executeWithdrawal);

// Stripe Connect Routes
router.post('/stripe/onboard', WithdrawalController.stripeOnboard);
router.get('/stripe/status', WithdrawalController.getStripeStatus);
router.post('/stripe/login-link', WithdrawalController.getStripeLoginLink);

// Dashboard & Stats
router.get('/dashboard/stats', SalesDashboardController.getStats);
router.get('/companies', SalesDashboardController.getCompanies);
router.get('/commissions', SalesDashboardController.getCommissions);

export default router;
