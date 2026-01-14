/**
 * Integration Stripe Service
 * Centralized service for managing Stripe Connect integrations across all dashboards
 */

import prisma from '../../lib/prisma';
import { StripeFactory } from '../stripe/StripeFactory';

// Get Stripe client (auto-switches between real/mock based on environment)
const stripe = StripeFactory.getClient();

export type EntityType = 'COMPANY' | 'HRM8_USER' | 'CONSULTANT';

export class IntegrationStripeService {
    /**
     * Check if entity has Stripe connected
     */
    static async hasStripeConnected(entityType: EntityType, entityId: string): Promise<boolean> {
        const whereClause = this.buildWhereClause(entityType, entityId);

        const integration = await prisma.integration.findFirst({
            where: {
                ...whereClause,
                type: 'STRIPE_PAYMENTS',
                status: 'ACTIVE',
            },
        });

        return integration !== null && integration.stripe_account_status === 'active';
    }

    /**
     * Get active Stripe integration
     */
    static async getStripeIntegration(entityType: EntityType, entityId: string) {
        const whereClause = this.buildWhereClause(entityType, entityId);

        return await prisma.integration.findFirst({
            where: {
                ...whereClause,
                type: 'STRIPE_PAYMENTS',
                status: 'ACTIVE',
            },
        });
    }

    /**
     * Create Stripe Connect integration
     */
    static async createStripeIntegration(entityType: EntityType, entityId: string) {
        const whereClause = this.buildWhereClause(entityType, entityId);

        // Check if integration already exists
        const existingIntegration = await prisma.integration.findFirst({
            where: {
                ...whereClause,
                type: 'STRIPE_PAYMENTS',
            },
        });

        if (existingIntegration) {
            return existingIntegration;
        }

        // Get entity email for Stripe account creation
        const email = await this.getEntityEmail(entityType, entityId);

        // Create Stripe Connect account
        const account = await stripe.accounts.create({
            type: 'express',
            country: 'US', // TODO: Make this configurable based on entity location
            email: email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            metadata: {
                entity_type: entityType,
                entity_id: entityId,
                environment: process.env.NODE_ENV || 'development',
            },
        });

        // Create integration in database
        const integration = await prisma.integration.create({
            data: {
                ...whereClause,
                type: 'STRIPE_PAYMENTS',
                name: 'Stripe Payments',
                status: 'ACTIVE',
                stripe_account_id: account.id,
                stripe_account_status: 'pending',
            },
        });

        return integration;
    }

    /**
     * Generate onboarding URL for Stripe Connect
     */
    static async getOnboardingUrl(integrationId: string): Promise<string> {
        const integration = await prisma.integration.findUnique({
            where: { id: integrationId },
        });

        if (!integration || !integration.stripe_account_id) {
            throw new Error('Stripe integration not found or account ID missing');
        }

        const origin = process.env.FRONTEND_URL || 'http://localhost:8080';

        // Determine return URL based on entity type
        const returnPath = this.getReturnPath(integration);

        const accountLink = await stripe.accountLinks.create({
            account: integration.stripe_account_id,
            refresh_url: `${origin}${returnPath}?stripe_refresh=true`,
            return_url: `${origin}${returnPath}?stripe_success=true`,
            type: 'account_onboarding',
        });

        // Update integration with URLs
        await prisma.integration.update({
            where: { id: integrationId },
            data: {
                stripe_refresh_url: accountLink.url,
                stripe_return_url: `${origin}${returnPath}`,
            },
        });

        return accountLink.url;
    }

    /**
     * Sync Stripe account status
     */
    static async syncStripeStatus(integrationId: string): Promise<void> {
        const integration = await prisma.integration.findUnique({
            where: { id: integrationId },
        });

        if (!integration || !integration.stripe_account_id) {
            throw new Error('Stripe integration not found or account ID missing');
        }

        const account = await stripe.accounts.retrieve(integration.stripe_account_id);
        const detailsSubmitted = account.details_submitted;

        // Update local status
        await prisma.integration.update({
            where: { id: integrationId },
            data: {
                stripe_account_status: detailsSubmitted ? 'active' : 'pending',
                stripe_onboarded_at: detailsSubmitted && !integration.stripe_onboarded_at
                    ? new Date()
                    : integration.stripe_onboarded_at,
            },
        });
    }

    /**
     * Create payment session using integration
     */
    static async createPaymentSession(
        integrationId: string,
        paymentData: {
            amount: number;
            currency: string;
            description: string;
            successUrl: string;
            cancelUrl: string;
            metadata?: Record<string, string>;
        }
    ): Promise<any> {
        const integration = await prisma.integration.findUnique({
            where: { id: integrationId },
        });

        if (!integration || !integration.stripe_account_id) {
            throw new Error('Stripe integration not found');
        }

        if (integration.stripe_account_status !== 'active') {
            throw new Error('Stripe account not fully onboarded');
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: paymentData.currency,
                        unit_amount: Math.round(paymentData.amount * 100), // Convert to cents
                        product_data: {
                            name: paymentData.description,
                        },
                    },
                    quantity: 1,
                },
            ],
            success_url: paymentData.successUrl,
            cancel_url: paymentData.cancelUrl,
            metadata: {
                integration_id: integrationId,
                ...paymentData.metadata,
            },
        });

        return session;
    }

    /**
     * Helper: Build where clause for entity
     */
    private static buildWhereClause(entityType: EntityType, entityId: string) {
        switch (entityType) {
            case 'COMPANY':
                return { company_id: entityId };
            case 'HRM8_USER':
                return { hrm8_user_id: entityId };
            case 'CONSULTANT':
                return { consultant_id: entityId };
            default:
                throw new Error(`Unknown entity type: ${entityType}`);
        }
    }

    /**
     * Helper: Get entity email
     */
    private static async getEntityEmail(entityType: EntityType, entityId: string): Promise<string> {
        let email = '';

        switch (entityType) {
            case 'COMPANY': {
                const company = await prisma.company.findUnique({
                    where: { id: entityId },
                    include: { users: { take: 1 } },
                });
                email = company?.users[0]?.email || '';
                break;
            }
            case 'HRM8_USER': {
                const user = await prisma.hRM8User.findUnique({
                    where: { id: entityId },
                });
                email = user?.email || '';
                break;
            }
            case 'CONSULTANT': {
                const consultant = await prisma.consultant.findUnique({
                    where: { id: entityId },
                });
                email = consultant?.email || '';
                break;
            }
            default:
                throw new Error(`Unknown entity type: ${entityType}`);
        }

        // Fallback to a placeholder if no email found
        if (!email) {
            email = `noreply+${entityType.toLowerCase()}_${entityId}@hrm8platform.com`;
        }

        return email;
    }

    /**
     * Helper: Get return path for entity type
     */
    private static getReturnPath(integration: any): string {
        if (integration.company_id) return '/integrations';
        if (integration.hrm8_user_id) return '/hrm8/integrations';
        if (integration.consultant_id) return '/consultant/integrations';
        return '/integrations';
    }
}
