/**
 * Stripe Factory
 * Provides the correct Stripe client based on environment
 */

import Stripe from 'stripe';
import { MockStripeClient } from './MockStripeClient';
import { ConfigService } from '../config/ConfigService';

export class StripeFactory {
    private static mockClient: MockStripeClient | null = null;
    private static realClient: Stripe | null = null;

    /**
     * Get the appropriate Stripe client based on environment (Async)
     */
    static async getClientAsync(): Promise<any> {
        const useMock = this.shouldUseMock();

        if (useMock) {
            return this.getMockClient();
        } else {
            return this.getRealClientAsync();
        }
    }

    /**
     * Get the appropriate Stripe client based on environment (Synchronous - Deprecated or fallback)
     * Warning: Only works if config is already env-based or preloaded.
     */
    static getClient(): any {
        const useMock = this.shouldUseMock();

        if (useMock) {
            return this.getMockClient();
        } else {
            // Fallback for legacy calls - assumes env var might still be there or throws
            //Ideally we migrate all to getClientAsync
            if (this.realClient) return this.realClient;


            return this.getRealClientSyncFallback();
        }
    }

    /**
     * Determine if mock should be used
     */
    private static shouldUseMock(): boolean {
        // Explicit override via env variable
        if (process.env.USE_MOCK_STRIPE === 'true') {
            return true;
        }

        if (process.env.USE_MOCK_STRIPE === 'false') {
            return false;
        }

        // Default: use mock in development, real in production
        const isDevelopment = process.env.NODE_ENV === 'development';



        return isDevelopment;
    }

    /**
     * Get or create mock client (singleton)
     */
    private static getMockClient(): MockStripeClient {
        if (!this.mockClient) {
            this.mockClient = new MockStripeClient();
        }
        return this.mockClient;
    }

    /**
     * Get or create real Stripe client (Async)
     */
    private static async getRealClientAsync(): Promise<Stripe> {
        if (!this.realClient) {
            const config = await ConfigService.getStripeConfig();
            const apiKey = config.secretKey;

            if (!apiKey) {
                throw new Error('[StripeFactory] STRIPE_SECRET_KEY is required for real Stripe client');
            }

            this.realClient = new Stripe(apiKey, {
                // apiVersion: '2023-10-16', // Removing explicit version to avoid TS mismatch
            } as any);

        }

        return this.realClient;
    }

    /**
    * Get or create real Stripe client (Sync Fallback)
    */
    private static getRealClientSyncFallback(): Stripe {
        if (!this.realClient) {
            const apiKey = process.env.STRIPE_SECRET_KEY;

            if (!apiKey) {
                throw new Error('[StripeFactory] STRIPE_SECRET_KEY is required for real Stripe client (Sync)');
            }

            this.realClient = new Stripe(apiKey, {
                // apiVersion: '2023-10-16',
            } as any);

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

