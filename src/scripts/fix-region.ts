/**
 * Quick fix: Set region for rishiverse company based on sales agent's region
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRegion() {
    console.log('🔧 Fixing region for rishiverse...\n');

    const company = await prisma.company.findFirst({
        where: {
            name: {
                contains: 'rishiverse',
                mode: 'insensitive'
            }
        },
        include: {
            sales_agent: {
                select: {
                    id: true,
                    email: true,
                    region_id: true
                }
            }
        }
    });

    if (!company) {
        console.log('❌ Company not found');
        return;
    }

    console.log(`Company: ${company.name}`);
    console.log(`Current Region: ${company.region_id || 'NULL'}`);
    console.log(`Sales Agent: ${company.sales_agent?.email}`);
    console.log(`Sales Agent Region: ${company.sales_agent?.region_id || 'NULL'}`);

    if (!company.region_id && company.sales_agent?.region_id) {
        console.log(`\n✅ Setting company region to ${company.sales_agent.region_id}...`);

        await prisma.company.update({
            where: { id: company.id },
            data: {
                region_id: company.sales_agent.region_id
            }
        });

        console.log('✅ Region updated!');
    } else if (!company.sales_agent?.region_id) {
        console.log('\n⚠️  Sales agent has no region. Need to assign a default region.');

        // Get first available region
        const defaultRegion = await prisma.region.findFirst();

        if (defaultRegion) {
            console.log(`Setting both sales agent and company to region: ${defaultRegion.name} (${defaultRegion.id})`);

            await prisma.consultant.update({
                where: { id: company.sales_agent_id! },
                data: { region_id: defaultRegion.id }
            });

            await prisma.company.update({
                where: { id: company.id },
                data: { region_id: defaultRegion.id }
            });

            console.log('✅ Regions updated!');
        } else {
            console.log('❌ No regions found in database!');
        }
    } else {
        console.log('\n✅ Region already set');
    }
}

fixRegion()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
