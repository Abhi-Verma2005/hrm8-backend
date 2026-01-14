/**
 * Script to credit wallet balance for a company
 * Usage: ts-node scripts/creditWallet.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function creditWallet() {
    const email = 'abhishek.verma2024@nst.rishihood.edu.in';
    const creditAmount = 2000;

    try {
        // Find user by email
        const user = await prisma.user.findFirst({
            where: { email },
            select: { id: true, company_id: true, email: true, name: true }
        });

        if (!user) {
            console.error(`❌ User not found with email: ${email}`);
            process.exit(1);
        }

        console.log(`✅ Found user: ${user.name} (${user.email})`);
        console.log(`📊 Company ID: ${user.company_id}`);

        // Get or create virtual account for the company
        let virtualAccount = await prisma.virtualAccount.findFirst({
            where: {
                owner_type: 'COMPANY',
                owner_id: user.company_id
            }
        });

        if (!virtualAccount) {
            console.log('📝 Creating new virtual account...');
            virtualAccount = await prisma.virtualAccount.create({
                data: {
                    owner_type: 'COMPANY',
                    owner_id: user.company_id,
                    balance: 0,
                    total_credits: 0,
                    total_debits: 0,
                    status: 'ACTIVE'
                }
            });
            console.log(`✅ Created virtual account: ${virtualAccount.id}`);
        } else {
            console.log(`✅ Found existing virtual account: ${virtualAccount.id}`);
            console.log(`💰 Current balance: $${virtualAccount.balance}`);
        }

        // Calculate new balance
        const newBalance = virtualAccount.balance + creditAmount;
        const newTotalCredits = virtualAccount.total_credits + creditAmount;

        // Update account balance
        const updatedAccount = await prisma.virtualAccount.update({
            where: { id: virtualAccount.id },
            data: {
                balance: newBalance,
                total_credits: newTotalCredits
            }
        });

        // Create transaction record
        const transaction = await prisma.virtualTransaction.create({
            data: {
                virtual_account_id: virtualAccount.id,
                type: 'ADMIN_ADJUSTMENT',
                amount: creditAmount,
                balance_after: newBalance,
                direction: 'CREDIT',
                description: `Admin credit: Wallet recharge for ${email}`,
                status: 'COMPLETED',
                created_by: user.id
            }
        });

        console.log('\n✨ SUCCESS! Wallet credited successfully:');
        console.log(`💵 Amount credited: $${creditAmount}`);
        console.log(`💰 Previous balance: $${virtualAccount.balance}`);
        console.log(`💰 New balance: $${newBalance}`);
        console.log(`📝 Transaction ID: ${transaction.id}`);
        console.log(`\n🎉 User ${email} can now use their wallet!`);

    } catch (error) {
        console.error('❌ Error crediting wallet:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
creditWallet()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
