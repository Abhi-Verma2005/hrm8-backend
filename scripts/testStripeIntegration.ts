/**
 * Stripe Integration Test Script
 * Tests the complete flow of Stripe integration system
 */

import prisma from '../src/lib/prisma';
import { IntegrationStripeService } from '../src/services/integrations/IntegrationStripeService';

async function main() {
  console.log('🧪 Starting Stripe Integration Test...\n');

  try {
    // Step 1: Find a test company
    console.log('📋 Step 1: Finding test company...');
    const company = await prisma.company.findFirst({
      include: { users: { take: 1 } },
    });

    if (!company) {
      console.error('❌ No active company found');
      return;
    }

    console.log(`✅ Found company: ${company.name} (ID: ${company.id})\n`);

    // Step 2: Check if Stripe is already connected
    console.log('📋 Step 2: Checking Stripe connection status...');
    const isConnected = await IntegrationStripeService.hasStripeConnected('COMPANY', company.id);
    console.log(`   Connection status: ${isConnected ? '✅ Connected' : '❌ Not connected'}\n`);

    // Step 3: Get or create Stripe integration
    console.log('📋 Step 3: Creating/Getting Stripe integration...');
    const integration = await IntegrationStripeService.createStripeIntegration('COMPANY', company.id);
    console.log(`✅ Integration created/found:
   - ID: ${integration.id}
   - Type: ${integration.type}
   - Status: ${integration.status}
   - Stripe Account ID: ${integration.stripe_account_id}
   - Stripe Status: ${integration.stripe_account_status}\n`);

    // Step 4: Generate onboarding URL
    console.log('📋 Step 4: Generating onboarding URL...');
    const onboardingUrl = await IntegrationStripeService.getOnboardingUrl(integration.id);
    console.log(`✅ Onboarding URL generated:
   ${onboardingUrl.substring(0, 80)}...\n`);

    // Step 5: Get integration details
    console.log('📋 Step 5: Fetching integration details...');
    const fetchedIntegration = await IntegrationStripeService.getStripeIntegration('COMPANY', company.id);
    console.log(`✅ Integration details:
   - Name: ${fetchedIntegration?.name}
   - Created: ${fetchedIntegration?.created_at.toISOString()}
   - Updated: ${fetchedIntegration?.updated_at.toISOString()}\n`);

    // Step 6: Test hasStripeConnected again
    console.log('📋 Step 6: Re-checking connection status...');
    const stillConnected = await IntegrationStripeService.hasStripeConnected('COMPANY', company.id);
    console.log(`   Connection status: ${stillConnected ? '⚠️  Pending onboarding' : '✅ Test passed (not active yet)'}\n`);

    console.log('✅ All tests passed successfully!\n');
    console.log('⚠️  Note: The Stripe account is in PENDING status until onboarding is completed.');
    console.log('   In production, users would complete onboarding via the URL generated.\n');

    console.log('📊 Summary:');
    console.log(`   - Company: ${company.name}`);
    console.log(`   - Integration ID: ${integration.id}`);
    console.log(`   - Stripe Account: ${integration.stripe_account_id}`);
    console.log(`   - Status: ${integration.stripe_account_status}`);

    // Ask if user wants to clean up
    console.log('\n🧹 To clean up test data, run: npm run test:stripe:cleanup');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
