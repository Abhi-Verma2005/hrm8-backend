/**
 * Stripe Factory
 * Provides the correct Stripe client based on environment
 */

import Stripe from 'stripe';
import { MockStripeClient } from './MockStripeClient';

export class StripeFactory {
    private static mockClient: MockStripeClient | null = null;
    private static realClient: Stripe | null = null;

    /**
     * Get the appropriate Stripe client based on environment
     */
    static getClient(): any {
        const useMock = this.shouldUseMock();

        if (useMock) {
            return this.getMockClient();
        } else {
            return this.getRealClient();
        }
    }

    /**
     * Determine if mock should be used
     */
    private static shouldUseMock(): boolean {
        // Explicit override via env variable
        if (process.env.USE_MOCK_STRIPE === 'true') {
            console.log('[StripeFactory] Using MOCK Stripe (USE_MOCK_STRIPE=true)');
            return true;
        }

        if (process.env.USE_MOCK_STRIPE === 'false') {
            console.log('[StripeFactory] Using REAL Stripe (USE_MOCK_STRIPE=false)');
            return false;
        }

        // Default: use mock in development, real in production
        const isDevelopment = process.env.NODE_ENV === 'development';

        if (isDevelopment) {
            console.log('[StripeFactory] Using MOCK Stripe (NODE_ENV=development)');
        } else {
            console.log('[StripeFactory] Using REAL Stripe (NODE_ENV=production)');
        }

        return isDevelopment;
    }

    /**
     * Get or create mock client (singleton)
     */
    private static getMockClient(): MockStripeClient {
        if (!this.mockClient) {
            this.mockClient = new MockStripeClient();
            console.log('[StripeFactory] Mock Stripe client initialized');
        }
        return this.mockClient;
    }

    /**
     * Get or create real Stripe client (singleton)
     */
    private static getRealClient(): Stripe {
        if (!this.realClient) {
            const apiKey = process.env.STRIPE_SECRET_KEY;

            if (!apiKey) {
                throw new Error('[StripeFactory] STRIPE_SECRET_KEY is required for real Stripe client');
            }

            this.realClient = new Stripe(apiKey);
            console.log('[StripeFactory] Real Stripe client initialized');
        }

        return this.realClient;
    }

    /**
     * Check if currently using mock
     */
    static isUsingMock(): boolean {
        return this.shouldUseMock();
    }
}
