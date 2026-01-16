/**
 * Create Sample Audit History Entries
 * Run: npx ts-node scripts/seed_audit_history.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('\n📝 Seeding Audit History Entries\n');

    try {
        // Get a licensee
        const licensees = await prisma.regionalLicensee.findMany({ take: 3 });

        if (licensees.length === 0) {
            console.log('❌ No licensees found');
            return;
        }

        console.log(`Found ${licensees.length} licensees to seed audit entries for\n`);

        for (const licensee of licensees) {
            console.log(`📋 Seeding for: ${licensee.name}`);

            // Create audit entries
            const entries = [
                {
                    entity_type: 'LICENSEE',
                    entity_id: licensee.id,
                    action: 'CREATE',
                    performed_by: 'admin@hrm8.com',
                    notes: 'Licensee created during initial setup',
                    new_value: {
                        name: licensee.name,
                        status: 'ACTIVE',
                        revenueSharePercent: licensee.revenue_share_percent,
                    },
                    performed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                },
                {
                    entity_type: 'LICENSEE',
                    entity_id: licensee.id,
                    action: 'UPDATE',
                    performed_by: 'admin@hrm8.com',
                    notes: 'Updated revenue share percentage',
                    old_value: { revenueSharePercent: 15 },
                    new_value: { revenueSharePercent: licensee.revenue_share_percent },
                    performed_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
                },
                {
                    entity_type: 'LICENSEE',
                    entity_id: licensee.id,
                    action: 'SUSPEND',
                    performed_by: 'compliance@hrm8.com',
                    notes: 'Suspended pending compliance review',
                    old_value: { status: 'ACTIVE' },
                    new_value: { status: 'SUSPENDED' },
                    performed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
                },
                {
                    entity_type: 'LICENSEE',
                    entity_id: licensee.id,
                    action: 'REACTIVATE',
                    performed_by: 'admin@hrm8.com',
                    notes: 'Compliance review passed, reactivating',
                    old_value: { status: 'SUSPENDED' },
                    new_value: { status: 'ACTIVE' },
                    performed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                },
            ];

            for (const entry of entries) {
                await prisma.auditLog.create({ data: entry });
            }

            console.log(`   ✅ Created ${entries.length} audit entries`);
        }

        // Get regions and create entries
        const regions = await prisma.region.findMany({ take: 2 });

        for (const region of regions) {
            console.log(`📋 Seeding for region: ${region.name}`);

            await prisma.auditLog.create({
                data: {
                    entity_type: 'REGION',
                    entity_id: region.id,
                    action: 'CREATE',
                    performed_by: 'admin@hrm8.com',
                    notes: 'Region created',
                    new_value: { name: region.name, code: region.code },
                    performed_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
                },
            });

            if (region.licensee_id) {
                await prisma.auditLog.create({
                    data: {
                        entity_type: 'REGION',
                        entity_id: region.id,
                        action: 'ASSIGN_REGION',
                        performed_by: 'admin@hrm8.com',
                        notes: 'Assigned to licensee',
                        new_value: { licenseeId: region.licensee_id },
                        performed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                    },
                });
            }

            console.log(`   ✅ Created region audit entries`);
        }

        // Summary
        const totalLogs = await prisma.auditLog.count();
        console.log(`\n📊 Total Audit Logs: ${totalLogs}`);
        console.log('\n✅ Seeding Complete!\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
