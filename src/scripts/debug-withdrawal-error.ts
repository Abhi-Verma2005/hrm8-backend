
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const withdrawalId = '98dbc091-73f9-4c6c-b97c-fe94c870172e';

async function checkWithdrawal() {
    console.log(`🔍 Checking withdrawal: ${withdrawalId}`);

    const withdrawal = await prisma.commissionWithdrawal.findUnique({
        where: { id: withdrawalId }
    });

    if (!withdrawal) {
        console.error('❌ Withdrawal not found!');
        return;
    }

    console.log('withdrawal:', withdrawal);

    const consultant = await prisma.consultant.findUnique({
        where: { id: (withdrawal as any).consultant_id }
    });

    if (!consultant) {
        console.error('❌ Consultant not found!');
        return;
    }

    console.log('consultant:', {
        id: consultant.id,
        email: consultant.email,
        stripe_account_id: consultant.stripe_account_id,
        payout_enabled: consultant.payout_enabled
    });

    if (withdrawal.status !== 'APPROVED') {
        console.error(`❌ Status is ${withdrawal.status}, expected APPROVED`);
    }

    if (!consultant.stripe_account_id) {
        console.error('❌ No Stripe Account ID connected');
    }

    if (!consultant.payout_enabled) {
        console.error('❌ Payouts NOT enabled for this consultant');
    }
}

checkWithdrawal()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
