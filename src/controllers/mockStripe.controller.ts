/**
 * Mock Stripe Helper Controller
 * Endpoints to support mock Stripe functionality in development
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { approveMockAccount } from '../services/stripe/MockStripeClient';
import { StripeFactory } from '../services/stripe/StripeFactory';

export class MockStripeController {
    /**
     * Approve a mock Stripe account
     * POST /api/integrations/stripe/mock-approve
     */
    static async approveMockAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            // Only allow in development mode
            if (!StripeFactory.isUsingMock()) {
                res.status(403).json({
                    success: false,
                    error: 'Mock endpoints only available in development mode',
                });
                return;
            }

            const { account_id } = req.body;

            if (!account_id) {
                res.status(400).json({
                    success: false,
                    error: 'account_id is required',
                });
                return;
            }

            // Approve the mock account
            approveMockAccount(account_id);

            res.json({
                success: true,
                message: 'Mock account approved',
                data: {
                    account_id,
                },
            });
        } catch (error: any) {
            console.error('[MockStripeController] approveMockAccount error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to approve mock account',
            });
        }
    }
}
