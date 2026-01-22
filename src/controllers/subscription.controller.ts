/**
 * Subscription Controller
 * Handles subscription purchases, renewals, job posting deductions, and add-on services
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { PrismaClient, VirtualTransactionType } from '@prisma/client';
import { SubscriptionService } from '../services/subscriptionService';
import { VirtualWalletService } from '../services/virtualWalletService';

const prisma = new PrismaClient();
const subscriptionService = new SubscriptionService(prisma);
const walletService = new VirtualWalletService(prisma);

/**
 * Create new subscription
 * POST /api/wallet/subscription
 */
export const createSubscription = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const companyId = req.user?.companyId || req.user?.id;

        if (!companyId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const {
            planType,
            name,
            basePrice,
            billingCycle,
            jobQuota,
            discountPercent,
            salesAgentId,
            referredBy,
            autoRenew,
        } = req.body;

        if (!planType || !name || !basePrice || !billingCycle) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await subscriptionService.createSubscription({
            companyId,
            planType,
            name,
            basePrice,
            billingCycle,
            jobQuota,
            discountPercent,
            salesAgentId,
            referredBy,
            autoRenew,
        });

        return res.json({
            success: true,
            data: result,
            message: `Subscription created successfully. Your wallet has been credited with $${basePrice}.`,
        });
    } catch (error: any) {
        console.error('Error creating subscription:', error);
        return res.status(500).json({ error: error.message || 'Failed to create subscription' });
    }
};

/**
 * Get subscription details with stats
 * GET /api/wallet/subscription/:subscriptionId
 */
export const getSubscription = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { subscriptionId } = req.params;

        const subscription = await subscriptionService.getSubscriptionWithStats(subscriptionId);

        // Verify ownership
        if (subscription.subscription.company_id !== req.user?.companyId && subscription.subscription.company_id !== req.user?.id) {
            return res.status(403).json({ error: 'Unauthorized access to subscription' });
        }

        return res.json({
            success: true,
            data: subscription,
        });
    } catch (error: any) {
        console.error('Error getting subscription:', error);
        return res.status(500).json({ error: error.message || 'Failed to get subscription' });
    }
};

/**
 * Get all company subscriptions
 * GET /api/wallet/subscriptions
 */
export const getCompanySubscriptions = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const companyId = req.user?.companyId || req.user?.id;

        console.log('[getCompanySubscriptions] Request received:', {
            userId: req.user?.id,
            userType: req.user?.type,
            companyId,
            headers: {
                authorization: req.headers.authorization ? 'present' : 'missing',
                cookie: req.headers.cookie ? 'present' : 'missing',
            },
        });

        if (!companyId) {
            console.log('[getCompanySubscriptions] Unauthorized: missing companyId');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        console.log('[getCompanySubscriptions] Looking up subscriptions for company:', companyId);
        const subscriptions = await prisma.subscription.findMany({
            where: { company_id: companyId },
            orderBy: { created_at: 'desc' },
        });

        console.log('[getCompanySubscriptions] Found', subscriptions.length, 'subscriptions');

        return res.json({
            success: true,
            data: subscriptions,
        });
    } catch (error: any) {
        console.error('[getCompanySubscriptions] Error:', error);
        return res.status(500).json({ error: error.message || 'Failed to get subscriptions' });
    }
};

/**
 * Renew subscription
 * POST /api/wallet/subscription/:subscriptionId/renew
 */
export const renewSubscription = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { subscriptionId } = req.params;

        // Verify ownership
        const subscription = await prisma.subscription.findUnique({
            where: { id: subscriptionId },
        });

        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        if (subscription.company_id !== req.user?.companyId && subscription.company_id !== req.user?.id) {
            return res.status(403).json({ error: 'Unauthorized access to subscription' });
        }

        const renewed = await subscriptionService.renewSubscription(subscriptionId);

        return res.json({
            success: true,
            data: renewed,
            message: 'Subscription renewed successfully.',
        });
    } catch (error: any) {
        console.error('Error renewing subscription:', error);

        // Check if it's an insufficient balance error
        if (error.message.includes('Insufficient balance')) {
            return res.status(402).json({
                error: 'INSUFFICIENT_BALANCE',
                message: error.message,
                action: 'RECHARGE_REQUIRED',
            });
        }

        return res.status(500).json({ error: error.message || 'Failed to renew subscription' });
    }
};

/**
 * Cancel subscription
 * POST /api/wallet/subscription/:subscriptionId/cancel
 */
export const cancelSubscription = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { subscriptionId } = req.params;
        const { reason } = req.body;

        // Verify ownership
        const subscription = await prisma.subscription.findUnique({
            where: { id: subscriptionId },
        });

        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        if (subscription.company_id !== req.user?.companyId && subscription.company_id !== req.user?.id) {
            return res.status(403).json({ error: 'Unauthorized access to subscription' });
        }

        const cancelled = await subscriptionService.cancelSubscription(subscriptionId, reason);

        return res.json({
            success: true,
            data: cancelled,
            message: 'Subscription cancelled successfully.',
        });
    } catch (error: any) {
        console.error('Error cancelling subscription:', error);
        return res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
    }
};

/**
 * Process job posting (deduct from wallet)
 * POST /api/wallet/subscription/job-posting
 */
export const processJobPosting = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const companyId = req.user?.companyId || req.user?.id;
        const userId = req.user?.id;

        if (!companyId || !userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { subscriptionId, jobTitle } = req.body;

        if (!subscriptionId || !jobTitle) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await subscriptionService.processJobPosting({
            subscriptionId,
            companyId,
            userId,
            jobTitle,
        });

        return res.json({
            success: true,
            data: result,
            message: result.jobCost > 0
                ? `Job posted successfully. $${result.jobCost.toFixed(2)} deducted from your wallet.`
                : 'Job posted successfully.',
        });
    } catch (error: any) {

        // Check for specific error types
        if (error.message.includes('quota exceeded')) {
            return res.status(403).json({
                error: 'QUOTA_EXCEEDED',
                message: error.message,
                action: 'UPGRADE_PLAN',
            });
        }

        if (error.message.includes('Insufficient balance')) {
            return res.status(402).json({
                error: 'INSUFFICIENT_BALANCE',
                message: error.message,
                action: 'RECHARGE_REQUIRED',
            });
        }

        return res.status(500).json({ error: error.message || 'Failed to process job posting' });
    }
};

/**
 * Process add-on service purchase (deduct from wallet, prompt recharge if needed)
 * POST /api/wallet/subscription/addon-service
 */
export const processAddonService = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const companyId = req.user?.companyId || req.user?.id;
        const userId = req.user?.id;

        if (!companyId || !userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { serviceType, jobId, amount, description } = req.body;

        if (!serviceType || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get or create virtual account
        const virtualAccount = await walletService.getOrCreateAccount({
            ownerType: 'COMPANY',
            ownerId: companyId,
        });

        // Check if sufficient balance
        const hasBalance = await walletService.checkBalance(virtualAccount.id, amount);

        if (!hasBalance) {
            return res.status(402).json({
                error: 'INSUFFICIENT_BALANCE',
                message: `Insufficient balance. Available: $${virtualAccount.balance.toFixed(2)}, Required: $${amount.toFixed(2)}`,
                action: 'RECHARGE_REQUIRED',
                currentBalance: virtualAccount.balance,
                requiredAmount: amount,
                shortfall: amount - virtualAccount.balance,
            });
        }

        // Deduct from wallet
        const result = await walletService.debitAccount({
            accountId: virtualAccount.id,
            amount,
            type: VirtualTransactionType.ADDON_SERVICE_CHARGE,
            description: description || `Add-on service: ${serviceType}`,
            referenceType: 'JOB',
            referenceId: jobId,
            jobId,
            createdBy: userId,
        });

        return res.json({
            success: true,
            data: result,
            message: `Add-on service purchased successfully. $${amount.toFixed(2)} deducted from your wallet.`,
        });
    } catch (error: any) {
        console.error('Error processing add-on service:', error);

        if (error.message.includes('Insufficient balance')) {
            return res.status(402).json({
                error: 'INSUFFICIENT_BALANCE',
                message: error.message,
                action: 'RECHARGE_REQUIRED',
            });
        }

        return res.status(500).json({ error: error.message || 'Failed to process add-on service' });
    }
};

/**
 * Get subscription statistics
 * GET /api/wallet/subscription/:subscriptionId/stats
 */
export const getSubscriptionStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { subscriptionId } = req.params;

        const stats = await subscriptionService.getSubscriptionWithStats(subscriptionId);

        // Verify ownership
        if (stats.subscription.company_id !== req.user?.companyId && stats.subscription.company_id !== req.user?.id) {
            return res.status(403).json({ error: 'Unauthorized access to subscription' });
        }

        return res.json({
            success: true,
            data: stats,
        });
    } catch (error: any) {
        console.error('Error getting subscription stats:', error);
        return res.status(500).json({ error: error.message || 'Failed to get subscription statistics' });
    }
};

/**
 * Get available pricing products
 * GET /api/wallet/pricing/products
 */
export const getPricingProducts = async (_req: AuthenticatedRequest, res: Response) => {
    try {
        const products = await prisma.product.findMany({
            where: { is_active: true },
            include: {
                tiers: {
                    include: {
                        price_book: true,
                    },
                },
            },
            orderBy: { created_at: 'asc' },
        });

        return res.json({
            success: true,
            data: products,
        });
    } catch (error: any) {
        console.error('Error getting pricing products:', error);
        return res.status(500).json({ error: error.message || 'Failed to get pricing products' });
    }
};

/**
 * Get pricing tiers
 * GET /api/wallet/pricing/tiers?productId=...
 */
export const getPricingTiers = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { productId } = req.query;

        const where: any = {};
        if (productId) {
            where.product_id = productId;
        }

        const tiers = await prisma.priceTier.findMany({
            where,
            include: {
                product: true,
                price_book: true,
            },
            orderBy: { unit_price: 'asc' },
        });

        return res.json({
            success: true,
            data: tiers,
        });
    } catch (error: any) {
        console.error('Error getting pricing tiers:', error);
        return res.status(500).json({ error: error.message || 'Failed to get pricing tiers' });
    }
};
