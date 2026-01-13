/**
 * RevenueService
 * Aggregates revenue data from Bills and Commission tracking
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RevenueSummary {
    totalRevenue: number;
    totalCommissions: number;
    netRevenue: number;
    commissionRate: number;
    billCount: number;
    paidCommissionCount: number;
}

export interface RegionRevenue {
    regionId: string;
    regionName: string;
    revenue: number;
    commissions: number;
    netRevenue: number;
    billCount: number;
    consultantCount: number;
}

export interface CommissionTypeBreakdown {
    type: string;
    amount: number;
    count: number;
    percentage: number;
}

export interface TopConsultant {
    consultantId: string;
    name: string;
    totalCommissions: number;
    commissionCount: number;
    regionId: string;
    regionName: string;
}

export interface RevenueTimelineEntry {
    month: string;
    revenue: number;
    commissions: number;
    netRevenue: number;
    billCount: number;
}

export class RevenueService {
    /**
     * Get comprehensive dashboard data
     */
    static async getDashboardData(filters: {
        regionIds?: string[];
        startDate?: Date;
        endDate?: Date;
    }) {
        const summary = await this.getRevenueSummary(filters);
        const byRegion = await this.getRevenueByRegion(filters);
        const byCommissionType = await this.getCommissionBreakdown(filters);
        const topConsultants = await this.getTopConsultants(filters);
        const timeline = await this.getRevenueTimeline(filters);

        return {
            summary,
            byRegion,
            byCommissionType,
            topConsultants,
            timeline,
        };
    }

    /**
     * Get revenue summary totals
     */
    static async getRevenueSummary(filters: {
        regionIds?: string[];
        startDate?: Date;
        endDate?: Date;
    }): Promise<RevenueSummary> {
        // Build where clause for bills
        const billWhere: any = {
            status: 'PAID',
        };

        if (filters.regionIds && filters.regionIds.length > 0) {
            billWhere.region_id = { in: filters.regionIds };
        }

        if (filters.startDate || filters.endDate) {
            billWhere.paid_at = {};
            if (filters.startDate) {
                billWhere.paid_at.gte = filters.startDate;
            }
            if (filters.endDate) {
                billWhere.paid_at.lte = filters.endDate;
            }
        }

        // Build where clause for commissions
        const commissionWhere: any = {
            status: { in: ['CONFIRMED', 'PAID'] },
        };

        if (filters.regionIds && filters.regionIds.length > 0) {
            commissionWhere.region_id = { in: filters.regionIds };
        }

        if (filters.startDate || filters.endDate) {
            commissionWhere.paid_at = {};
            if (filters.startDate) {
                commissionWhere.paid_at.gte = filters.startDate;
            }
            if (filters.endDate) {
                commissionWhere.paid_at.lte = filters.endDate;
            }
        }

        // Aggregate revenue
        const revenueResult = await prisma.bill.aggregate({
            where: billWhere,
            _sum: {
                total_amount: true,
            },
            _count: true,
        });

        // Aggregate commissions
        const commissionResult = await prisma.commission.aggregate({
            where: commissionWhere,
            _sum: {
                amount: true,
            },
            _count: true,
        });

        const totalRevenue = revenueResult._sum.total_amount || 0;
        const totalCommissions = commissionResult._sum.amount || 0;
        const netRevenue = totalRevenue - totalCommissions;
        const commissionRate = totalRevenue > 0 ? (totalCommissions / totalRevenue) * 100 : 0;

        return {
            totalRevenue,
            totalCommissions,
            netRevenue,
            commissionRate,
            billCount: revenueResult._count,
            paidCommissionCount: commissionResult._count,
        };
    }

    /**
     * Get revenue breakdown by region
     */
    static async getRevenueByRegion(filters: {
        regionIds?: string[];
        startDate?: Date;
        endDate?: Date;
    }): Promise<RegionRevenue[]> {
        // Build where clauses
        const billWhere: any = { status: 'PAID' };
        const commissionWhere: any = { status: { in: ['CONFIRMED', 'PAID'] } };

        if (filters.regionIds && filters.regionIds.length > 0) {
            billWhere.region_id = { in: filters.regionIds };
            commissionWhere.region_id = { in: filters.regionIds };
        }

        if (filters.startDate || filters.endDate) {
            const dateFilter: any = {};
            if (filters.startDate) dateFilter.gte = filters.startDate;
            if (filters.endDate) dateFilter.lte = filters.endDate;
            billWhere.paid_at = dateFilter;
            commissionWhere.paid_at = dateFilter;
        }

        // Get bills by region
        const billsByRegion = await prisma.bill.groupBy({
            by: ['region_id'],
            where: billWhere,
            _sum: {
                total_amount: true,
            },
            _count: true,
        });

        // Get commissions by region
        const commissionsByRegion = await prisma.commission.groupBy({
            by: ['region_id'],
            where: commissionWhere,
            _sum: {
                amount: true,
            },
        });

        // Get unique consultant count by region
        const consultantsByRegion = await prisma.commission.groupBy({
            by: ['region_id', 'consultant_id'],
            where: commissionWhere,
        });

        // Create region map
        const regionMap = new Map<string, RegionRevenue>();

        // Process bills
        for (const bill of billsByRegion) {
            if (!bill.region_id) continue;

            const revenue = bill._sum.total_amount || 0;
            regionMap.set(bill.region_id, {
                regionId: bill.region_id,
                regionName: '', // Will be filled later
                revenue,
                commissions: 0,
                netRevenue: revenue,
                billCount: bill._count,
                consultantCount: 0,
            });
        }

        // Process commissions
        for (const comm of commissionsByRegion) {
            const amount = comm._sum.amount || 0;
            const existing = regionMap.get(comm.region_id);

            if (existing) {
                existing.commissions = amount;
                existing.netRevenue = existing.revenue - amount;
            } else {
                regionMap.set(comm.region_id, {
                    regionId: comm.region_id,
                    regionName: '',
                    revenue: 0,
                    commissions: amount,
                    netRevenue: -amount,
                    billCount: 0,
                    consultantCount: 0,
                });
            }
        }

        // Count unique consultants per region
        const consultantCounts = new Map<string, number>();
        for (const c of consultantsByRegion) {
            consultantCounts.set(c.region_id, (consultantCounts.get(c.region_id) || 0) + 1);
        }

        for (const [regionId, count] of consultantCounts.entries()) {
            const existing = regionMap.get(regionId);
            if (existing) {
                existing.consultantCount = count;
            }
        }

        // Fetch region names
        const regionIds = Array.from(regionMap.keys());
        const regions = await prisma.region.findMany({
            where: { id: { in: regionIds } },
            select: { id: true, name: true },
        });

        for (const region of regions) {
            const data = regionMap.get(region.id);
            if (data) {
                data.regionName = region.name || region.id; // Use name or fallback to ID
            }
        }

        // Ensure all entries have a region name (fallback to ID if name not found)
        for (const entry of regionMap.values()) {
            if (!entry.regionName) {
                entry.regionName = `Region ${entry.regionId.substring(0, 8)}`;
            }
        }

        return Array.from(regionMap.values()).sort((a, b) => b.revenue - a.revenue);
    }

    /**
     * Get commission breakdown by type
     */
    static async getCommissionBreakdown(filters: {
        regionIds?: string[];
        startDate?: Date;
        endDate?: Date;
    }): Promise<CommissionTypeBreakdown[]> {
        const where: any = {
            status: { in: ['CONFIRMED', 'PAID'] },
        };

        if (filters.regionIds && filters.regionIds.length > 0) {
            where.region_id = { in: filters.regionIds };
        }

        if (filters.startDate || filters.endDate) {
            where.paid_at = {};
            if (filters.startDate) where.paid_at.gte = filters.startDate;
            if (filters.endDate) where.paid_at.lte = filters.endDate;
        }

        const byType = await prisma.commission.groupBy({
            by: ['type'],
            where,
            _sum: {
                amount: true,
            },
            _count: true,
        });

        const total = byType.reduce((sum, t) => sum + (t._sum.amount || 0), 0);

        return byType.map((t) => ({
            type: t.type,
            amount: t._sum.amount || 0,
            count: t._count,
            percentage: total > 0 ? ((t._sum.amount || 0) / total) * 100 : 0,
        }));
    }

    /**
     * Get top earning consultants
     */
    static async getTopConsultants(
        filters: {
            regionIds?: string[];
            startDate?: Date;
            endDate?: Date;
        },
        limit: number = 10
    ): Promise<TopConsultant[]> {
        const where: any = {
            status: { in: ['CONFIRMED', 'PAID'] },
        };

        if (filters.regionIds && filters.regionIds.length > 0) {
            where.region_id = { in: filters.regionIds };
        }

        if (filters.startDate || filters.endDate) {
            where.paid_at = {};
            if (filters.startDate) where.paid_at.gte = filters.startDate;
            if (filters.endDate) where.paid_at.lte = filters.endDate;
        }

        const byConsultant = await prisma.commission.groupBy({
            by: ['consultant_id', 'region_id'],
            where,
            _sum: {
                amount: true,
            },
            _count: true,
            orderBy: {
                _sum: {
                    amount: 'desc',
                },
            },
            take: limit,
        });

        // Fetch consultant and region details
        const consultantIds = [...new Set(byConsultant.map((c) => c.consultant_id))];
        const regionIds = [...new Set(byConsultant.map((c) => c.region_id))];

        const consultants = await prisma.consultant.findMany({
            where: { id: { in: consultantIds } },
            select: { id: true, first_name: true, last_name: true },
        });

        const regions = await prisma.region.findMany({
            where: { id: { in: regionIds } },
            select: { id: true, name: true },
        });

        const consultantMap = new Map(consultants.map((c) => [c.id, c]));
        const regionMap = new Map(regions.map((r) => [r.id, r]));

        return byConsultant.map((c) => {
            const consultant = consultantMap.get(c.consultant_id);
            const region = regionMap.get(c.region_id);

            return {
                consultantId: c.consultant_id,
                name: consultant ? `${consultant.first_name} ${consultant.last_name}` : 'Unknown',
                totalCommissions: c._sum.amount || 0,
                commissionCount: c._count,
                regionId: c.region_id,
                regionName: region?.name || 'Unknown',
            };
        });
    }

    /**
     * Get revenue timeline (monthly breakdown)
     */
    static async getRevenueTimeline(
        filters: {
            regionIds?: string[];
            startDate?: Date;
            endDate?: Date;
        },
        months: number = 12
    ): Promise<RevenueTimelineEntry[]> {
        // Calculate default date range if not provided
        const endDate = filters.endDate || new Date();
        const startDate = filters.startDate || new Date(endDate.getFullYear(), endDate.getMonth() - months + 1, 1);

        // Build where clauses
        const billWhere: any = {
            status: 'PAID',
            paid_at: {
                gte: startDate,
                lte: endDate,
            },
        };

        const commissionWhere: any = {
            status: { in: ['CONFIRMED', 'PAID'] },
            paid_at: {
                gte: startDate,
                lte: endDate,
            },
        };

        if (filters.regionIds && filters.regionIds.length > 0) {
            billWhere.region_id = { in: filters.regionIds };
            commissionWhere.region_id = { in: filters.regionIds };
        }

        // Fetch bills and commissions
        const bills = await prisma.bill.findMany({
            where: billWhere,
            select: {
                paid_at: true,
                total_amount: true,
            },
        });

        const commissions = await prisma.commission.findMany({
            where: commissionWhere,
            select: {
                paid_at: true,
                amount: true,
            },
        });

        // Group by month
        const timelineMap = new Map<string, RevenueTimelineEntry>();

        for (const bill of bills) {
            if (!bill.paid_at) continue;
            const month = `${bill.paid_at.getFullYear()}-${String(bill.paid_at.getMonth() + 1).padStart(2, '0')}`;

            const existing = timelineMap.get(month) || {
                month,
                revenue: 0,
                commissions: 0,
                netRevenue: 0,
                billCount: 0,
            };

            existing.revenue += bill.total_amount;
            existing.billCount += 1;
            timelineMap.set(month, existing);
        }

        for (const comm of commissions) {
            if (!comm.paid_at) continue;
            const month = `${comm.paid_at.getFullYear()}-${String(comm.paid_at.getMonth() + 1).padStart(2, '0')}`;

            const existing = timelineMap.get(month) || {
                month,
                revenue: 0,
                commissions: 0,
                netRevenue: 0,
                billCount: 0,
            };

            existing.commissions += comm.amount;
            timelineMap.set(month, existing);
        }

        // Calculate net revenue
        for (const entry of timelineMap.values()) {
            entry.netRevenue = entry.revenue - entry.commissions;
        }

        // Sort by month
        return Array.from(timelineMap.values()).sort((a, b) => a.month.localeCompare(b.month));
    }
}
