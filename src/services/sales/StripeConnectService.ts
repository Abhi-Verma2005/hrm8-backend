/**
 * Stripe Connect Service
 * Handles Stripe Connect account creation and onboarding for sales agents
 */

import Stripe from 'stripe';
import prisma from '../../lib/prisma';
import { MockStripeService } from './MockStripeService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');

export class StripeConnectService {
    /**
     * Create a Stripe Express Connect account for a consultant
     * @param consultantId - The consultant's ID
     * @param returnPath - Optional return path after Stripe onboarding (e.g., '/consultant/settings')
     */
    static async createConnectAccount(
        consultantId: string,
        returnPath?: string
    ): Promise<{ accountId: string; onboardingUrl: string }> {
        const consultant = await prisma.consultant.findUnique({
            where: { id: consultantId },
        });

        if (!consultant) {
            throw new Error('Consultant not found');
        }

        let accountId = consultant.stripe_account_id;

        // Determine return path based on consultant role if not provided
        const settingsPath = returnPath || (consultant.role === 'SALES_AGENT'
            ? '/sales-agent/settings'
            : '/consultant/settings');

        // Check for mock mode
        if (MockStripeService.isMockMode()) {
            if (!accountId) {
                const mockResult = MockStripeService.mockCreateAccount(consultant.email, settingsPath);
                accountId = mockResult.accountId;

                // Save mock account ID to consultant
                await prisma.consultant.update({
                    where: { id: consultantId },
                    data: {
                        stripe_account_id: accountId,
                        stripe_account_status: 'active', // Mock accounts are always active
                        payout_enabled: true,
                    },
                });

                return mockResult;
            }
            return {
                accountId,
                onboardingUrl: MockStripeService.mockCreateAccount(consultant.email, settingsPath).onboardingUrl,
            };
        }

        // Create Stripe account if it doesn't exist
        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'US', // Default to US, should ideally come from consultant profile
                email: consultant.email,
                capabilities: {
                    transfers: { requested: true },
                },
                metadata: {
                    consultant_id: consultantId,
                    environment: process.env.NODE_ENV || 'development',
                },
            });

            accountId = account.id;

            // Save account ID to consultant
            await prisma.consultant.update({
                where: { id: consultantId },
                data: {
                    stripe_account_id: accountId,
                    stripe_account_status: 'pending',
                },
            });
        }

        // Generate onboarding link with proper return path
        const onboardingUrl = await this.generateOnboardingLink(accountId, settingsPath);

        return { accountId, onboardingUrl };
    }

    /**
     * Generate onboarding link for a Stripe account
     * @param accountId - Stripe account ID
     * @param returnPath - Return path after onboarding (e.g., '/consultant/settings')
     */
    static async generateOnboardingLink(accountId: string, returnPath: string = '/consultant/settings'): Promise<string> {
        // Mock mode
        if (MockStripeService.isMockMode()) {
            const origin = process.env.FRONTEND_URL || 'http://localhost:8080';
            return `${origin}${returnPath}?stripe_success=true`;
        }

        const origin = process.env.FRONTEND_URL || 'http://localhost:8080';

        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${origin}${returnPath}?stripe_refresh=true`,
            return_url: `${origin}${returnPath}?stripe_success=true`,
            type: 'account_onboarding',
        });

        return accountLink.url;
    }

    /**
     * Check Stripe account status and update local DB
     */
    static async checkAccountStatus(consultantId: string): Promise<{
        payoutEnabled: boolean;
        detailsSubmitted: boolean
    }> {
        const consultant = await prisma.consultant.findUnique({
            where: { id: consultantId },
        });

        if (!consultant?.stripe_account_id) {
            return { payoutEnabled: false, detailsSubmitted: false };
        }

        // Mock mode
        if (MockStripeService.isMockMode()) {
            return MockStripeService.mockAccountStatus();
        }

        const account = await stripe.accounts.retrieve(consultant.stripe_account_id);

        const payoutEnabled = account.payouts_enabled;
        const detailsSubmitted = account.details_submitted;

        // Update local status if changed
        if (consultant.payout_enabled !== payoutEnabled ||
            consultant.stripe_account_status !== (detailsSubmitted ? 'active' : 'pending')) {

            await prisma.consultant.update({
                where: { id: consultantId },
                data: {
                    payout_enabled: payoutEnabled,
                    stripe_account_status: detailsSubmitted ? 'active' : 'pending',
                    stripe_onboarded_at: detailsSubmitted && !consultant.stripe_onboarded_at ? new Date() : undefined,
                },
            });
        }

        return { payoutEnabled, detailsSubmitted };
    }

    /**
     * Get Stripe login link for Express Dashboard
     */
    static async getLoginLink(consultantId: string): Promise<string> {
        const consultant = await prisma.consultant.findUnique({
            where: { id: consultantId },
        });

        if (!consultant?.stripe_account_id) {
            throw new Error('Stripe account not connected');
        }

        // Mock mode
        if (MockStripeService.isMockMode()) {
            return MockStripeService.mockLoginLink();
        }

        const loginLink = await stripe.accounts.createLoginLink(consultant.stripe_account_id);
        return loginLink.url;
    }
}
