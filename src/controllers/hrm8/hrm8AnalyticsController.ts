/**
 * HRM8 Analytics Controller
 * Platform-wide analytics for HRM8 global admins
 */
import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

/**
 * Get platform-wide analytics overview
 * GET /api/hrm8/analytics/overview
 */
export const getPlatformAnalyticsOverview = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, companyId, regionId } = req.query;

        // Build date filter
        const dateFilter: any = {};
        if (startDate) {
            dateFilter.gte = new Date(startDate as string);
        }
        if (endDate) {
            dateFilter.lte = new Date(endDate as string);
        }
        const hasDateFilter = Object.keys(dateFilter).length > 0;

        // Build job filter
        const jobFilter: any = {};
        if (companyId) {
            jobFilter.company_id = companyId;
        }
        if (regionId) {
            jobFilter.region_id = regionId;
        }

        // Get all jobs (optionally filtered)
        const jobs = await prisma.job.findMany({
            where: jobFilter,
            select: {
                id: true,
                status: true,
                views_count: true,
                clicks_count: true,
                company_id: true,
            },
        });

        const jobIds = jobs.map(j => j.id);

        // Get analytics by source and event type
        const analytics = await prisma.jobAnalytics.groupBy({
            by: ['event_type', 'source'],
            where: {
                job_id: { in: jobIds },
                ...(hasDateFilter ? { created_at: dateFilter } : {}),
            },
            _count: { id: true },
        });

        // Get total applications
        const totalApplications = await prisma.application.count({
            where: {
                job_id: { in: jobIds },
                ...(hasDateFilter ? { created_at: dateFilter } : {}),
            },
        });

        // Get company count
        const uniqueCompanies = new Set(jobs.map(j => j.company_id));

        // Aggregate metrics
        const sources = ['HRM8_BOARD', 'CAREER_PAGE', 'EXTERNAL', 'CANDIDATE_PORTAL'];
        const overview = {
            totalJobs: jobs.length,
            activeJobs: jobs.filter(j => j.status === 'OPEN').length,
            totalCompanies: uniqueCompanies.size,
            totalViews: jobs.reduce((sum, j) => sum + (j.views_count || 0), 0),
            totalClicks: jobs.reduce((sum, j) => sum + (j.clicks_count || 0), 0),
            totalApplications,
            conversionRates: {
                viewToClick: 0,
                clickToApply: 0,
                viewToApply: 0,
            },
            bySource: {} as Record<string, { views: number; clicks: number }>,
        };

        // Initialize sources
        sources.forEach(source => {
            overview.bySource[source] = { views: 0, clicks: 0 };
        });

        // Fill from analytics
        analytics.forEach(row => {
            const source = row.source || 'HRM8_BOARD';
            if (!overview.bySource[source]) {
                overview.bySource[source] = { views: 0, clicks: 0 };
            }
            if (row.event_type === 'DETAIL_VIEW' || row.event_type === 'VIEW') {
                overview.bySource[source].views += row._count.id;
            } else if (row.event_type === 'APPLY_CLICK') {
                overview.bySource[source].clicks += row._count.id;
            }
        });

        // Calculate conversion rates
        if (overview.totalViews > 0) {
            overview.conversionRates.viewToClick = Math.round((overview.totalClicks / overview.totalViews) * 100 * 10) / 10;
            overview.conversionRates.viewToApply = Math.round((overview.totalApplications / overview.totalViews) * 100 * 10) / 10;
        }
        if (overview.totalClicks > 0) {
            overview.conversionRates.clickToApply = Math.round((overview.totalApplications / overview.totalClicks) * 100 * 10) / 10;
        }

        res.json({
            success: true,
            data: overview,
        });
    } catch (error) {
        console.error('Failed to get platform analytics overview:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch platform analytics',
        });
    }
};

/**
 * Get traffic trends over time
 * GET /api/hrm8/analytics/trends
 */
export const getPlatformAnalyticsTrends = async (req: Request, res: Response) => {
    try {
        const { period = '30d', companyId, regionId } = req.query;

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        if (period === '7d') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === '30d') {
            startDate.setDate(startDate.getDate() - 30);
        } else if (period === '90d') {
            startDate.setDate(startDate.getDate() - 90);
        }

        // Build job filter
        const jobFilter: any = {};
        if (companyId) {
            jobFilter.company_id = companyId;
        }
        if (regionId) {
            jobFilter.region_id = regionId;
        }

        // Get job IDs
        const jobs = await prisma.job.findMany({
            where: jobFilter,
            select: { id: true },
        });
        const jobIds = jobs.map(j => j.id);

        // Get daily analytics
        const analytics = await prisma.jobAnalytics.findMany({
            where: {
                job_id: { in: jobIds },
                created_at: { gte: startDate, lte: endDate },
            },
            select: {
                event_type: true,
                source: true,
                created_at: true,
            },
        });

        // Get daily applications
        const applications = await prisma.application.findMany({
            where: {
                job_id: { in: jobIds },
                created_at: { gte: startDate, lte: endDate },
            },
            select: {
                created_at: true,
            },
        });

        // Group by date
        const dailyData: Record<string, { views: number; clicks: number; applies: number }> = {};

        // Initialize all dates in range
        const current = new Date(startDate);
        while (current <= endDate) {
            const dateKey = current.toISOString().split('T')[0];
            dailyData[dateKey] = { views: 0, clicks: 0, applies: 0 };
            current.setDate(current.getDate() + 1);
        }

        // Fill analytics data
        analytics.forEach(row => {
            const dateKey = row.created_at.toISOString().split('T')[0];
            if (dailyData[dateKey]) {
                if (row.event_type === 'DETAIL_VIEW' || row.event_type === 'VIEW') {
                    dailyData[dateKey].views++;
                } else if (row.event_type === 'APPLY_CLICK') {
                    dailyData[dateKey].clicks++;
                }
            }
        });

        // Fill application data
        applications.forEach(app => {
            const dateKey = app.created_at.toISOString().split('T')[0];
            if (dailyData[dateKey]) {
                dailyData[dateKey].applies++;
            }
        });

        // Convert to array for charting
        const trends = Object.entries(dailyData)
            .map(([date, data]) => ({
                date,
                ...data,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Calculate totals for the period
        const totals = trends.reduce(
            (acc, day) => ({
                views: acc.views + day.views,
                clicks: acc.clicks + day.clicks,
                applies: acc.applies + day.applies,
            }),
            { views: 0, clicks: 0, applies: 0 }
        );

        res.json({
            success: true,
            data: {
                period,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                trends,
                totals,
            },
        });
    } catch (error) {
        console.error('Failed to get platform analytics trends:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics trends',
        });
    }
};

/**
 * Get top performing companies
 * GET /api/hrm8/analytics/top-companies
 */
export const getTopPerformingCompanies = async (req: Request, res: Response) => {
    try {
        const { limit = '10', regionId } = req.query;

        const jobFilter: any = {};
        if (regionId) {
            jobFilter.region_id = regionId;
        }

        // Get jobs grouped by company
        const jobs = await prisma.job.groupBy({
            by: ['company_id'],
            where: jobFilter,
            _sum: {
                views_count: true,
                clicks_count: true,
            },
            _count: {
                id: true,
            },
        });

        // Get company details
        const companyIds = jobs.map(j => j.company_id);
        const companies = await prisma.company.findMany({
            where: { id: { in: companyIds } },
            select: {
                id: true,
                name: true,
                careers_page_status: true,
            },
        });

        const companyMap = new Map(companies.map(c => [c.id, c]));

        // Get application counts per company
        const applicationCounts = await prisma.application.groupBy({
            by: ['job_id'],
            _count: { id: true },
        });

        // Map applications to companies (through jobs)
        const jobToCompany = await prisma.job.findMany({
            where: { id: { in: applicationCounts.map(a => a.job_id) } },
            select: { id: true, company_id: true },
        });
        const jobCompanyMap = new Map(jobToCompany.map(j => [j.id, j.company_id]));

        const companyApplications: Record<string, number> = {};
        applicationCounts.forEach(app => {
            const companyId = jobCompanyMap.get(app.job_id);
            if (companyId) {
                companyApplications[companyId] = (companyApplications[companyId] || 0) + app._count.id;
            }
        });

        // Build result
        const topCompanies = jobs
            .map(j => {
                const company = companyMap.get(j.company_id);
                return {
                    companyId: j.company_id,
                    companyName: company?.name || 'Unknown',
                    hasCareerPage: company?.careers_page_status === 'APPROVED',
                    totalJobs: j._count.id,
                    totalViews: j._sum.views_count || 0,
                    totalClicks: j._sum.clicks_count || 0,
                    totalApplications: companyApplications[j.company_id] || 0,
                };
            })
            .sort((a, b) => b.totalViews - a.totalViews)
            .slice(0, parseInt(limit as string, 10));

        res.json({
            success: true,
            data: topCompanies,
        });
    } catch (error) {
        console.error('Failed to get top performing companies:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch top companies',
        });
    }
};
