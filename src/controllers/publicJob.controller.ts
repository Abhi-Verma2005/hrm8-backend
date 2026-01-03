import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma'; // Use singleton

export const getGlobalJobs = async (req: Request, res: Response) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const search = req.query.search as string;
        const location = req.query.location as string;
        const tags = req.query.tags as string;

        const where: Prisma.JobWhereInput = {
            status: 'OPEN',
            visibility: 'public',
            // Ensure company is active/verified if needed
            company: {
                // verification_status: 'VERIFIED' // Optional strictness
            }
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

        const [jobs, total] = await Promise.all([
            prisma.job.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    location: true,
                    // Use String[] type for requirements/responsibilities since we reverted to array
                    employment_type: true,
                    promotional_tags: true,
                    posted_at: true, // New field
                    created_at: true,
                    views_count: true,
                    company: {
                        select: {
                            name: true,
                            domain: true,
                            company_settings: {
                                select: {
                                    timezone: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    posted_at: 'desc' // Use posted_at ideally, fallback to created_at
                },
                skip,
                take: limit
            }),
            prisma.job.count({ where })
        ]);

        res.json({
            success: true,
            data: {
                jobs,
                pagination: {
                    total,
                    page,
                    limit,
                    total_pages: Math.ceil(total / limit)
                }
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
                    location: true,
                    employment_type: true,
                    promotional_tags: true,
                    posted_at: true,
                    created_at: true,
                    company: {
                        select: {
                            name: true,
                            domain: true,
                            company_settings: {
                                select: {
                                    timezone: true
                                }
                            }
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit
            }),
            prisma.job.count({ where })
        ]);

        res.json({
            success: true,
            data: {
                company,
                jobs,
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
        // We use updateMany to avoid error if ID not found, though findUnique is better for fetching
        await prisma.job.update({
            where: { id: jobId },
            data: { views_count: { increment: 1 } }
        }).catch(err => console.error('Failed to increment view count', err));

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: {
                id: true,
                title: true,
                description: true,
                requirements: true, // String[]
                responsibilities: true, // String[]
                location: true,
                employment_type: true,
                salary_min: true, // Careful: only if public? Assuming yes for now if posted
                salary_max: true,
                salary_currency: true,
                benefits: true,
                posted_at: true,
                company: {
                    select: {
                        name: true,
                        domain: true,
                        country_or_region: true,
                        // website: true,
                        company_settings: {
                            select: {
                                timezone: true,
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

        res.json({ success: true, data: job });

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

