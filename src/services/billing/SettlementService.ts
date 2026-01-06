/**
 * Settlement Service
 * Handles licensee settlement generation and payout tracking
 */

import prisma from '../../lib/prisma';
import { endOfMonth } from 'date-fns';

export interface SettlementData {
    id: string;
    licenseeId: string;
    periodStart: Date;
    periodEnd: Date;
    totalRevenue: number;
    licenseeShare: number;
    hrm8Share: number;
    status: string;
    paymentDate: Date | null;
    reference: string | null;
    generatedAt: Date;
}

export interface GenerateSettlementResult {
    success: boolean;
    settlement?: SettlementData;
    error?: string;
    revenueRecordsIncluded?: number;
}

export class SettlementService {
    /**
     * Generate a settlement for a licensee covering all pending revenue
     */
    static async generateSettlement(
        licenseeId: string,
        periodEnd: Date
    ): Promise<GenerateSettlementResult> {
        try {
            // Get all pending revenue records for this licensee up to period end
            const pendingRevenues = await prisma.regionalRevenue.findMany({
                where: {
                    licensee_id: licenseeId,
                    status: 'PENDING',
                    period_end: { lte: endOfMonth(periodEnd) },
                },
                orderBy: { period_start: 'asc' },
            });

            if (pendingRevenues.length === 0) {
                return { success: false, error: 'No pending revenue to settle' };
            }

            // Calculate totals
            const totalRevenue = pendingRevenues.reduce((sum, r) => sum + r.total_revenue, 0);
            const licenseeShare = pendingRevenues.reduce((sum, r) => sum + r.licensee_share, 0);
            const hrm8Share = pendingRevenues.reduce((sum, r) => sum + r.hrm8_share, 0);

            // Get earliest and latest periods
            const periodStart = pendingRevenues[0].period_start;
            const actualPeriodEnd = pendingRevenues[pendingRevenues.length - 1].period_end;

            // Create settlement in transaction
            const settlement = await prisma.$transaction(async (tx) => {
                // Create settlement record
                const newSettlement = await tx.settlement.create({
                    data: {
                        licensee_id: licenseeId,
                        period_start: periodStart,
                        period_end: actualPeriodEnd,
                        total_revenue: Math.round(totalRevenue * 100) / 100,
                        licensee_share: Math.round(licenseeShare * 100) / 100,
                        hrm8_share: Math.round(hrm8Share * 100) / 100,
                        status: 'PENDING',
                        generated_at: new Date(),
                    },
                });

                // Mark revenue records as included in settlement
                // Note: We're not marking them PAID yet - that happens when settlement is paid
                await tx.regionalRevenue.updateMany({
                    where: {
                        id: { in: pendingRevenues.map((r) => r.id) },
                    },
                    data: {
                        status: 'PENDING', // Keep as pending until settlement is paid
                    },
                });

                return newSettlement;
            });

            return {
                success: true,
                settlement: this.mapToSettlement(settlement),
                revenueRecordsIncluded: pendingRevenues.length,
            };
        } catch (error: any) {
            console.error('Generate settlement error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Mark settlement as paid and update related revenue records
     */
    static async markSettlementPaid(
        settlementId: string,
        paymentReference: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const settlement = await prisma.settlement.findUnique({
                where: { id: settlementId },
            });

            if (!settlement) {
                return { success: false, error: 'Settlement not found' };
            }

            if (settlement.status === 'PAID') {
                return { success: false, error: 'Settlement already paid' };
            }

            await prisma.$transaction(async (tx) => {
                // Update settlement status
                await tx.settlement.update({
                    where: { id: settlementId },
                    data: {
                        status: 'PAID',
                        payment_date: new Date(),
                        reference: paymentReference,
                    },
                });

                // Mark all revenue records for this licensee/period as PAID
                await tx.regionalRevenue.updateMany({
                    where: {
                        licensee_id: settlement.licensee_id,
                        period_start: { gte: settlement.period_start },
                        period_end: { lte: settlement.period_end },
                        status: 'PENDING',
                    },
                    data: {
                        status: 'PAID',
                        paid_at: new Date(),
                    },
                });
            });

            return { success: true };
        } catch (error: any) {
            console.error('Mark settlement paid error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get pending settlements
     */
    static async getPendingSettlements(licenseeId?: string): Promise<SettlementData[]> {
        const settlements = await prisma.settlement.findMany({
            where: {
                status: 'PENDING',
                ...(licenseeId && { licensee_id: licenseeId }),
            },
            orderBy: { generated_at: 'desc' },
        });

        return settlements.map(this.mapToSettlement);
    }

    /**
     * Get all settlements for a licensee
     */
    static async getSettlementsByLicensee(
        licenseeId: string,
        options?: { limit?: number; status?: string }
    ): Promise<SettlementData[]> {
        const settlements = await prisma.settlement.findMany({
            where: {
                licensee_id: licenseeId,
                ...(options?.status && { status: options.status }),
            },
            orderBy: { period_end: 'desc' },
            take: options?.limit || 24,
        });

        return settlements.map(this.mapToSettlement);
    }

    /**
     * Get settlement by ID
     */
    static async getSettlementById(settlementId: string): Promise<SettlementData | null> {
        const settlement = await prisma.settlement.findUnique({
            where: { id: settlementId },
        });

        return settlement ? this.mapToSettlement(settlement) : null;
    }

    /**
     * Generate settlements for all licensees with pending revenue
     */
    static async generateAllPendingSettlements(periodEnd: Date): Promise<{
        generated: number;
        errors: string[];
    }> {
        // Get licensees with pending revenue
        const licenseesWithRevenue = await prisma.regionalRevenue.groupBy({
            by: ['licensee_id'],
            where: {
                licensee_id: { not: null },
                status: 'PENDING',
                period_end: { lte: endOfMonth(periodEnd) },
            },
        });

        const errors: string[] = [];
        let generated = 0;

        for (const item of licenseesWithRevenue) {
            if (!item.licensee_id) continue;

            const result = await this.generateSettlement(item.licensee_id, periodEnd);
            if (result.success) {
                generated++;
                console.log(`✅ Generated settlement for licensee ${item.licensee_id}`);
            } else {
                errors.push(`Licensee ${item.licensee_id}: ${result.error}`);
            }
        }

        return { generated, errors };
    }

    /**
     * Get settlement summary statistics
     */
    static async getSettlementStats(): Promise<{
        totalPending: number;
        totalPaid: number;
        pendingAmount: number;
        paidAmount: number;
    }> {
        const [pending, paid] = await Promise.all([
            prisma.settlement.aggregate({
                where: { status: 'PENDING' },
                _count: true,
                _sum: { licensee_share: true },
            }),
            prisma.settlement.aggregate({
                where: { status: 'PAID' },
                _count: true,
                _sum: { licensee_share: true },
            }),
        ]);

        return {
            totalPending: pending._count || 0,
            totalPaid: paid._count || 0,
            pendingAmount: pending._sum.licensee_share || 0,
            paidAmount: paid._sum.licensee_share || 0,
        };
    }

    private static mapToSettlement(prismaSettlement: any): SettlementData {
        return {
            id: prismaSettlement.id,
            licenseeId: prismaSettlement.licensee_id,
            periodStart: prismaSettlement.period_start,
            periodEnd: prismaSettlement.period_end,
            totalRevenue: prismaSettlement.total_revenue,
            licenseeShare: prismaSettlement.licensee_share,
            hrm8Share: prismaSettlement.hrm8_share,
            status: prismaSettlement.status,
            paymentDate: prismaSettlement.payment_date,
            reference: prismaSettlement.reference,
            generatedAt: prismaSettlement.generated_at,
        };
    }
}
