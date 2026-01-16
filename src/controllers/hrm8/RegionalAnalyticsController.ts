import { Response } from 'express';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import prisma from '../../lib/prisma';
import { JobStatus, ConsultantStatus, CommissionType } from '@prisma/client';

export class RegionalAnalyticsController {

    /**
     * Get operational stats for a specific region.
     * Helper for Licensee Dashboard.
     * GET /api/hrm8/analytics/regional/:regionId/operational
     */
    static async getOperationalStats(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { regionId } = req.params;

            // Security: Check if user is assigned to this region (or is global admin)
            const userRegions = req.assignedRegionIds;
            if (userRegions && userRegions.length > 0 && !userRegions.includes(regionId)) {
                res.status(403).json({ success: false, error: 'Access denied to this region' });
                return;
            }

            // 1. Open Jobs Count
            const openJobsCount = await prisma.job.count({
                where: {
                    region_id: regionId,
                    status: JobStatus.OPEN
                }
            });

            // 2. Active Consultants Count
            const activeConsultantsCount = await prisma.consultant.count({
                where: {
                    region_id: regionId,
                    status: ConsultantStatus.ACTIVE
                }
            });

            // 3. Placements This Month
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const placementsThisMonth = await prisma.commission.count({
                where: {
                    region_id: regionId,
                    type: CommissionType.PLACEMENT,
                    created_at: {
                        gte: startOfMonth
                    }
                }
            });

            // --- Historical Trends (Last 6 Months) ---
            const getDataForLast6Months = async (model: any, whereClause: any) => {
                const trends = [];
                for (let i = 5; i >= 0; i--) {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
                    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

                    const count = await model.count({
                        where: {
                            ...whereClause,
                            created_at: {
                                gte: monthStart,
                                lte: monthEnd
                            }
                        }
                    });

                    trends.push({
                        name: monthStart.toLocaleString('default', { month: 'short' }),
                        value: count
                    });
                }
                return trends;
            };

            // Trends: New Jobs Created per month
            const openJobsTrend = await getDataForLast6Months(prisma.job, { region_id: regionId });

            // Trends: New Consultants Joined per month
            const activeConsultantsTrend = await getDataForLast6Months(prisma.consultant, { region_id: regionId });

            // Trends: Placements per month
            const placementsTrend = await getDataForLast6Months(prisma.commission, { region_id: regionId, type: CommissionType.PLACEMENT });

            // 4. Employer Health Metrics

            // Active Employers: Companies in this region that have at least one OPEN job
            const activeEmployerCount = await prisma.company.count({
                where: {
                    region_id: regionId,
                    jobs: {
                        some: {
                            status: JobStatus.OPEN
                        }
                    }
                }
            });

            // New Employers: Companies created in this region this month
            const newEmployerCount = await prisma.company.count({
                where: {
                    region_id: regionId,
                    created_at: {
                        gte: startOfMonth
                    }
                }
            });

            // Inactive Employers: Companies in this region with NO open jobs
            // (We subtract Active from Total or query specifically)
            const totalRegionalCompanies = await prisma.company.count({
                where: { region_id: regionId }
            });
            const inactiveEmployerCount = totalRegionalCompanies - activeEmployerCount;

            res.json({
                success: true,
                data: {
                    regionId,
                    openJobsCount,
                    activeConsultantsCount,
                    placementsThisMonth,
                    // Employer Metrics
                    activeEmployerCount,
                    newEmployerCount,
                    inactiveEmployerCount,
                    trends: {
                        openJobs: openJobsTrend,
                        activeConsultants: activeConsultantsTrend,
                        placements: placementsTrend
                    }
                }
            });

        } catch (error: any) {
            console.error('Error fetching regional stats:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch stats' });
        }
    }

    /**
     * Get companies for a region (Employer Health drill-down).
     * GET /api/hrm8/analytics/regional/:regionId/companies
     */
    static async getRegionalCompanies(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { regionId } = req.params;
            const { status } = req.query; // active, inactive, new

            // Security: Check if user is assigned to this region
            const userRegions = req.assignedRegionIds;
            if (userRegions && userRegions.length > 0 && !userRegions.includes(regionId)) {
                res.status(403).json({ success: false, error: 'Access denied to this region' });
                return;
            }

            const whereClause: any = { region_id: regionId };

            // Apply filters if needed (handling 'new' here, 'active/inactive' primarily done via openJobs check or post-filter)
            // Note: Efficient way for Active/Inactive is filtering on relation count, but Prisma's `where` with relation count is limited in some versions.
            // We'll fetch and filter or use advanced filtering if Prisma version supports it.
            // For now, let's just return the list with counts and let frontend filter or basic query filters.

            if (status === 'new') {
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                whereClause.created_at = { gte: startOfMonth };
            }

            const companies = await prisma.company.findMany({
                where: whereClause,
                include: {
                    subscription: {
                        where: { status: 'ACTIVE' },
                        take: 1
                    },
                    _count: {
                        select: { jobs: { where: { status: 'OPEN' } } }
                    }
                },
                orderBy: { created_at: 'desc' }
            });

            // Transform
            const companyData = companies.map(c => {
                const hasActiveSub = c.subscription.length > 0;
                const sub = hasActiveSub ? c.subscription[0] : null;

                let attributionStatus = 'OPEN';
                if (c.attribution_locked) {
                    if (c.attribution_locked_at) {
                        const today = new Date();
                        // Simple check, real logic depends on date-fns
                        const diffTime = Math.abs(today.getTime() - c.attribution_locked_at.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        attributionStatus = diffDays < 365 ? 'LOCKED' : 'EXPIRED';
                    } else {
                        attributionStatus = 'LOCKED';
                    }
                }

                return {
                    id: c.id,
                    name: c.name,
                    domain: c.domain,
                    createdAt: c.created_at,
                    attributionStatus,
                    openJobsCount: c._count.jobs,
                    subscription: sub ? {
                        plan: sub.plan_type,
                        startDate: sub.start_date,
                        renewalDate: sub.renewal_date
                    } : null
                };
            });

            res.json({
                success: true,
                data: { companies: companyData }
            });

        } catch (error: any) {
            console.error('Error fetching regional companies:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch companies' });
        }
    }
}
