/**
 * Regional Revenue Service
 * Calculates and tracks revenue per region for licensee revenue sharing
 */

import prisma from '../../lib/prisma';
import { RevenueStatus } from '@prisma/client';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface RegionalRevenueData {
    id: string;
    regionId: string;
    licenseeId: string | null;
    periodStart: Date;
    periodEnd: Date;
    totalRevenue: number;
    licenseeShare: number;
    hrm8Share: number;
    status: RevenueStatus;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface RevenueBreakdown {
    subscriptionRevenue: number;
    jobPaymentRevenue: number;
    totalRevenue: number;
    licenseeSharePercent: number;
    licenseeShare: number;
    hrm8Share: number;
}

export class RegionalRevenueService {
    /**
     * Calculate monthly revenue for a specific region
     */
    static async calculateMonthlyRevenue(
        regionId: string,
        month: Date
    ): Promise<RevenueBreakdown | null> {
        const periodStart = startOfMonth(month);
        const periodEnd = endOfMonth(month);

        // Get region with licensee info
        const region = await prisma.region.findUnique({
            where: { id: regionId },
            include: { licensee: true },
        });

        if (!region) {
            console.error(`Region ${regionId} not found`);
            return null;
        }

        // Calculate subscription revenue from paid bills
        const subscriptionRevenue = await prisma.bill.aggregate({
            where: {
                company: { region_id: regionId },
                status: 'PAID',
                paid_at: {
                    gte: periodStart,
                    lte: periodEnd,
                },
            },
            _sum: { total_amount: true },
        });

        // Calculate job payment revenue
        const jobPaymentRevenue = await prisma.job.aggregate({
            where: {
                region_id: regionId,
                payment_status: 'PAID',
                payment_completed_at: {
                    gte: periodStart,
                    lte: periodEnd,
                },
            },
            _sum: { payment_amount: true },
        });

        const subRevenue = subscriptionRevenue._sum.total_amount || 0;
        const jobRevenue = jobPaymentRevenue._sum.payment_amount || 0;
        const totalRevenue = subRevenue + jobRevenue;

        // Calculate splits based on licensee agreement
        let licenseeSharePercent = 0;
        if (region.licensee && region.licensee.status === 'ACTIVE') {
            licenseeSharePercent = region.licensee.revenue_share_percent || 0;
        }

        const licenseeShare = Math.round(totalRevenue * (licenseeSharePercent / 100) * 100) / 100;
        const hrm8Share = Math.round((totalRevenue - licenseeShare) * 100) / 100;

        return {
            subscriptionRevenue: subRevenue,
            jobPaymentRevenue: jobRevenue,
            totalRevenue,
            licenseeSharePercent,
            licenseeShare,
            hrm8Share,
        };
    }

    /**
     * Create or update regional revenue record for a month
     */
    static async createOrUpdateMonthlyRevenue(
        regionId: string,
        month: Date
    ): Promise<RegionalRevenueData | null> {
        const periodStart = startOfMonth(month);
        const periodEnd = endOfMonth(month);

        // Get revenue breakdown
        const breakdown = await this.calculateMonthlyRevenue(regionId, month);
        if (!breakdown) {
            return null;
        }

        // Skip if no revenue
        if (breakdown.totalRevenue === 0) {
            console.log(`No revenue for region ${regionId} in ${month.toISOString()}`);
            return null;
        }

        // Get region for licensee ID
        const region = await prisma.region.findUnique({
            where: { id: regionId },
            select: { licensee_id: true },
        });

        // Check for existing record
        const existing = await prisma.regionalRevenue.findFirst({
            where: {
                region_id: regionId,
                period_start: periodStart,
                period_end: periodEnd,
            },
        });

        if (existing) {
            // Update existing record if not already paid
            if (existing.status !== 'PAID') {
                const updated = await prisma.regionalRevenue.update({
                    where: { id: existing.id },
                    data: {
                        total_revenue: breakdown.totalRevenue,
                        licensee_share: breakdown.licenseeShare,
                        hrm8_share: breakdown.hrm8Share,
                    },
                });
                return this.mapToRevenue(updated);
            }
            return this.mapToRevenue(existing);
        }

        // Create new record
        const created = await prisma.regionalRevenue.create({
            data: {
                region_id: regionId,
                licensee_id: region?.licensee_id || null,
                period_start: periodStart,
                period_end: periodEnd,
                total_revenue: breakdown.totalRevenue,
                licensee_share: breakdown.licenseeShare,
                hrm8_share: breakdown.hrm8Share,
                status: 'PENDING',
            },
        });

        return this.mapToRevenue(created);
    }

    /**
     * Process all regions for a given month (for cron job)
     */
    static async processAllRegionsForMonth(month: Date): Promise<{
        processed: number;
        errors: string[];
    }> {
        const regions = await prisma.region.findMany({
            where: { is_active: true },
            select: { id: true, name: true },
        });

        const errors: string[] = [];
        let processed = 0;

        for (const region of regions) {
            try {
                const result = await this.createOrUpdateMonthlyRevenue(region.id, month);
                if (result) {
                    processed++;
                    console.log(`✅ Processed revenue for region ${region.name}: $${result.totalRevenue}`);
                }
            } catch (error: any) {
                errors.push(`Region ${region.name}: ${error.message}`);
                console.error(`❌ Error processing region ${region.name}:`, error);
            }
        }

        return { processed, errors };
    }

    /**
     * Get pending revenue records for a licensee
     */
    static async getPendingRevenue(licenseeId?: string): Promise<RegionalRevenueData[]> {
        const revenues = await prisma.regionalRevenue.findMany({
            where: {
                status: 'PENDING',
                ...(licenseeId && { licensee_id: licenseeId }),
            },
            orderBy: [{ period_end: 'desc' }, { region_id: 'asc' }],
        });

        return revenues.map(this.mapToRevenue);
    }

    /**
     * Get revenue records by region
     */
    static async getRevenueByRegion(
        regionId: string,
        options?: { limit?: number; status?: RevenueStatus }
    ): Promise<RegionalRevenueData[]> {
        const revenues = await prisma.regionalRevenue.findMany({
            where: {
                region_id: regionId,
                ...(options?.status && { status: options.status }),
            },
            orderBy: { period_end: 'desc' },
            take: options?.limit || 12,
        });

        return revenues.map(this.mapToRevenue);
    }

    /**
     * Mark revenue as settled (part of settlement)
     */
    static async markAsSettled(revenueIds: string[]): Promise<number> {
        const result = await prisma.regionalRevenue.updateMany({
            where: {
                id: { in: revenueIds },
                status: 'PENDING',
            },
            data: {
                status: 'PAID',
                paid_at: new Date(),
            },
        });

        return result.count;
    }

    /**
     * Get previous month (helper for cron)
     */
    static getPreviousMonth(): Date {
        return subMonths(new Date(), 1);
    }

    private static mapToRevenue(prismaRevenue: any): RegionalRevenueData {
        return {
            id: prismaRevenue.id,
            regionId: prismaRevenue.region_id,
            licenseeId: prismaRevenue.licensee_id,
            periodStart: prismaRevenue.period_start,
            periodEnd: prismaRevenue.period_end,
            totalRevenue: prismaRevenue.total_revenue,
            licenseeShare: prismaRevenue.licensee_share,
            hrm8Share: prismaRevenue.hrm8_share,
            status: prismaRevenue.status,
            paidAt: prismaRevenue.paid_at,
            createdAt: prismaRevenue.created_at,
            updatedAt: prismaRevenue.updated_at,
        };
    }
}
