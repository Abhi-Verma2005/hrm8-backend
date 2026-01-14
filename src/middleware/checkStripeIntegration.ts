/**
 * Check Stripe Integration Middleware
 * Requires that entity has a connected Stripe integration before allowing payment operations
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { IntegrationStripeService, EntityType } from '../services/integrations/IntegrationStripeService';

/**
 * Get entity type from authenticated request
 */
function getEntityType(user: AuthenticatedRequest['user']): EntityType | null {
    // Check user type field
    if (user?.type === 'CONSULTANT' || user?.type === 'SALES_AGENT') {
        return 'CONSULTANT';
    }

    // Check if company user (has companyId)
    if (user?.companyId) {
        return 'COMPANY';
    }

    // If no type or companyId, assume HRM8 user (they login separately)
    if (user?.id) {
        return 'HRM8_USER';
    }

    return null;
}

/**
 * Get entity ID from user based on entity type
 */
function getEntityId(user: AuthenticatedRequest['user'], entityType: EntityType): string | null {
    switch (entityType) {
        case 'COMPANY':
            return user?.companyId || null;
        case 'HRM8_USER':
        case 'CONSULTANT':
            return user?.id || null;
        default:
            return null;
    }
}

/**
 * Middleware to require Stripe integration for payment operations
 */
export const requireStripeIntegration = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const entityType = getEntityType(req.user);

        if (!entityType) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'User type could not be determined',
            });
        }

        const entityId = getEntityId(req.user, entityType);

        if (!entityId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Entity ID could not be determined',
            });
        }

        // Check if Stripe is connected
        const hasStripe = await IntegrationStripeService.hasStripeConnected(entityType, entityId);

        if (!hasStripe) {
            // Determine redirect path based on entity type
            let redirectPath = '/integrations?tab=payments&action=connect';
            if (entityType === 'HRM8_USER') redirectPath = '/hrm8/integrations?tab=payments&action=connect';
            if (entityType === 'CONSULTANT') redirectPath = '/consultant/integrations?tab=payments&action=connect';

            return res.status(402).json({
                success: false,
                error: 'Stripe integration required',
                errorCode: 'STRIPE_NOT_CONNECTED',
                message: 'Please connect your Stripe account in Integrations to make payments',
                redirectTo: redirectPath,
            });
        }

        // Attach integration to request for later use
        const integration = await IntegrationStripeService.getStripeIntegration(entityType, entityId);
        (req as any).stripeIntegration = integration;
        (req as any).entityType = entityType;
        (req as any).entityId = entityId;

        next();
        return;
    } catch (error: any) {
        console.error('[requireStripeIntegration] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to verify Stripe integration',
            message: error.message,
        });
    }
};
