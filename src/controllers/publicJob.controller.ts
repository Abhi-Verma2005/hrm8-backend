import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma'; // Use singleton

/**
 * Transform job data from Prisma snake_case to frontend camelCase
 * This ensures compatibility between database conventions and JavaScript conventions
 */
function transformJobForPublic(job: any): any {
    // Extract logo from profile_data JSON if available
    const profileData = job.company?.profile?.profile_data as any;
    const logoUrl = profileData?.branding?.logoUrl || profileData?.logoUrl || null;

    return {
        id: job.id,
        title: job.title,
        description: job.description,
        jobSummary: job.job_summary,
        category: job.category,
        location: job.location,
        department: job.department,
        workArrangement: job.work_arrangement,
        employmentType: job.employment_type,
        numberOfVacancies: job.number_of_vacancies || 1,
        salaryMin: job.salary_min,
        salaryMax: job.salary_max,
        salaryCurrency: job.salary_currency || 'USD',
        salaryDescription: job.salary_description,
        requirements: job.requirements || [],
        responsibilities: job.responsibilities || [],
        promotionalTags: job.promotional_tags || [],
        featured: job.featured || false,
        postingDate: job.posted_at || job.created_at,
        expiryDate: job.expires_at,
        regionId: job.region_id,
        company: {
            id: job.company?.id || '',
            name: job.company?.name || '',
            website: job.company?.website || (job.company?.domain ? `https://${job.company.domain}` : ''),
            logoUrl: logoUrl,
            domain: job.company?.domain || '',
            aboutCompany: profileData?.about?.description || null,
        },
        createdAt: job.created_at,
    };
}

export const getGlobalJobs = async (req: Request, res: Response) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const search = req.query.search as string;
        const location = req.query.location as string;
        const tags = req.query.tags as string;
        const company = req.query.company as string;
        const companyId = req.query.companyId as string;
        const department = req.query.department as string;
        const category = req.query.category as string;
        const region = req.query.region as string;
        const workArrangement = req.query.workArrangement as string;
        const employmentType = req.query.employmentType as string;
        const includeRemote = req.query.includeRemote !== 'false';

        const where: Prisma.JobWhereInput = {
            status: 'OPEN',
            visibility: 'public',
        };

        if (search) {
            where.title = { contains: search, mode: 'insensitive' };
        }

        if (location) {
            where.location = { contains: location, mode: 'insensitive' };
        }

        if (tags) {
            // Assuming tags is comma separated
            const tagList = tags.split(',');
            where.promotional_tags = { hasSome: tagList };
        }

        // Filter by company name or ID
        if (company) {
            where.company = {
                OR: [
                    { name: { contains: company, mode: 'insensitive' } },
                    { id: company }
                ]
            };
        }

        // Filter by company ID only
        if (companyId) {
            where.company_id = companyId;
        }

        // Filter by department
        if (department) {
            where.department = { contains: department, mode: 'insensitive' };
        }

        // Filter by category
        if (category) {
            where.category = { contains: category, mode: 'insensitive' };
        }

        // Filter by work arrangement (REMOTE, ON_SITE, HYBRID)
        if (workArrangement) {
            where.work_arrangement = workArrangement.toUpperCase().replace('-', '_') as any;
        }

        // Filter by employment type (FULL_TIME, PART_TIME, CONTRACT, etc.)
        if (employmentType) {
            where.employment_type = employmentType.toUpperCase().replace('-', '_') as any;
        }

        // Region-wise filtering:
        // - Remote jobs are visible to all candidates regardless of region
        // - Non-remote jobs (ON_SITE, HYBRID) are filtered by region
        let isRegionFiltered = false;
        if (region) {
            isRegionFiltered = true;
            if (includeRemote) {
                // Show remote jobs from any region + non-remote jobs from specified region
                where.OR = [
                    { work_arrangement: 'REMOTE' },
                    { region_id: region }
                ];
            } else {
                // Only show jobs from specified region
                where.region_id = region;
            }
        }

        const [jobs, total] = await Promise.all([
            prisma.job.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    job_summary: true,
                    category: true,
                    location: true,
                    department: true,
                    work_arrangement: true,
                    employment_type: true,
                    number_of_vacancies: true,
                    salary_min: true,
                    salary_max: true,
                    salary_currency: true,
                    salary_description: true,
                    requirements: true,
                    responsibilities: true,
                    promotional_tags: true,
                    featured: true,
                    posted_at: true,
                    expires_at: true,
                    created_at: true,
                    views_count: true,
                    region_id: true,
                    company: {
                        select: {
                            id: true,
                            name: true,
                            domain: true,
                            website: true,
                            profile: {
                                select: {
                                    profile_data: true,
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    posted_at: 'desc'
                },
                skip,
                take: limit
            }),
            prisma.job.count({ where })
        ]);

        // Transform jobs to camelCase for frontend
        const transformedJobs = jobs.map(transformJobForPublic);

        res.json({
            success: true,
            data: {
                jobs: transformedJobs,
                pagination: {
                    total,
                    page,
                    limit,
                    total_pages: Math.ceil(total / limit)
                },
                isRegionFiltered,
                regionNote: isRegionFiltered ? 'Showing jobs in your region. Remote jobs are included from all regions.' : null
            }
        });

    } catch (error: any) {
        console.error('Error fetching global jobs:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
    }
};

export const getCompanyJobs = async (req: Request, res: Response) => {
    try {
        const { domain } = req.params;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const company = await prisma.company.findUnique({
            where: { domain },
            select: { id: true, name: true, domain: true }
        });

        if (!company) {
            res.status(404).json({ success: false, error: 'Company not found' });
            return;
        }

        const where: Prisma.JobWhereInput = {
            company_id: company.id,
            status: 'OPEN',
            visibility: 'public'
        };

        const [jobs, total] = await Promise.all([
            prisma.job.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    job_summary: true,
                    category: true,
                    location: true,
                    department: true,
                    work_arrangement: true,
                    employment_type: true,
                    number_of_vacancies: true,
                    salary_min: true,
                    salary_max: true,
                    salary_currency: true,
                    salary_description: true,
                    requirements: true,
                    responsibilities: true,
                    promotional_tags: true,
                    featured: true,
                    posted_at: true,
                    expires_at: true,
                    created_at: true,
                    company: {
                        select: {
                            id: true,
                            name: true,
                            domain: true,
                            website: true,
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit
            }),
            prisma.job.count({ where })
        ]);

        // Transform jobs to camelCase for frontend
        const transformedJobs = jobs.map(transformJobForPublic);

        res.json({
            success: true,
            data: {
                company,
                jobs: transformedJobs,
                pagination: {
                    total,
                    page,
                    limit,
                    total_pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error: any) {
        console.error('Error fetching company jobs:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch company jobs' });
    }
};

export const getJobDetail = async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;

        // Increment view count (fire and forget/await)
        // We use updateMany to avoid error if ID not found
        await prisma.job.updateMany({
            where: { id: jobId },
            data: { views_count: { increment: 1 } }
        }).catch(err => console.error('Failed to increment view count', err));

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: {
                id: true,
                title: true,
                description: true,
                job_summary: true,
                category: true,
                location: true,
                department: true,
                work_arrangement: true,
                employment_type: true,
                number_of_vacancies: true,
                salary_min: true,
                salary_max: true,
                salary_currency: true,
                salary_description: true,
                requirements: true,
                responsibilities: true,
                promotional_tags: true,
                featured: true,
                posted_at: true,
                expires_at: true,
                created_at: true,
                benefits: true,
                region_id: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        domain: true,
                        website: true,
                        country_or_region: true,
                        profile: {
                            select: {
                                profile_data: true,
                            }
                        }
                    }
                }
            }
        });

        if (!job) {
            res.status(404).json({ success: false, error: 'Job not found' });
            return;
        }

        // Transform job to camelCase for frontend
        const transformedJob = transformJobForPublic(job);

        res.json({ success: true, data: transformedJob });

    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to fetch job details' });
    }
}

export const getCompanyBranding = async (req: Request, res: Response) => {
    try {
        const { domain } = req.params;

        const branding = await prisma.company.findUnique({
            where: { domain },
            select: {
                name: true,
                domain: true,
                company_settings: {
                    select: {
                        timezone: true
                    }
                }
            }
        });

        if (!branding) {
            res.status(404).json({ success: false, error: 'Company not found' });
            return;
        }

        res.json({ success: true, data: branding });

    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to fetch branding' });
    }
}

export const getPublicCategories = async (_req: Request, res: Response) => {
    try {
        const categories = await prisma.jobCategory.findMany({
            where: { is_active: true },
            orderBy: { order: 'asc' },
            select: {
                id: true,
                name: true,
                slug: true,
                icon: true,
                color: true,
                _count: {
                    select: { jobs: true }
                }
            }
        });

        res.json({ success: true, data: categories });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
};

export const getPublicTags = async (_req: Request, res: Response) => {
    try {
        const tags = await prisma.jobTag.findMany({
            where: { is_active: true },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                slug: true,
                color: true
            }
        });

        res.json({ success: true, data: tags });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Failed to fetch tags' });
    }
};


/**
 * Track analytics event
 * POST /api/public/jobs/:jobId/track
 */
export const trackAnalytics = async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;
        const { event_type, source, session_id, referrer } = req.body;

        const ip_address = req.ip || req.socket.remoteAddress;
        const user_agent = req.headers['user-agent'];

        await prisma.jobAnalytics.create({
            data: {
                job_id: jobId,
                event_type,
                source: source || 'HRM8_BOARD',
                session_id,
                ip_address,
                user_agent,
                referrer,
            }
        });

        if (event_type === 'DETAIL_VIEW') {
            await prisma.job.update({
                where: { id: jobId },
                data: { views_count: { increment: 1 } }
            });
        } else if (event_type === 'APPLY_CLICK') {
            await prisma.job.update({
                where: { id: jobId },
                data: { clicks_count: { increment: 1 } }
            });
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Analytics tracking error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/public/jobs/filters
 * Get filter options (categories, departments, locations) for job search
 */
export const getFilters = async (_req: Request, res: Response) => {
    try {
        const baseWhere = {
            status: 'OPEN' as const,
            visibility: 'public',
        };

        // Get active categories from JobCategory table
        const categories = await prisma.jobCategory.findMany({
            where: { is_active: true },
            orderBy: { order: 'asc' },
            select: {
                name: true,
                slug: true,
            }
        });

        // Get unique departments, locations, and promotional_tags from active jobs
        const jobs = await prisma.job.findMany({
            where: baseWhere,
            select: {
                department: true,
                location: true,
                promotional_tags: true,
            }
        });

        // Get companies with active jobs
        const companies = await prisma.company.findMany({
            where: { jobs: { some: baseWhere } },
            select: {
                id: true,
                name: true,
            },
            orderBy: { name: 'asc' },
        });

        // Extract unique non-null values
        const departments = [...new Set(jobs.map(j => j.department).filter(Boolean))].sort();
        const locations = [...new Set(jobs.map(j => j.location).filter(Boolean))].sort();

        // Extract unique tags from promotional_tags arrays
        const allTags = new Set<string>();
        jobs.forEach(job => {
            if (job.promotional_tags && Array.isArray(job.promotional_tags)) {
                job.promotional_tags.forEach((tag: string) => allTags.add(tag));
            }
        });

        res.json({
            success: true,
            data: {
                categories: categories.map(c => c.name.trim()),
                departments,
                locations,
                companies: companies.map(c => ({ id: c.id, name: c.name })),
                tags: Array.from(allTags).sort(),
            }
        });
    } catch (error: any) {
        console.error('Error fetching filters:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch filters' });
    }
};

/**
 * Get filter aggregations
 * GET /api/public/jobs/aggregations
 */
export const getFilterAggregations = async (_req: Request, res: Response) => {
    try {
        const baseWhere = {
            status: 'OPEN' as const,
            visibility: 'public',
            archived: false,
        };

        const [categories, locations, tags, companies] = await Promise.all([
            prisma.jobCategory.findMany({
                where: { is_active: true },
                select: {
                    id: true,
                    slug: true,
                    name: true,
                    icon: true,
                    _count: { select: { jobs: { where: baseWhere } } }
                },
                orderBy: { name: 'asc' }
            }),
            prisma.job.groupBy({
                by: ['location'],
                where: baseWhere,
                _count: true,
                orderBy: { _count: { location: 'desc' } },
                take: 20
            }),
            prisma.jobTag.findMany({
                where: { is_active: true },
                select: {
                    id: true,
                    slug: true,
                    name: true,
                    color: true,
                    _count: { select: { jobs: { where: { job: baseWhere } } } }
                },
                orderBy: { name: 'asc' }
            }),
            prisma.company.findMany({
                where: { jobs: { some: baseWhere } },
                select: {
                    id: true,
                    name: true,
                    _count: { select: { jobs: { where: baseWhere } } }
                },
                orderBy: { name: 'asc' },
                take: 50
            })
        ]);

        res.json({
            success: true,
            data: {
                categories: categories.map(c => ({ ...c, count: c._count.jobs })),
                locations: locations.map(l => ({ location: l.location, count: l._count })),
                tags: tags.map(t => ({ ...t, count: t._count.jobs })),
                companies: companies.map(c => ({ ...c, count: c._count.jobs }))
            }
        });
    } catch (error: any) {
        console.error('Filter aggregations error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Get application form fields for a job
 * GET /api/public/jobs/:jobId/application-form
 */
export const getApplicationForm = async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;

        const job = await prisma.job.findUnique({
            where: { id: jobId, status: 'OPEN' },
            select: {
                id: true,
                title: true,
                application_form: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        domain: true,
                    }
                }
            }
        });

        if (!job) {
            res.status(404).json({ success: false, error: 'Job not found or not accepting applications' });
            return;
        }

        res.json({
            success: true,
            data: {
                jobId: job.id,
                title: job.title,
                company: job.company,
                form: job.application_form || { fields: [] }
            }
        });
    } catch (error: any) {
        console.error('Error fetching application form:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch application form' });
    }
};

/**
 * Get related jobs from the same company
 * GET /api/public/jobs/:jobId/related
 */
export const getRelatedJobs = async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;
        const limit = Math.min(Number(req.query.limit) || 5, 10);

        // Get current job's company
        const currentJob = await prisma.job.findUnique({
            where: { id: jobId },
            select: { company_id: true }
        });

        if (!currentJob) {
            res.status(404).json({ success: false, error: 'Job not found' });
            return;
        }

        // Get other open jobs from the same company
        const relatedJobs = await prisma.job.findMany({
            where: {
                company_id: currentJob.company_id,
                status: 'OPEN',
                visibility: 'public',
                id: { not: jobId }
            },
            select: {
                id: true,
                title: true,
                job_summary: true,
                location: true,
                department: true,
                employment_type: true,
                work_arrangement: true,
                posted_at: true,
                promotional_tags: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        domain: true,
                    }
                }
            },
            take: limit,
            orderBy: { posted_at: 'desc' }
        });

        res.json({
            success: true,
            data: relatedJobs.map(transformJobForPublic)
        });
    } catch (error: any) {
        console.error('Error fetching related jobs:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch related jobs' });
    }
};
