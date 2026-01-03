import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface CreateTagDTO {
    name: string;
    slug?: string;
    color?: string;
    description?: string;
}

export interface UpdateTagDTO extends Partial<CreateTagDTO> {
    is_active?: boolean;
}

export class TagService {
    async getAllTags(includeInactive = false) {
        const where: Prisma.JobTagWhereInput = includeInactive
            ? {}
            : { is_active: true };

        return prisma.jobTag.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { jobs: true }
                }
            }
        });
    }

    async getTagById(id: string) {
        const tag = await prisma.jobTag.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { jobs: true }
                }
            }
        });

        if (!tag) {
            throw new Error('Tag not found');
        }

        return tag;
    }

    async createTag(data: CreateTagDTO) {
        const slug = data.slug || this.generateSlug(data.name);

        const existing = await prisma.jobTag.findUnique({
            where: { slug }
        });

        if (existing) {
            throw new Error('Tag with this slug already exists');
        }

        return prisma.jobTag.create({
            data: {
                ...data,
                slug
            }
        });
    }

    async updateTag(id: string, data: UpdateTagDTO) {
        await this.getTagById(id);

        if (data.slug) {
            const existing = await prisma.jobTag.findFirst({
                where: {
                    slug: data.slug,
                    id: { not: id }
                }
            });

            if (existing) {
                throw new Error('Tag with this slug already exists');
            }
        }

        return prisma.jobTag.update({
            where: { id },
            data
        });
    }

    async deleteTag(id: string) {
        // Delete all assignments first (cascade should handle this, but being explicit)
        await prisma.jobTagAssignment.deleteMany({
            where: { tag_id: id }
        });

        return prisma.jobTag.delete({
            where: { id }
        });
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
}
