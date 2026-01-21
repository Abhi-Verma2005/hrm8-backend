# Commission Flow E2E Test

This test script validates the entire commission flow from lead creation to commission payment.

## What It Tests

### Test 1: Sales Agent Commission Flow
1. Creates a sales agent in India region
2. Logs in as sales agent
3. Creates a lead
4. Converts lead to company
5. Company posts a job and pays
6. Verifies sales agent receives commission

### Test 2: Consultant 360 Commission Flow
1. Creates a consultant 360 (handles both sales AND recruitment)
2. Same flow as Test 1
3. Verifies consultant 360 receives sales commission at payment time
4. (Recruitment commission would be paid later when candidate is hired)

## Prerequisites

- Backend server running on `http://localhost:3000` (or set `BACKEND_URL` env var)
- India region must exist in database with code `IN`
- Mock Stripe should be enabled (`NODE_ENV=development` or `USE_MOCK_STRIPE=true`)

## Running the Test

```bash
# From backend directory
cd /Users/abhishekverma/Desktop/Cluster/Projects/hrm8/backend

# Run the test
ts-node scripts/test-commission-flow-e2e.ts
```

## Expected Output

```
🧪 TEST 1: SALES AGENT COMMISSION FLOW
✅ Sales Agent created
✅ Logged in successfully
✅ Lead created
✅ Lead converted to Company
✅ Company logged in
✅ Job created
✅ Checkout session created
✅ Commission Found:
   Type: SUBSCRIPTION_SALE
   Amount: $599
   Status: CONFIRMED
🎉 TEST 1 PASSED

🧪 TEST 2: CONSULTANT 360 COMMISSION FLOW
✅ Consultant 360 created
...
🎉 TEST 2 PASSED

✅ ALL TESTS PASSED!
```

## What Gets Validated

- [x] Sales commission created automatically via webhook
- [x] Commission amount calculated correctly (10% of service fee)
- [x] Commission status is CONFIRMED
- [x] Commission linked to correct consultant and job
- [x] Consultant 360 receives same commission flow as Sales Agent
- [x] Mock webhook simulation triggers correctly

##  Troubleshooting

**Error: "India region not found"**
- Run: `ts-node scripts/create-global-region.ts` to create regions

**Error: "Mock webhook failed"**
- Ensure backend is running on the correct port
- Check that `USE_MOCK_STRIPE=true` in your `.env`

**No commission created**
- Check backend logs for webhook processing
- Look for: `🧪 Processing mock Stripe webhook`
- Verify `processSalesCommission` was called
