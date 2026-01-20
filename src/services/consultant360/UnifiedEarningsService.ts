/**
 * Unified Earnings Service
 * Aggregates earnings data from both Recruiter (PLACEMENT) and Sales Agent
 * (SUBSCRIPTION_SALE, RECRUITMENT_SERVICE) commission types for Consultant 360 users.
 */

import { CommissionModel, CommissionData } from '../../models/Commission';
import { CommissionWithdrawalModel, CommissionWithdrawalData } from '../../models/CommissionWithdrawal';
import prisma from '../../lib/prisma';
import { CommissionType, CommissionStatus } from '@prisma/client';

// ==================== Interfaces ====================

export interface RecruiterEarnings {
    totalPlacements: number;
    totalRevenue: number;
    pendingCommissions: number;
    confirmedCommissions: number;
    paidCommissions: number;
    commissions: CommissionData[];
}

export interface SalesEarnings {
    totalSubscriptionSales: number;
    totalServiceFees: number;
    pendingCommissions: number;
    confirmedCommissions: number;
    paidCommissions: number;
    commissions: CommissionData[];
}

export interface CombinedBalance {
    totalEarned: number;
    availableBalance: number;
    pendingBalance: number;
    totalWithdrawn: number;
    availableCommissions: Array<{
        id: string;
        amount: number;
        type: CommissionType;
        description: string;
        createdAt: Date;
    }>;
}

export interface MonthlyTrendItem {
    month: string;
    year: number;
    recruiterEarnings: number;
    salesEarnings: number;
    total: number;
}

export interface UnifiedEarnings {
    recruiterEarnings: RecruiterEarnings;
    salesEarnings: SalesEarnings;
    combined: CombinedBalance;
    recentCommissions: CommissionData[];
    monthlyTrend: MonthlyTrendItem[];
}

export interface UnifiedDashboardStats {
    totalEarnings: number;
    availableBalance: number;
    pendingBalance: number;
    activeJobs: number;
    activeLeads: number;
    conversionRate: number;
    totalPlacements: number;
    totalSubscriptionSales: number;
    recruiterEarnings: number;
    salesEarnings: number;
}

// ==================== Service ====================

export class UnifiedEarningsService {
    /**
     * Get complete unified earnings for a Consultant 360 user
     */
    static async getUnifiedEarnings(consultantId: string): Promise<UnifiedEarnings> {
        // Fetch all commissions for this consultant
        const allCommissions = await CommissionModel.findByConsultantId(consultantId);

        // Get all withdrawals for calculating available balance
        const allWithdrawals = await CommissionWithdrawalModel.findByConsultantId(consultantId);

        // Separate commissions by type
        const recruiterCommissions = allCommissions.filter(
            (c) => c.type === CommissionType.PLACEMENT
        );

        const salesCommissions = allCommissions.filter(
            (c) => c.type === CommissionType.SUBSCRIPTION_SALE ||
                c.type === CommissionType.RECRUITMENT_SERVICE ||
                c.type === CommissionType.CUSTOM
        );

        // Calculate recruiter earnings
        const recruiterEarnings = this.calculateRecruiterEarnings(recruiterCommissions);

        // Calculate sales earnings
        const salesEarnings = this.calculateSalesEarnings(salesCommissions);

        // Calculate combined balance
        const combined = this.calculateCombinedBalance(allCommissions, allWithdrawals);

        // Get monthly trend (last 12 months)
        const monthlyTrend = this.calculateMonthlyTrend(allCommissions);

        // Get recent commissions (last 10)
        const recentCommissions = allCommissions
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10);

        return {
            recruiterEarnings,
            salesEarnings,
            combined,
            recentCommissions,
            monthlyTrend,
        };
    }

    /**
     * Get unified dashboard statistics
     */
    static async getUnifiedDashboardStats(consultantId: string): Promise<UnifiedDashboardStats> {
        const earnings = await this.getUnifiedEarnings(consultantId);

        // Get active jobs count (jobs assigned to this consultant)
        const activeJobsCount = await prisma.consultantJobAssignment.count({
            where: {
                consultant_id: consultantId,
                status: 'ACTIVE',
            },
        });

        // Get active leads count (leads owned by this consultant)
        const activeLeadsCount = await prisma.lead.count({
            where: {
                assigned_consultant_id: consultantId,
                status: { notIn: ['CONVERTED', 'LOST'] },
            },
        });

        // Calculate conversion rate (converted leads / total leads)
        const totalLeads = await prisma.lead.count({
            where: { assigned_consultant_id: consultantId },
        });
        const convertedLeads = await prisma.lead.count({
            where: {
                assigned_consultant_id: consultantId,
                status: 'CONVERTED',
            },
        });
        const conversionRate = totalLeads > 0
            ? Math.round((convertedLeads / totalLeads) * 100)
            : 0;

        // Count subscription sales
        const subscriptionSalesCount = earnings.salesEarnings.commissions.filter(
            (c) => c.type === CommissionType.SUBSCRIPTION_SALE
        ).length;

        return {
            totalEarnings: earnings.combined.totalEarned,
            availableBalance: earnings.combined.availableBalance,
            pendingBalance: earnings.combined.pendingBalance,
            activeJobs: activeJobsCount,
            activeLeads: activeLeadsCount,
            conversionRate,
            totalPlacements: earnings.recruiterEarnings.totalPlacements,
            totalSubscriptionSales: subscriptionSalesCount,
            recruiterEarnings: earnings.recruiterEarnings.totalRevenue,
            salesEarnings: earnings.salesEarnings.totalSubscriptionSales +
                earnings.salesEarnings.totalServiceFees,
        };
    }

    /**
     * Get unified withdrawal balance (combines all commission sources)
     */
    static async getUnifiedBalance(consultantId: string): Promise<CombinedBalance> {
        const allCommissions = await CommissionModel.findByConsultantId(consultantId);
        const allWithdrawals = await CommissionWithdrawalModel.findByConsultantId(consultantId);

        return this.calculateCombinedBalance(allCommissions, allWithdrawals);
    }

    /**
     * Get commissions with optional filters
     */
    static async getCommissions(
        consultantId: string,
        filters?: {
            type?: 'RECRUITER' | 'SALES' | 'ALL';
            status?: CommissionStatus;
            limit?: number;
            offset?: number;
        }
    ): Promise<{ commissions: CommissionData[]; total: number }> {
        const allCommissions = await CommissionModel.findByConsultantId(consultantId);

        let filtered = allCommissions;

        // Filter by type category
        if (filters?.type === 'RECRUITER') {
            filtered = filtered.filter((c) => c.type === CommissionType.PLACEMENT);
        } else if (filters?.type === 'SALES') {
            filtered = filtered.filter(
                (c) => c.type === CommissionType.SUBSCRIPTION_SALE ||
                    c.type === CommissionType.RECRUITMENT_SERVICE
            );
        }

        // Filter by status
        if (filters?.status) {
            filtered = filtered.filter((c) => c.status === filters.status);
        }

        const total = filtered.length;

        // Apply pagination
        if (filters?.offset !== undefined) {
            filtered = filtered.slice(filters.offset);
        }
        if (filters?.limit !== undefined) {
            filtered = filtered.slice(0, filters.limit);
        }

        return { commissions: filtered, total };
    }

    // ==================== Private Helper Methods ====================

    private static calculateRecruiterEarnings(commissions: CommissionData[]): RecruiterEarnings {
        const pending = commissions.filter((c) => c.status === CommissionStatus.PENDING);
        const confirmed = commissions.filter((c) => c.status === CommissionStatus.CONFIRMED);
        const paid = commissions.filter((c) => c.status === CommissionStatus.PAID);

        return {
            totalPlacements: commissions.length,
            totalRevenue: commissions.reduce((sum, c) => sum + c.amount, 0),
            pendingCommissions: pending.reduce((sum, c) => sum + c.amount, 0),
            confirmedCommissions: confirmed.reduce((sum, c) => sum + c.amount, 0),
            paidCommissions: paid.reduce((sum, c) => sum + c.amount, 0),
            commissions,
        };
    }

    private static calculateSalesEarnings(commissions: CommissionData[]): SalesEarnings {
        const subscriptions = commissions.filter(
            (c) => c.type === CommissionType.SUBSCRIPTION_SALE
        );
        const services = commissions.filter(
            (c) => c.type === CommissionType.RECRUITMENT_SERVICE
        );

        const pending = commissions.filter((c) => c.status === CommissionStatus.PENDING);
        const confirmed = commissions.filter((c) => c.status === CommissionStatus.CONFIRMED);
        const paid = commissions.filter((c) => c.status === CommissionStatus.PAID);

        return {
            totalSubscriptionSales: subscriptions.reduce((sum, c) => sum + c.amount, 0),
            totalServiceFees: services.reduce((sum, c) => sum + c.amount, 0),
            pendingCommissions: pending.reduce((sum, c) => sum + c.amount, 0),
            confirmedCommissions: confirmed.reduce((sum, c) => sum + c.amount, 0),
            paidCommissions: paid.reduce((sum, c) => sum + c.amount, 0),
            commissions,
        };
    }

    private static calculateCombinedBalance(
        commissions: CommissionData[],
        withdrawals: CommissionWithdrawalData[]
    ): CombinedBalance {
        // Get commission IDs that are already included in non-rejected/cancelled withdrawals
        const withdrawnCommissionIds = new Set<string>();
        withdrawals
            .filter((w) => w.status !== 'REJECTED' && w.status !== 'CANCELLED')
            .forEach((w) => {
                w.commissionIds.forEach((id) => withdrawnCommissionIds.add(id));
            });

        // Available: CONFIRMED commissions not yet in any withdrawal
        const availableCommissions = commissions.filter(
            (c) => c.status === CommissionStatus.CONFIRMED && !withdrawnCommissionIds.has(c.id)
        );
        const availableBalance = availableCommissions.reduce((sum, c) => sum + c.amount, 0);

        // Pending: PENDING commissions
        const pendingBalance = commissions
            .filter((c) => c.status === CommissionStatus.PENDING)
            .reduce((sum, c) => sum + c.amount, 0);

        // Total earned: All non-cancelled commissions
        const totalEarned = commissions
            .filter((c) => c.status !== CommissionStatus.CANCELLED)
            .reduce((sum, c) => sum + c.amount, 0);

        // Total withdrawn: Completed withdrawals
        const totalWithdrawn = withdrawals
            .filter((w) => w.status === 'COMPLETED')
            .reduce((sum, w) => sum + w.amount, 0);

        return {
            totalEarned: Math.round(totalEarned * 100) / 100,
            availableBalance: Math.round(availableBalance * 100) / 100,
            pendingBalance: Math.round(pendingBalance * 100) / 100,
            totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
            availableCommissions: availableCommissions.map((c) => ({
                id: c.id,
                amount: c.amount,
                type: c.type,
                description: c.description || 'Commission',
                createdAt: c.createdAt,
            })),
        };
    }

    private static calculateMonthlyTrend(commissions: CommissionData[]): MonthlyTrendItem[] {
        const now = new Date();
        const months: MonthlyTrendItem[] = [];

        // Generate last 12 months
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear();

            // Filter commissions for this month
            const monthCommissions = commissions.filter((c) => {
                const cDate = new Date(c.createdAt);
                return cDate.getMonth() === date.getMonth() &&
                    cDate.getFullYear() === date.getFullYear();
            });

            // Calculate recruiter earnings (PLACEMENT)
            const recruiterEarnings = monthCommissions
                .filter((c) => c.type === CommissionType.PLACEMENT)
                .reduce((sum, c) => sum + c.amount, 0);

            // Calculate sales earnings (SUBSCRIPTION_SALE + RECRUITMENT_SERVICE)
            const salesEarnings = monthCommissions
                .filter(
                    (c) => c.type === CommissionType.SUBSCRIPTION_SALE ||
                        c.type === CommissionType.RECRUITMENT_SERVICE
                )
                .reduce((sum, c) => sum + c.amount, 0);

            months.push({
                month: monthName,
                year,
                recruiterEarnings: Math.round(recruiterEarnings * 100) / 100,
                salesEarnings: Math.round(salesEarnings * 100) / 100,
                total: Math.round((recruiterEarnings + salesEarnings) * 100) / 100,
            });
        }

        return months;
    }
}
