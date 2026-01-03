import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface CreateCategoryDTO {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    color?: string;
    order?: number;
}

export interface UpdateCategoryDTO extends Partial<CreateCategoryDTO> {
    is_active?: boolean;
}

export class CategoryService {
    async getAllCategories(includeInactive = false) {
        const where: Prisma.JobCategoryWhereInput = includeInactive
            ? {}
            : { is_active: true };

        return prisma.jobCategory.findMany({
            where,
            orderBy: { order: 'asc' },
            include: {
                _count: {
                    select: { jobs: true }
                }
            }
        });
    }

    async getCategoryById(id: string) {
        const category = await prisma.jobCategory.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { jobs: true }
                }
            }
        });

        if (!category) {
            throw new Error('Category not found');
        }

        return category;
    }

    async createCategory(data: CreateCategoryDTO) {
        // Generate slug if not provided
        const slug = data.slug || this.generateSlug(data.name);

        // Check slug uniqueness
        const existing = await prisma.jobCategory.findUnique({
            where: { slug }
        });

        if (existing) {
            throw new Error('Category with this slug already exists');
        }

        return prisma.jobCategory.create({
            data: {
                ...data,
                slug
            }
        });
    }

    async updateCategory(id: string, data: UpdateCategoryDTO) {
        // Verify category exists
        await this.getCategoryById(id);

        // If slug is being updated, check uniqueness
        if (data.slug) {
            const existing = await prisma.jobCategory.findFirst({
                where: {
                    slug: data.slug,
                    id: { not: id }
                }
            });

            if (existing) {
                throw new Error('Category with this slug already exists');
            }
        }

        return prisma.jobCategory.update({
            where: { id },
            data
        });
    }

    async deleteCategory(id: string) {
        // Check if category has jobs
        const category = await this.getCategoryById(id);

        if (category._count.jobs > 0) {
            throw new Error(`Cannot delete category with ${category._count.jobs} associated jobs. Please reassign or delete the jobs first.`);
        }

        return prisma.jobCategory.delete({
            where: { id }
        });
    }

    async reorderCategories(newOrder: { id: string; order: number }[]) {
        // Use transaction to update all at once
        return prisma.$transaction(
            newOrder.map(({ id, order }) =>
                prisma.jobCategory.update({
                    where: { id },
                    data: { order }
                })
            )
        );
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
}
