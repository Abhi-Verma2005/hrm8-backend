/**
 * HRM8 Job Controller
 * Global admin job management with analytics
 */

import { Response } from 'express';
import prisma from '../../lib/prisma';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';

export class Hrm8JobController {
    /**
     * Get all companies with job statistics
     */
    static async getCompaniesWithJobStats(_req: Hrm8AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const companies = await prisma.company.findMany({
                where: {
                    jobs: {
                        some: {},
                    },
                },
                select: {
                    id: true,
                    name: true,
                    domain: true,
                    _count: {
                        select: { jobs: true },
                    },
                    jobs: {
                        select: {
                            id: true,
                            status: true,
                            views_count: true,
                            clicks_count: true,
                        },
                    },
                },
                orderBy: {
                    name: 'asc',
                },
            });

            // Aggregate stats from Job table (synced with normal admin view)
            const companiesWithStats = companies.map((company) => {
                const totalViews = company.jobs.reduce((sum, job) => sum + (job.views_count || 0), 0);
                const totalClicks = company.jobs.reduce((sum, job) => sum + (job.clicks_count || 0), 0);
                const activeJobs = company.jobs.filter((j) => j.status === 'OPEN').length;
                const onHoldJobs = company.jobs.filter((j) => j.status === 'ON_HOLD').length;

                return {
                    id: company.id,
                    name: company.name,
                    domain: company.domain,
                    totalJobs: company._count.jobs,
                    activeJobs,
                    onHoldJobs,
                    totalViews,
                    totalClicks,
                };
            });

            res.json({
                success: true,
                data: { companies: companiesWithStats },
            });
        } catch (error: any) {
            console.error('Failed to get companies:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Get jobs for a specific company
     */
    static async getCompanyJobs(req: Hrm8AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { id } = req.params;

            const company = await prisma.company.findUnique({
                where: { id },
                select: { id: true, name: true, domain: true },
            });

            if (!company) {
                return res.status(404).json({ success: false, error: 'Company not found' });
            }

            const jobs = await prisma.job.findMany({
                where: { company_id: id },
                select: {
                    id: true,
                    title: true,
                    department: true,
                    location: true,
                    status: true,
                    posting_date: true,
                    views_count: true,
                    clicks_count: true,
                    _count: {
                        select: { applications: true },
                    },
                },
                orderBy: { created_at: 'desc' },
            });

            // Map jobs with stats from Job table (synced with normal admin view)
            const jobsWithStats = jobs.map((job) => ({
                id: job.id,
                title: job.title,
                department: job.department,
                location: job.location,
                status: job.status,
                hrm8Hidden: false, // TODO: Add to model
                views: job.views_count || 0,
                clicks: job.clicks_count || 0,
                applications: job._count.applications,
                postedAt: job.posting_date?.toISOString().split('T')[0],
            }));

            res.json({
                success: true,
                data: {
                    company,
                    jobs: jobsWithStats,
                },
            });
        } catch (error: any) {
            console.error('Failed to get company jobs:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Get job detail with analytics
     */
    static async getJobDetail(req: Hrm8AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { id } = req.params;

            const job = await prisma.job.findUnique({
                where: { id },
                include: {
                    company: {
                        select: { id: true, name: true, domain: true },
                    },
                },
            });

            if (!job) {
                return res.status(404).json({ success: false, error: 'Job not found' });
            }

            // Use views_count and clicks_count from Job table (synced with normal admin view)
            const totalViews = job.views_count || 0;
            const totalClicks = job.clicks_count || 0;

            const applicationCount = await prisma.application.count({
                where: { job_id: id },
            });

            // Views over time (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const timeSeriesData = await prisma.jobAnalytics.findMany({
                where: {
                    job_id: id,
                    created_at: { gte: sevenDaysAgo },
                },
                select: {
                    event_type: true,
                    created_at: true,
                },
            });

            // Group by date
            const viewsByDate: Record<string, { views: number; clicks: number }> = {};
            timeSeriesData.forEach((item) => {
                const date = item.created_at.toISOString().split('T')[0];
                if (!viewsByDate[date]) {
                    viewsByDate[date] = { views: 0, clicks: 0 };
                }
                if (item.event_type === 'VIEW') viewsByDate[date].views++;
                if (item.event_type === 'DETAIL_VIEW') viewsByDate[date].clicks++;
            });

            const viewsOverTime = Object.entries(viewsByDate).map(([date, data]) => ({
                date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                ...data,
            }));

            // Source breakdown
            const sourceGroups = await prisma.jobAnalytics.groupBy({
                by: ['source'],
                where: { job_id: id },
                _count: true,
            });

            const sourceBreakdown = sourceGroups.map((s) => ({
                source: s.source.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                count: s._count,
            }));

            res.json({
                success: true,
                data: {
                    job: {
                        id: job.id,
                        title: job.title,
                        company: job.company,
                        department: job.department,
                        location: job.location,
                        description: job.description,
                        status: job.status,
                        hrm8Hidden: false,
                        postedAt: job.posting_date?.toISOString().split('T')[0],
                        expiresAt: job.expires_at?.toISOString().split('T')[0],
                    },
                    analytics: {
                        totalViews,
                        totalClicks,
                        totalApplications: applicationCount,
                        conversionRate: totalViews > 0 ? Math.round((applicationCount / totalViews) * 1000) / 10 : 0,
                        viewsOverTime,
                        sourceBreakdown,
                    },
                    activities: [], // TODO: Add activity tracking
                },
            });
        } catch (error: any) {
            console.error('Failed to get job detail:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Toggle job visibility
     */
    static async toggleVisibility(req: Hrm8AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { id } = req.params;
            const { hidden } = req.body;

            // TODO: Add hrm8_hidden field to Job model
            // For now, we'll update the visibility field
            await prisma.job.update({
                where: { id },
                data: {
                    visibility: hidden ? 'hidden' : 'public',
                },
            });

            res.json({ success: true });
        } catch (error: any) {
            console.error('Failed to toggle visibility:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Update job status (global admin override)
     */
    static async updateStatus(req: Hrm8AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { id } = req.params;
            const { status, notes: _notes } = req.body;

            await prisma.job.update({
                where: { id },
                data: {
                    status: status,
                },
            });

            // TODO: Log activity for normal admin to see

            res.json({ success: true });
        } catch (error: any) {
            console.error('Failed to update status:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}
