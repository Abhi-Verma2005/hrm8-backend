/**
 * Seed Pricing Products for HRM8 Platform
 * 
 * Creates the 6 ATS subscription tiers based on HRM8 Pricing Model v6.3:
 * - ATS_LITE (FREE)
 * - PAYG (Pay As You Go - $195/job)
 * - SMALL ($295/month, 5 jobs)
 * - MEDIUM ($495/month, 25 jobs)
 * - LARGE ($695/month, 50 jobs)
 * - ENTERPRISE ($995/month, unlimited jobs)
 * 
 * Run with: pnpm tsx src/scripts/seed-pricing-products.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRICING_PRODUCTS = [
    {
        code: 'ATS_LITE',
        name: 'ATS Lite',
        description: 'Free tier with core ATS features and unlimited users',
        category: 'SUBSCRIPTION',
        isActive: true,
        priceTiers: [
            {
                name: 'Free Plan',
                minQuantity: 1,
                maxQuantity: null,
                unitPrice: 0,
                period: 'MONTHLY',
                metadata: {
                    jobQuota: null, // unlimited
                    features: [
                        'Unlimited users',
                        'Unlimited open job postings',
                        'Core ATS features',
                    ],
                },
            },
        ],
    },
    {
        code: 'ATS_PAYG',
        name: 'Pay As You Go',
        description: 'Pay per job posting - no subscription required',
        category: 'SUBSCRIPTION',
        isActive: true,
        priceTiers: [
            {
                name: 'Per Job',
                minQuantity: 1,
                maxQuantity: null,
                unitPrice: 195,
                period: 'ONE_TIME',
                metadata: {
                    jobQuota: null, // unlimited, but charged per job
                    features: [
                        'Unlimited users',
                        'Pay per job posted',
                        'AI Screening & Matching',
                        'Custom Application Forms',
                        'Team Collaboration',
                        'Dedicated Talent Pool',
                        'Branded Corporate Careers Page',
                        'Location & Department Manager',
                    ],
                },
            },
        ],
    },
    {
        code: 'ATS_SMALL',
        name: 'Small Plan',
        description: 'Perfect for small teams - 5 job postings per month',
        category: 'SUBSCRIPTION',
        isActive: true,
        priceTiers: [
            {
                name: 'Monthly - Small',
                minQuantity: 1,
                maxQuantity: null,
                unitPrice: 295,
                period: 'MONTHLY',
                metadata: {
                    jobQuota: 5,
                    features: [
                        'Unlimited users',
                        '5 open job postings',
                        'All PAYG features',
                        'Multi-Post Job Board Marketplace (additional charges)',
                        'Direct Job Board Integration (additional charges)',
                        'Standard Reports & Analytics',
                    ],
                },
            },
        ],
    },
    {
        code: 'ATS_MEDIUM',
        name: 'Medium Plan',
        description: 'For growing companies - 25 job postings per month',
        category: 'SUBSCRIPTION',
        isActive: true,
        priceTiers: [
            {
                name: 'Monthly - Medium',
                minQuantity: 1,
                maxQuantity: null,
                unitPrice: 495,
                period: 'MONTHLY',
                metadata: {
                    jobQuota: 25,
                    features: [
                        'Unlimited users',
                        '25 open job postings',
                        'All Small plan features',
                        'Advanced Reports & Analytics',
                    ],
                },
            },
        ],
    },
    {
        code: 'ATS_LARGE',
        name: 'Large Plan',
        description: 'For larger organizations - 50 job postings per month',
        category: 'SUBSCRIPTION',
        isActive: true,
        priceTiers: [
            {
                name: 'Monthly - Large',
                minQuantity: 1,
                maxQuantity: null,
                unitPrice: 695,
                period: 'MONTHLY',
                metadata: {
                    jobQuota: 50,
                    features: [
                        'Unlimited users',
                        '50 open job postings',
                        'All Medium plan features',
                        'Priority support',
                    ],
                },
            },
        ],
    },
    {
        code: 'ATS_ENTERPRISE',
        name: 'Enterprise Plan',
        description: 'Unlimited job postings with all features',
        category: 'SUBSCRIPTION',
        isActive: true,
        priceTiers: [
            {
                name: 'Monthly - Enterprise',
                minQuantity: 1,
                maxQuantity: null,
                unitPrice: 995,
                period: 'MONTHLY',
                metadata: {
                    jobQuota: null, // unlimited
                    features: [
                        'Unlimited users',
                        'Unlimited open job postings',
                        'All Large plan features',
                        'Division Manager',
                        'Advanced Reports & Analytics',
                        'Dedicated account manager',
                        '24/7 priority support',
                    ],
                },
            },
        ],
    },
];

async function main() {
    console.log('🌱 Seeding pricing products...\n');

    try {
        // Create a global price book if it doesn't exist
        let globalPriceBook = await prisma.priceBook.findFirst({
            where: { is_global: true },
        });

        if (!globalPriceBook) {
            globalPriceBook = await prisma.priceBook.create({
                data: {
                    name: 'Global HRM8 Pricing',
                    description: 'Default global pricing for all HRM8 products',
                    is_global: true,
                    currency: 'USD',
                    is_active: true,
                },
            });
            console.log('✓ Created global price book');
        } else {
            console.log('✓ Global price book already exists');
        }

        // Create products and tiers
        for (const productData of PRICING_PRODUCTS) {
            const { priceTiers, ...productInfo } = productData;

            // Check if product already exists
            let product = await prisma.product.findUnique({
                where: { code: productInfo.code },
            });

            if (product) {
                console.log(`⏭️  Product ${productInfo.name} already exists, skipping...`);
                continue;
            }

            // Create product
            product = await prisma.product.create({
                data: {
                    code: productInfo.code,
                    name: productInfo.name,
                    description: productInfo.description,
                    category: productInfo.category,
                    is_active: productInfo.isActive,
                },
            });

            console.log(`✓ Created product: ${product.name} (${product.code})`);

            // Create price tiers
            for (const tierData of priceTiers) {
                await prisma.priceTier.create({
                    data: {
                        price_book_id: globalPriceBook.id,
                        product_id: product.id,
                        name: tierData.name,
                        min_quantity: tierData.minQuantity,
                        max_quantity: tierData.maxQuantity,
                        unit_price: tierData.unitPrice,
                        period: tierData.period,
                    },
                });

                console.log(
                    `  ✓ Created tier: ${tierData.name} - $${tierData.unitPrice}/${tierData.period.toLowerCase()}`
                );
            }
        }

        console.log('\n✅ Pricing products seeded successfully!');
        console.log('\nCreated products:');
        console.log('  1. ATS Lite - FREE');
        console.log('  2. Pay As You Go - $195/job');
        console.log('  3. Small Plan - $295/month (5 jobs)');
        console.log('  4. Medium Plan - $495/month (25 jobs)');
        console.log('  5. Large Plan - $695/month (50 jobs)');
        console.log('  6. Enterprise Plan - $995/month (unlimited jobs)');

    } catch (error) {
        console.error('❌ Error seeding pricing products:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
