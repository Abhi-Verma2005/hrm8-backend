/**
 * Unified Wallet Routes
 * API endpoints for wallet operations
 * Used by both Consultant and Sales Agent portals
 */

import { Router } from 'express';
import { authenticateConsultant } from '../middleware/consultantAuth';
import { WalletController } from '../controllers/wallet.unified.controller';

const router: Router = Router();

// Apply auth middleware - works for all consultant roles
router.use(authenticateConsultant);

// Balance & Earnings
router.get('/balance', WalletController.getBalance);
router.get('/earnings', WalletController.getEarnings);
router.get('/transactions', WalletController.getTransactions);
router.get('/minimum', WalletController.getMinimum);

// Withdrawal
router.post('/withdraw', WalletController.requestWithdrawal);

// Stripe Connect
router.get('/stripe/status', WalletController.getStripeStatus);
router.post('/stripe/onboard', WalletController.stripeOnboard);
router.post('/stripe/login', WalletController.getStripeLogin);

export default router;
