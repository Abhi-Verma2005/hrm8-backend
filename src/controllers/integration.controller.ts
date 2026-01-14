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
}
