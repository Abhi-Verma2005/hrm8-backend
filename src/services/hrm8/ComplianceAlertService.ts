/**
 * Compliance Alert Service
 * Detects and reports compliance issues for licensees and regions
 */

import prisma from '../../lib/prisma';
import { subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface ComplianceAlert {
    id: string;
    type: 'OVERDUE_PAYOUT' | 'INACTIVE_REGION' | 'REVENUE_DECLINE' | 'EXPIRED_AGREEMENT';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    entityType: 'LICENSEE' | 'REGION';
    entityId: string;
    entityName: string;
    title: string;
    description: string;
    value?: number;
    threshold?: number;
    detectedAt: Date;
}

export class ComplianceAlertService {
    /**
     * Get all active compliance alerts
     */
    static async getAllAlerts(): Promise<ComplianceAlert[]> {
        const alerts: ComplianceAlert[] = [];

        // Check for overdue payouts
        const overduePayouts = await this.getOverduePayouts(30);
        alerts.push(...overduePayouts);

        // Check for inactive regions
        const inactiveRegions = await this.getInactiveRegions(60);
        alerts.push(...inactiveRegions);

        // Check for revenue declines
        const revenueDeclines = await this.getRevenueDeclines(20);
        alerts.push(...revenueDeclines);

        // Check for expired agreements
        const expiredAgreements = await this.getExpiredAgreements();
        alerts.push(...expiredAgreements);

        // Sort by severity
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return alerts;
    }

    /**
     * Get licensees with overdue payouts
     */
    static async getOverduePayouts(thresholdDays: number = 30): Promise<ComplianceAlert[]> {
        const thresholdDate = subDays(new Date(), thresholdDays);

        const overdueSettlements = await prisma.settlement.findMany({
            where: {
                status: 'PENDING',
                generated_at: { lte: thresholdDate },
            },
            include: {
                licensee: true,
            },
        });

        return overdueSettlements.map((settlement) => {
            const daysOverdue = Math.floor(
                (new Date().getTime() - settlement.generated_at.getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
                id: `overdue-${settlement.id}`,
                type: 'OVERDUE_PAYOUT' as const,
                severity: daysOverdue > 60 ? 'CRITICAL' : daysOverdue > 45 ? 'HIGH' : 'MEDIUM',
                entityType: 'LICENSEE' as const,
                entityId: settlement.licensee_id,
                entityName: settlement.licensee?.name || 'Unknown',
                title: 'Overdue Payout',
                description: `Settlement of $${settlement.licensee_share.toLocaleString()} is ${daysOverdue} days overdue`,
                value: settlement.licensee_share,
                threshold: thresholdDays,
                detectedAt: new Date(),
            };
        });
    }

    /**
     * Get inactive regions (no placements in X days)
     */
    static async getInactiveRegions(thresholdDays: number = 60): Promise<ComplianceAlert[]> {
        const thresholdDate = subDays(new Date(), thresholdDays);

        // Get regions with licensees that have no recent placements
        const regions = await prisma.region.findMany({
            where: {
                is_active: true,
                licensee_id: { not: null },
            },
            select: {
                id: true,
                name: true,
                licensee: { select: { name: true } },
            },
        });

        const alerts: ComplianceAlert[] = [];

        for (const region of regions) {
            // Check for recent placements (commissions)
            const recentPlacements = await prisma.commission.count({
                where: {
                    region_id: region.id,
                    type: 'PLACEMENT',
                    created_at: { gte: thresholdDate },
                },
            });

            if (recentPlacements === 0) {
                alerts.push({
                    id: `inactive-${region.id}`,
                    type: 'INACTIVE_REGION',
                    severity: 'MEDIUM',
                    entityType: 'REGION',
                    entityId: region.id,
                    entityName: region.name,
                    title: 'Inactive Region',
                    description: `No placements in the last ${thresholdDays} days`,
                    value: 0,
                    threshold: thresholdDays,
                    detectedAt: new Date(),
                });
            }
        }

        return alerts;
    }

    /**
     * Get regions with significant revenue decline
     */
    static async getRevenueDeclines(thresholdPercent: number = 20): Promise<ComplianceAlert[]> {
        const now = new Date();
        const lastMonth = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));
        const twoMonthsAgo = startOfMonth(subMonths(now, 2));
        const twoMonthsAgoEnd = endOfMonth(subMonths(now, 2));

        // Get regions with licensees
        const regions = await prisma.region.findMany({
            where: {
                is_active: true,
                licensee_id: { not: null },
            },
            select: {
                id: true,
                name: true,
                licensee: { select: { name: true } },
            },
        });

        const alerts: ComplianceAlert[] = [];

        for (const region of regions) {
            // Get revenue for last month and month before
            const [lastMonthRevenue, twoMonthsAgoRevenue] = await Promise.all([
                prisma.regionalRevenue.aggregate({
                    where: {
                        region_id: region.id,
                        period_start: { gte: lastMonth, lte: lastMonthEnd },
                    },
                    _sum: { total_revenue: true },
                }),
                prisma.regionalRevenue.aggregate({
                    where: {
                        region_id: region.id,
                        period_start: { gte: twoMonthsAgo, lte: twoMonthsAgoEnd },
                    },
                    _sum: { total_revenue: true },
                }),
            ]);

            const current = lastMonthRevenue._sum.total_revenue || 0;
            const previous = twoMonthsAgoRevenue._sum.total_revenue || 0;

            if (previous > 0) {
                const declinePercent = ((previous - current) / previous) * 100;

                if (declinePercent >= thresholdPercent) {
                    alerts.push({
                        id: `decline-${region.id}`,
                        type: 'REVENUE_DECLINE',
                        severity: declinePercent > 40 ? 'HIGH' : 'MEDIUM',
                        entityType: 'REGION',
                        entityId: region.id,
                        entityName: region.name,
                        title: 'Revenue Decline',
                        description: `Revenue dropped ${declinePercent.toFixed(1)}% from $${previous.toLocaleString()} to $${current.toLocaleString()}`,
                        value: declinePercent,
                        threshold: thresholdPercent,
                        detectedAt: new Date(),
                    });
                }
            }
        }

        return alerts;
    }

    /**
     * Get licensees with expired or expiring agreements
     */
    static async getExpiredAgreements(): Promise<ComplianceAlert[]> {
        const now = new Date();
        const thirtyDaysFromNow = subDays(now, -30);

        const licensees = await prisma.regionalLicensee.findMany({
            where: {
                status: 'ACTIVE',
                agreement_end_date: { lte: thirtyDaysFromNow },
            },
        });

        return licensees.map((licensee) => {
            const isExpired = licensee.agreement_end_date && licensee.agreement_end_date < now;
            const daysUntil = licensee.agreement_end_date
                ? Math.floor((licensee.agreement_end_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : 0;

            return {
                id: `agreement-${licensee.id}`,
                type: 'EXPIRED_AGREEMENT' as const,
                severity: isExpired ? 'CRITICAL' : daysUntil < 7 ? 'HIGH' : 'MEDIUM',
                entityType: 'LICENSEE' as const,
                entityId: licensee.id,
                entityName: licensee.name,
                title: isExpired ? 'Agreement Expired' : 'Agreement Expiring Soon',
                description: isExpired
                    ? `Agreement expired ${Math.abs(daysUntil)} days ago`
                    : `Agreement expires in ${daysUntil} days`,
                detectedAt: new Date(),
            };
        });
    }

    /**
     * Get alert summary counts
     */
    static async getAlertSummary(): Promise<{
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
        byType: Record<string, number>;
    }> {
        const alerts = await this.getAllAlerts();

        const summary = {
            total: alerts.length,
            critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
            high: alerts.filter((a) => a.severity === 'HIGH').length,
            medium: alerts.filter((a) => a.severity === 'MEDIUM').length,
            low: alerts.filter((a) => a.severity === 'LOW').length,
            byType: {} as Record<string, number>,
        };

        alerts.forEach((alert) => {
            summary.byType[alert.type] = (summary.byType[alert.type] || 0) + 1;
        });

        return summary;
    }
}
