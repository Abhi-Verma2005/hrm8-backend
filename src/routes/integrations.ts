/**
 * Integration Routes
 * Endpoints for managing integrations (Stripe, etc.)
 */

import { Router } from 'express';
import { IntegrationController } from '../controllers/integration.controller';
import { MockStripeController } from '../controllers/mockStripe.controller';
import { authenticate } from '../middleware/auth';

const router: Router = Router();

// All integration routes require authentication
router.use(authenticate);

// Stripe integration routes
router.get('/stripe/status', (req, res) => IntegrationController.getStripeStatus(req as any, res));
router.post('/stripe/connect', (req, res) => IntegrationController.connectStripe(req as any, res));
router.post('/stripe/sync', (req, res) => IntegrationController.syncStripe(req as any, res));
router.post('/stripe/create-checkout-session', (req, res) => IntegrationController.createCheckoutSession(req as any, res));

// Mock Stripe routes (development only)
router.post('/stripe/mock-approve', (req, res) => MockStripeController.approveMockAccount(req as any, res));
router.post('/stripe/mock-payment-success', (req, res) => IntegrationController.handleMockPaymentSuccess(req as any, res));

export default router;
