/**
 * Integration Controller
 * Handles integration management endpoints
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { IntegrationStripeService, EntityType } from '../services/integrations/IntegrationStripeService';

/**
 * Get entity type and ID from request
 */
function getEntityInfo(user: AuthenticatedRequest['user']): { entityType: EntityType; entityId: string } | null {
    // Check user type field
    if (user?.type === 'CONSULTANT' || user?.type === 'SALES_AGENT') {
        return user?.id ? { entityType: 'CONSULTANT', entityId: user.id } : null;
    }

    // Check if company user (has companyId)
    if (user?.companyId) {
        return { entityType: 'COMPANY', entityId: user.companyId };
    }

    // If no type or companyId, assume HRM8 user
    if (user?.id) {
        return { entityType: 'HRM8_USER', entityId: user.id };
    }

    return null;
}

export class IntegrationController {
    /**
     * Get Stripe connection status  
     * GET /api/integrations/stripe/status
     */
    static async getStripeStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const entityInfo = getEntityInfo(req.user);

            if (!entityInfo) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                });
                return;
            }

            const { entityType, entityId } = entityInfo;
            const connected = await IntegrationStripeService.hasStripeConnected(entityType, entityId);
            const integration = connected
                ? await IntegrationStripeService.getStripeIntegration(entityType, entityId)
                : null;

            res.json({
                success: true,
                data: {
                    connected,
                    integration,
                },
            });
        } catch (error: any) {
            console.error('[IntegrationController] getStripeStatus error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get Stripe status',
            });
        }
    }

    /**
     * Connect Stripe (create integration and return onboarding URL)
     * POST /api/integrations/stripe/connect
     */
    static async connectStripe(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const entityInfo = getEntityInfo(req.user);

            if (!entityInfo) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                });
                return;
            }

            const { entityType, entityId } = entityInfo;

            // Create or get existing integration
            const integration = await IntegrationStripeService.createStripeIntegration(entityType, entityId);

            // Generate onboarding URL
            const onboardingUrl = await IntegrationStripeService.getOnboardingUrl(integration.id);

            res.json({
                success: true,
                data: {
                    integration,
                    onboarding_url: onboardingUrl,
                },
            });
        } catch (error: any) {
            console.error('[IntegrationController] connectStripe error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to connect Stripe',
            });
        }
    }

    /**
     * Sync Stripe account status
     * POST /api/integrations/stripe/sync
     */
    static async syncStripe(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const entityInfo = getEntityInfo(req.user);

            if (!entityInfo) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                });
                return;
            }

            const { entityType, entityId } = entityInfo;
            const integration = await IntegrationStripeService.getStripeIntegration(entityType, entityId);

            if (!integration) {
                res.status(404).json({
                    success: false,
                    error: 'Stripe integration not found',
                });
                return;
            }

            await IntegrationStripeService.syncStripeStatus(integration.id);

            // Get updated integration
            const updatedIntegration = await IntegrationStripeService.getStripeIntegration(entityType, entityId);

            res.json({
                success: true,
                data: updatedIntegration,
                message: 'Stripe account status synced successfully',
            });
        } catch (error: any) {
            console.error('[IntegrationController] syncStripe error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to sync Stripe status',
            });
        }
    }

    /**
     * Create Stripe Checkout Session
     * POST /api/integrations/stripe/create-checkout-session
     */
    static async createCheckoutSession(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const user = req.user;
            const entityInfo = getEntityInfo(user);

            if (!entityInfo) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                });
                return;
            }

            const { entityType, entityId } = entityInfo;
            const { amount, description, successUrl, cancelUrl, metadata } = req.body;

            // Validate required fields
            if (!amount || amount <= 0) {
                res.status(400).json({
                    success: false,
                    error: 'Valid amount is required',
                });
                return;
            }

            if (!description) {
                res.status(400).json({
                    success: false,
                    error: 'Description is required',
                });
                return;
            }

            // Get or create Stripe integration
            let integration = await IntegrationStripeService.getStripeIntegration(entityType, entityId);

            if (!integration) {
                console.log('[IntegrationController] No existing integration found, creating new one...');
                // If no integration exists, create one first
                try {
                    integration = await IntegrationStripeService.createStripeIntegration(entityType, entityId);
                } catch (createError: any) {
                    console.error('[IntegrationController] Failed to create integration:', createError);
                    res.status(500).json({
                        success: false,
                        error: 'Failed to create Stripe integration',
                        details: createError.message,
                    });
                    return;
                }
            }

            if (!integration || !integration.id) {
                console.error('[IntegrationController] Integration is null or missing ID:', integration);
                res.status(500).json({
                    success: false,
                    error: 'Failed to get or create Stripe integration',
                });
                return;
            }

            console.log('[IntegrationController] Creating payment session with amount:', amount);

            // Create checkout session
            const session = await IntegrationStripeService.createPaymentSession(integration.id, {
                amount,
                currency: 'usd',
                description,
                successUrl: successUrl || `${process.env.FRONTEND_URL}/subscriptions?success=true`,
                cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/subscriptions?canceled=true`,
                metadata,
            });

            res.json({
                success: true,
                data: {
                    sessionId: session.id,
                    url: session.url,
                },
            });
        } catch (error: any) {
            console.error('[IntegrationController] createCheckoutSession error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to create checkout session',
            });
        }
    }

    /**
     * Handle Mock Payment Success (Development Only)
     * POST /api/integrations/stripe/mock-payment-success
     */
    static async handleMockPaymentSuccess(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const user = req.user;
            const entityInfo = getEntityInfo(user);

            if (!entityInfo) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                });
                return;
            }

            const { entityType, entityId } = entityInfo;
            const { sessionId, amount } = req.body;

            if (!sessionId || !amount) {
                res.status(400).json({
                    success: false,
                    error: 'Session ID and amount are required',
                });
                return;
            }

            console.log('[IntegrationController] Processing mock payment success:', { sessionId, amount, entityType, entityId });

            // Import VirtualWalletService and prisma
            const { VirtualWalletService } = await import('../services/virtualWalletService');
            const prisma = (await import('../lib/prisma')).default;
            const walletService = new VirtualWalletService(prisma);

            // Get or create virtual account for company
            const virtualAccount = await walletService.getOrCreateAccount({
                ownerType: 'COMPANY',
                ownerId: entityId,
            });

            // Credit the wallet with payment amount
            await walletService.creditAccount({
                accountId: virtualAccount.id,
                amount: amount / 100, // Convert cents to dollars
                type: 'TRANSFER_IN',
                description: `Mock Stripe payment - Session ${sessionId.substring(0, 20)}`,
                referenceType: 'PAYMENT',
                referenceId: sessionId,
            });

            console.log('[IntegrationController] Wallet credited successfully:', {
                amount: amount / 100,
                accountId: virtualAccount.id,
            });

            res.json({
                success: true,
                data: {
                    message: 'Payment processed successfully',
                    amount: amount / 100,
                },
            });
        } catch (error: any) {
            console.error('[IntegrationController] handleMockPaymentSuccess error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to process mock payment',
            });
        }
    }
}
