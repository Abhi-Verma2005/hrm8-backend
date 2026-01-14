/**
 * Stripe Client Types
 * Shared interfaces for both real and mock Stripe clients
 */

export interface StripeAccount {
    id: string;
    object: 'account';
    business_type?: string;
    country?: string;
    email?: string;
    type: 'express' | 'standard' | 'custom';
    details_submitted: boolean;
    payouts_enabled?: boolean;
    charges_enabled?: boolean;
    capabilities?: {
        card_payments?: { [key: string]: any };
        transfers?: { [key: string]: any };
    };
    metadata?: Record<string, string>;
    created?: number;
}

export interface StripeAccountLink {
    object: 'account_link';
    created: number;
    expires_at: number;
    url: string;
}

export interface StripeCheckoutSession {
    id: string;
    object: 'checkout.session';
    url: string;
    payment_status: string;
    status: string;
    amount_total?: number;
    currency?: string;
    metadata?: Record<string, string>;
}

export interface IStripeClient {
    accounts: {
        create(params: {
            type: 'express' | 'standard' | 'custom';
            country?: string;
            email?: string;
            capabilities?: any;
            metadata?: Record<string, string>;
        }): Promise<StripeAccount>;

        retrieve(accountId: string): Promise<StripeAccount>;
    };

    accountLinks: {
        create(params: {
            account: string;
            refresh_url: string;
            return_url: string;
            type: 'account_onboarding' | 'account_update';
        }): Promise<StripeAccountLink>;
    };

    checkout: {
        sessions: {
            create(params: {
                mode: 'payment' | 'subscription';
                payment_method_types?: string[];
                line_items?: any[];
                success_url: string;
                cancel_url: string;
                metadata?: Record<string, string>;
            }): Promise<StripeCheckoutSession>;
        };
    };
}
