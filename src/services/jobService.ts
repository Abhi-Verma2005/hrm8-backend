import { prisma } from '../lib/prisma';
import { JobStatus, Prisma } from '@prisma/client';

// const prisma = new PrismaClient(); // Removed

export interface CreateJobDTO {
    title: string;
    description: string;
    responsibilities?: string;
    requirements?: string;
    location: string;
    job_type: string; // Will map to EmploymentType internally if needed, or matched enum
    salary_min?: number;
    salary_max?: number;
    salary_currency?: string;
    benefits?: string;
    expires_at?: Date | string;
    category?: string; // Legacy field - keep for backward compatibility
    category_id?: string; // NEW: FK to JobCategory
    tag_ids?: string[]; // NEW: Array of JobTag IDs
    status?: JobStatus;
}

export interface UpdateJobDTO extends Partial<CreateJobDTO> { }

export interface JobFilters {
    status?: JobStatus;
    page?: number;
    limit?: number;
    search?: string;
}

export class JobService {
    /**
     * Get jobs for a specific employer (company)
     */
    async getEmployerJobs(companyId: string, filters: JobFilters) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;

        const where: Prisma.JobWhereInput = {
            company_id: companyId,
        };

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.search) {
            where.title = {
                contains: filters.search,
                mode: 'insensitive',
            };
        }

        const [jobs, total] = await Promise.all([
            prisma.job.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
                include: {
                    job_category: true,
                    tags: {
                        include: {
                            tag: true
                        }
                    },
                    _count: {
                        select: { applications: true }
                    }
                }
            }),
            prisma.job.count({ where }),
        ]);

        return {
            jobs,
            pagination: {
                total,
                page,
                limit,
                total_pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Create a new job
     */
    async createJob(userId: string, companyId: string, data: CreateJobDTO) {
        // Create the job
        const job = await prisma.job.create({
            data: {
                title: data.title,
                description: data.description,
                responsibilities: data.responsibilities ? [data.responsibilities] : [],
                requirements: data.requirements ? [data.requirements] : [],
                location: data.location,
                salary_min: data.salary_min,
                salary_max: data.salary_max,
                salary_currency: data.salary_currency || 'USD',
                benefits: data.benefits,
                expires_at: data.expires_at ? new Date(data.expires_at) : undefined,
                category: data.category, // Legacy field
                category_id: data.category_id || null, // NEW: FK to JobCategory
                status: data.status || 'OPEN',
                company_id: companyId,
                created_by: userId,
                posted_at: new Date(),
            },
        });

        // Handle tag assignments
        if (data.tag_ids && data.tag_ids.length > 0) {
            await prisma.jobTagAssignment.createMany({
                data: data.tag_ids.map(tagId => ({
                    job_id: job.id,
                    tag_id: tagId
                }))
            });
        }

        // Return job with relations
        return prisma.job.findUnique({
            where: { id: job.id },
            include: {
                job_category: true,
                tags: {
                    include: {
                        tag: true
                    }
                }
            }
        });
    }

    /**
     * Get a single job by ID (Employer verification)
     */
    async getJobById(jobId: string, companyId: string) {
        const job = await prisma.job.findFirst({
            where: {
                id: jobId,
                company_id: companyId,
            },
            include: {
                job_category: true,
                tags: {
                    include: {
                        tag: true
                    }
                }
            }
        });

        if (!job) {
            throw new Error('Job not found or access denied');
        }

        return job;
    }

    /**
     * Update a job
     */
    async updateJob(jobId: string, companyId: string, data: UpdateJobDTO) {
        // Verify ownership
        await this.getJobById(jobId, companyId);

        // Update the job
        await prisma.job.update({
            where: { id: jobId },
            data: {
                ...data,
                responsibilities: data.responsibilities ? [data.responsibilities] : undefined,
                requirements: data.requirements ? [data.requirements] : undefined,
                expires_at: data.expires_at ? new Date(data.expires_at) : undefined,
                category_id: data.category_id !== undefined ? data.category_id : undefined,
                updated_at: new Date(),
            },
        });

        // Handle tag updates if provided
        if (data.tag_ids !== undefined) {
            // Delete existing tag assignments
            await prisma.jobTagAssignment.deleteMany({
                where: { job_id: jobId }
            });

            // Create new assignments
            if (data.tag_ids.length > 0) {
                await prisma.jobTagAssignment.createMany({
                    data: data.tag_ids.map(tagId => ({
                        job_id: jobId,
                        tag_id: tagId
                    }))
                });
            }
        }

        // Return updated job with relations
        return prisma.job.findUnique({
            where: { id: jobId },
            include: {
                job_category: true,
                tags: {
                    include: {
                        tag: true
                    }
                }
            }
        });
    }

    /**
     * Change Job Status
     */
    async changeJobStatus(jobId: string, companyId: string, newStatus: JobStatus) {
        await this.getJobById(jobId, companyId);

        const data: Prisma.JobUpdateInput = {
            status: newStatus,
        };

        // If closing/filling, expire it
        if (newStatus === 'FILLED' || newStatus === 'CLOSED' || newStatus === 'CANCELLED') {
            data.expires_at = new Date();
        }

        return prisma.job.update({
            where: { id: jobId },
            data,
        });
    }

    /**
     * Soft delete (Cancel)
     */
    async deleteJob(jobId: string, companyId: string) {
        return this.changeJobStatus(jobId, companyId, 'CANCELLED');
    }
}
