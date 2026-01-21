/**
 * Mock Stripe Client
 * Simulates Stripe Connect operations for development
 */


import { IStripeClient, StripeAccount, StripeAccountLink, StripeCheckoutSession } from './types';

// In-memory storage for mock accounts
const mockAccounts = new Map<string, StripeAccount>();
const mockSessions = new Map<string, StripeCheckoutSession>();

/**
 * Simulate webhook event (dev mode only)
 * Sends a POST request to the local webhook endpoint
 */
async function simulateWebhook(event: {
    type: string;
    data: { object: any };
}): Promise<void> {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const webhookUrl = `${backendUrl}/api/payments/stripe-webhook`;

    try {
        // In mock mode, we don't have signature verification
        // So we'll send the event with a special mock header
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Mock-Stripe-Event': 'true', // Flag to bypass signature check
            },
            body: JSON.stringify(event),
        });

        if (response.ok) {
            // console.log(`✅ Mock webhook sent: ${event.type}`);
        } else {
            console.error(`❌ Mock webhook failed with status ${response.status}`);
        }
    } catch (error) {
        console.error(`❌ Mock webhook error:`, error);
    }
}


export class MockStripeClient implements IStripeClient {
    accounts = {
        /**
         * Create a mock Stripe Connect account
         */
        create: async (params: {
            type: 'express' | 'standard' | 'custom';
            country?: string;
            email?: string;
            capabilities?: any;
            metadata?: Record<string, string>;
        }): Promise<StripeAccount> => {
            // Generate mock account ID
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 8);
            const accountId = `acct_mock_${timestamp}_${random}`;

            // Create mock account object
            const account: StripeAccount = {
                id: accountId,
                object: 'account',
                type: params.type,
                country: params.country || 'US',
                email: params.email || 'mock@example.com',
                details_submitted: false, // Starts as not submitted
                payouts_enabled: false,
                charges_enabled: false,
                capabilities: params.capabilities,
                metadata: params.metadata,
                created: Math.floor(Date.now() / 1000),
            };

            // Store in memory
            mockAccounts.set(accountId, account);

            // Auto-approve after delay if configured
            if (process.env.MOCK_STRIPE_AUTO_APPROVE === 'true') {
                setTimeout(() => {
                    const acc = mockAccounts.get(accountId);
                    if (acc) {
                        acc.details_submitted = true;
                        acc.payouts_enabled = true;
                        acc.charges_enabled = true;
                        mockAccounts.set(accountId, acc);
                    }
                }, 2000); // Auto-approve after 2 seconds
            }


            return account;
        },

        /**
         * Retrieve a mock Stripe account
         */
        retrieve: async (accountId: string): Promise<StripeAccount> => {
            const account = mockAccounts.get(accountId);

            if (!account) {
                throw new Error(`[MockStripe] Account not found: ${accountId}`);
            }


            return account;
        },
    };

    accountLinks = {
        /**
         * Create a mock account onboarding link
         */
        create: async (params: {
            account: string;
            refresh_url: string;
            return_url: string;
            type: 'account_onboarding' | 'account_update';
        }): Promise<StripeAccountLink> => {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

            // Create mock onboarding URL
            const mockOnboardingUrl = `${frontendUrl}/dev/stripe-mock-onboarding?` +
                `account_id=${params.account}&` +
                `return_url=${encodeURIComponent(params.return_url)}&` +
                `refresh_url=${encodeURIComponent(params.refresh_url)}`;

            const accountLink: StripeAccountLink = {
                object: 'account_link',
                created: Math.floor(Date.now() / 1000),
                expires_at: Math.floor(Date.now() / 1000) + 300, // Expires in 5 minutes
                url: mockOnboardingUrl,
            };



            return accountLink;
        },
    };

    checkout = {
        sessions: {
            /**
             * Create a mock checkout session
             */
            create: async (params: {
                mode: 'payment' | 'subscription';
                payment_method_types?: string[];
                line_items?: any[];
                success_url: string;
                cancel_url: string;
                metadata?: Record<string, string>;
            }): Promise<StripeCheckoutSession> => {
                const sessionId = `cs_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

                // Calculate total amount
                let amount_total = 0;
                if (params.line_items && params.line_items.length > 0) {
                    params.line_items.forEach(item => {
                        if (item.price_data) {
                            amount_total += item.price_data.unit_amount * (item.quantity || 1);
                        }
                    });
                }

                const session: StripeCheckoutSession = {
                    id: sessionId,
                    object: 'checkout.session',
                    url: `${frontendUrl}/dev/stripe-mock-checkout?session_id=${sessionId}&amount=${amount_total}`,
                    payment_status: 'paid', // Mock payment is always successful
                    status: 'complete',
                    amount_total,
                    currency: 'usd',
                    metadata: params.metadata,
                };

                // Store session
                mockSessions.set(sessionId, session);

                // 🆕 AUTO-TRIGGER WEBHOOK after a small delay (simulating async payment)
                setTimeout(async () => {
                    console.log(`🧪 Triggering mock webhook for session ${sessionId}`);
                    await simulateWebhook({
                        type: 'checkout.session.completed',
                        data: { object: session },
                    });
                }, 1000); // 1000ms delay to simulate real payment processing

                return session;
            },


            /**
             * Retrieve a mock checkout session
             */
            retrieve: async (sessionId: string): Promise<StripeCheckoutSession> => {
                const session = mockSessions.get(sessionId);
                if (!session) {
                    throw new Error(`[MockStripe] Session not found: ${sessionId}`);
                }
                return session;
            },


        },
    };
}

/**
 * Helper function to manually approve a mock account
 * (Can be called from tests or development tools)
 */
export function approveMockAccount(accountId: string): void {
    const account = mockAccounts.get(accountId);
    if (account) {
        account.details_submitted = true;
        account.payouts_enabled = true;
        account.charges_enabled = true;
        mockAccounts.set(accountId, account);

    }
}

/**
 * Helper to get all mock accounts (for debugging)
 */
export function getAllMockAccounts(): Map<string, StripeAccount> {
    return mockAccounts;
}
