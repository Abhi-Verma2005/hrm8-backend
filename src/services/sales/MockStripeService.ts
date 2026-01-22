/**
 * Mock Stripe Service
 * Provides mock implementations for Stripe Connect in development mode
 * Use by setting STRIPE_SECRET_KEY=sk_test_mock_development
 */

export class MockStripeService {
    /**
     * Check if running in mock mode
     */
    static isMockMode(): boolean {
        const key = process.env.STRIPE_SECRET_KEY;
        return !key || key === 'sk_test_mock_development' || key.includes('mock');
    }

    /**
     * Mock Create Connect Account
     * @param email - Consultant email
     * @param returnPath - Return path after onboarding (e.g., '/consultant/settings')
     */
    static mockCreateAccount(email: string, returnPath: string = '/consultant/settings'): { accountId: string; onboardingUrl: string } {
        const mockId = `acct_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        console.log(`[MockStripe] Created mock account for ${email}: ${mockId}`);

        const origin = process.env.FRONTEND_URL || 'http://localhost:8080';

        return {
            accountId: mockId,
            onboardingUrl: `${origin}${returnPath}?stripe_success=true`,
        };
    }

    /**
     * Mock Account Status Check
     */
    static mockAccountStatus(): { payoutEnabled: boolean; detailsSubmitted: boolean } {
        console.log('[MockStripe] Returning mock account status');
        return {
            payoutEnabled: true,
            detailsSubmitted: true,
        };
    }

    /**
     * Mock Create Transfer
     */
    static mockCreateTransfer(
        amount: number,
        destination: string,
        description: string
    ): { transferId: string; success: boolean } {
        const transferId = `tr_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        console.log(`[MockStripe] Mock transfer: $${amount / 100} to ${destination}`);
        console.log(`[MockStripe] Description: ${description}`);
        console.log(`[MockStripe] Transfer ID: ${transferId}`);

        return {
            transferId,
            success: true,
        };
    }

    /**
     * Mock Login Link
     */
    static mockLoginLink(): string {
        console.log('[MockStripe] Returning mock dashboard URL');
        return 'http://localhost:8080/mock-stripe-dashboard';
    }

    /**
     * Log mock mode warning
     */
    static logMockWarning(): void {
        console.warn('⚠️  [MockStripe] Running in MOCK MODE - no real Stripe calls will be made');
        console.warn('⚠️  [MockStripe] Set a real STRIPE_SECRET_KEY for production');
    }
}

// Log warning on import if in mock mode
if (MockStripeService.isMockMode()) {
    MockStripeService.logMockWarning();
}
