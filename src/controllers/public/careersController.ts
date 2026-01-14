/**
 * Public Careers Controller
 * Handles public endpoints for viewing approved company careers pages
 */
import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

/**
 * Get all approved companies with careers pages
 * GET /api/public/companies
 */
export const getPublicCompanies = async (req: Request, res: Response): Promise<any> => {
    try {
        const { search, limit = '50', offset = '0' } = req.query;

        const where: any = {
            careers_page_status: 'APPROVED',
        };

        if (search && typeof search === 'string') {
            where.name = {
                contains: search,
                mode: 'insensitive',
            };
        }

        const companies = await prisma.company.findMany({
            where,
            select: {
                id: true,
                name: true,
                website: true,
                domain: true,
                careers_page_logo: true,
                careers_page_banner: true,
                careers_page_about: true,
                careers_page_social: true,
                careers_page_images: true,
                _count: {
                    select: {
                        jobs: {
                            where: {
                                status: 'OPEN',
                                visibility: 'public',
                            },
                        },
                    },
                },
            },
            orderBy: { name: 'asc' },
            take: parseInt(limit as string, 10),
            skip: parseInt(offset as string, 10),
        });

        const total = await prisma.company.count({ where });

        return res.json({
            success: true,
            data: {
                companies: companies.map((c) => ({
                    id: c.id,
                    name: c.name,
                    website: c.website,
                    domain: c.domain,
                    logoUrl: c.careers_page_logo,
                    bannerUrl: c.careers_page_banner,
                    about: c.careers_page_about,
                    social: c.careers_page_social,
                    images: c.careers_page_images,
                    jobCount: c._count.jobs,
                })),
                total,
                limit: parseInt(limit as string, 10),
                offset: parseInt(offset as string, 10),
            },
        });
    } catch (error) {
        console.error('Failed to fetch public companies:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch companies',
        });
    }
};

/**
 * Get a single company's public careers page with their open jobs
 * GET /api/public/careers/companies/:id
 */
export const getPublicCompanyDetail = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const { department, location, tags, search, limit = '20', offset = '0' } = req.query;

        console.log('[CareersController] Getting company detail for ID:', id);

        const company = await prisma.company.findFirst({
            where: {
                id,
                careers_page_status: 'APPROVED',
            },
            select: {
                id: true,
                name: true,
                website: true,
                domain: true,
                careers_page_logo: true,
                careers_page_banner: true,
                careers_page_about: true,
                careers_page_social: true,
                careers_page_images: true,
            },
        });

        if (!company) {
            console.log('[CareersController] Company not found or not approved:', id);
            return res.status(404).json({
                success: false,
                error: 'Company not found or careers page not approved',
            });
        }

        console.log('[CareersController] Found company:', company.name);

        // Build job filters
        const jobWhere: any = {
            company_id: id,
            status: 'OPEN',
            visibility: 'public',
        };

        if (department && typeof department === 'string') {
            jobWhere.department = {
                contains: department,
                mode: 'insensitive',
            };
        }

        if (location && typeof location === 'string') {
            jobWhere.location = {
                contains: location,
                mode: 'insensitive',
            };
        }

        if (tags && typeof tags === 'string' && tags.trim()) {
            const tagList = tags.split(',').filter(t => t.trim());
            if (tagList.length > 0) {
                jobWhere.promotional_tags = {
                    hasSome: tagList,
                };
            }
        }

        if (search && typeof search === 'string') {
            jobWhere.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        let jobs: any[] = [];
        let totalJobs = 0;
        let departments: string[] = [];
        let locations: string[] = [];

        try {
            jobs = await prisma.job.findMany({
                where: jobWhere,
                select: {
                    id: true,
                    title: true,
                    department: true,
                    location: true,
                    employment_type: true,
                    work_arrangement: true,
                    category: true,
                    salary_min: true,
                    salary_max: true,
                    salary_currency: true,
                    promotional_tags: true,
                    posting_date: true,
                },
                orderBy: { posting_date: 'desc' },
                take: parseInt(limit as string, 10),
                skip: parseInt(offset as string, 10),
            });

            totalJobs = await prisma.job.count({ where: jobWhere });

            // Get filter options (departments and locations from this company's jobs)
            const filterOptions = await prisma.job.groupBy({
                by: ['department', 'location'],
                where: {
                    company_id: id,
                    status: 'OPEN',
                    visibility: 'public',
                },
            });

            departments = [...new Set(filterOptions.map((f) => f.department).filter(Boolean))] as string[];
            locations = [...new Set(filterOptions.map((f) => f.location).filter(Boolean))] as string[];
        } catch (jobError) {
            console.error('[CareersController] Error fetching jobs:', jobError);
            // Continue with empty jobs if there's an error
        }

        return res.json({
            success: true,
            data: {
                company: {
                    id: company.id,
                    name: company.name,
                    website: company.website,
                    domain: company.domain,
                    logoUrl: company.careers_page_logo,
                    bannerUrl: company.careers_page_banner,
                    about: company.careers_page_about,
                    social: company.careers_page_social,
                    images: company.careers_page_images,
                },
                jobs: jobs.map((j) => ({
                    id: j.id,
                    title: j.title,
                    department: j.department,
                    location: j.location,
                    employmentType: j.employment_type,
                    workArrangement: j.work_arrangement,
                    experienceLevel: j.experience_level,
                    salaryMin: j.salary_min,
                    salaryMax: j.salary_max,
                    salaryCurrency: j.salary_currency,
                    tags: j.promotional_tags,
                    postedAt: j.posting_date,
                })),
                totalJobs,
                filters: {
                    departments,
                    locations,
                },
                pagination: {
                    limit: parseInt(limit as string, 10),
                    offset: parseInt(offset as string, 10),
                },
            },
        });
    } catch (error) {
        console.error('Failed to fetch public company detail:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch company details',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
