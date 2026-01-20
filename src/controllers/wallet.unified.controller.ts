/**
 * Wallet Controller
 * Unified API controller for wallet operations
 * Used by both Consultant and Sales Agent portals
 */

import { Response } from 'express';
import { ConsultantAuthenticatedRequest } from '../middleware/consultantAuth';
import { CommissionWalletService } from '../services/CommissionWalletService';
import { StripeConnectService } from '../services/sales/StripeConnectService';

export class WalletController {
    /**
     * Get wallet balance
     * GET /api/wallet/balance
     */
    static async getBalance(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const balance = await CommissionWalletService.getBalance(consultantId);
            res.json({ success: true, data: balance });
        } catch (error: any) {
            console.error('Get wallet balance error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Get earnings summary
     * GET /api/wallet/earnings
     */
    static async getEarnings(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const earnings = await CommissionWalletService.getEarnings(consultantId);
            res.json({ success: true, data: earnings });
        } catch (error: any) {
            console.error('Get earnings error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Get transaction history
     * GET /api/wallet/transactions
     */
    static async getTransactions(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const limit = parseInt(req.query.limit as string) || 50;
            const transactions = await CommissionWalletService.getTransactions(consultantId, limit);
            res.json({ success: true, data: transactions });
        } catch (error: any) {
            console.error('Get transactions error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Request withdrawal
     * POST /api/wallet/withdraw
     */
    static async requestWithdrawal(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { amount, commissionIds, paymentMethod, notes } = req.body;

            if (!amount || amount <= 0) {
                res.status(400).json({ success: false, error: 'Invalid amount' });
                return;
            }

            const result = await CommissionWalletService.requestWithdrawal(consultantId, {
                amount,
                commissionIds,
                paymentMethod,
                notes,
            });

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.json(result);
        } catch (error: any) {
            console.error('Request withdrawal error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Get Stripe Connect status
     * GET /api/wallet/stripe/status
     */
    static async getStripeStatus(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const status = await StripeConnectService.checkAccountStatus(consultantId);
            res.json({ success: true, data: status });
        } catch (error: any) {
            console.error('Get Stripe status error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Start Stripe Connect onboarding
     * POST /api/wallet/stripe/onboard
     */
    static async stripeOnboard(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const result = await StripeConnectService.createConnectAccount(consultantId);
            res.json({ success: true, data: result });
        } catch (error: any) {
            console.error('Stripe onboard error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Get Stripe Express Dashboard login link
     * POST /api/wallet/stripe/login
     */
    static async getStripeLogin(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const url = await StripeConnectService.getLoginLink(consultantId);
            res.json({ success: true, data: { url } });
        } catch (error: any) {
            console.error('Get Stripe login link error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Get minimum withdrawal amount
     * GET /api/wallet/minimum
     */
    static async getMinimum(_req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
        res.json({
            success: true,
            data: { minimumWithdrawal: CommissionWalletService.getMinimumWithdrawal() },
        });
    }
}
