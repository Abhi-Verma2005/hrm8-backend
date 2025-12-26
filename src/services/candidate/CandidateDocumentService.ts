/**
 * Candidate Document Service
 * Handles CRUD operations for resumes, cover letters, and portfolio items
 */

export class CandidateDocumentService {
    /**
     * Get all resumes for a candidate
     */
    static async getResumes(candidateId: string) {
        const { prisma } = await import('../../lib/prisma');
        return await prisma.candidateResume.findMany({
            where: { candidateId: candidateId },
            orderBy: [
                { isDefault: 'desc' },
                { uploadedAt: 'desc' }
            ],
        });
    }

    /**
     * Get a specific resume
     */
    static async getResume(resumeId: string) {
        const { prisma } = await import('../../lib/prisma');
        return await prisma.candidateResume.findUnique({
            where: { id: resumeId },
        });
    }

    /**
     * Find resume by URL
     */
    static async findByUrl(fileUrl: string) {
        const { prisma } = await import('../../lib/prisma');
        return await prisma.candidateResume.findFirst({
            where: { fileUrl: fileUrl },
        });
    }

    /**
     * Upload a new resume
     */
    static async uploadResume(
        candidateId: string,
        fileName: string,
        fileUrl: string,
        fileSize: number,
        fileType: string,
        content?: string
    ) {
        const { prisma } = await import('../../lib/prisma');

        // Get the highest version number for this candidate
        const latestResume = await prisma.candidateResume.findFirst({
            where: { candidateId: candidateId },
            orderBy: { version: 'desc' },
        });

        const nextVersion = latestResume ? latestResume.version + 1 : 1;

        const { randomUUID } = await import('crypto');
        return await prisma.candidateResume.create({
            data: {
                id: randomUUID(),
                candidateId: candidateId,
                fileName: fileName,
                fileUrl: fileUrl,
                fileSize: fileSize,
                fileType: fileType,
                version: nextVersion,
                isDefault: false, // New uploads are not default by default
                content: content,
            },
        });
    }

    /**
     * Set a resume as default
     */
    static async setDefaultResume(candidateId: string, resumeId: string) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const resume = await prisma.candidateResume.findFirst({
            where: { id: resumeId, candidateId: candidateId },
        });

        if (!resume) {
            throw new Error('Resume not found');
        }

        // Unset all other defaults
        await prisma.candidateResume.updateMany({
            where: { candidateId: candidateId, isDefault: true },
            data: { isDefault: false },
        });

        // Set this one as default
        return await prisma.candidateResume.update({
            where: { id: resumeId },
            data: { isDefault: true },
        });
    }

    /**
     * Delete a resume
     */
    static async deleteResume(candidateId: string, resumeId: string) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const resume = await prisma.candidateResume.findFirst({
            where: { id: resumeId, candidateId: candidateId },
        });

        if (!resume) {
            throw new Error('Resume not found');
        }

        return await prisma.candidateResume.delete({
            where: { id: resumeId },
        });
    }

    /**
     * Get all cover letters for a candidate
     */
    static async getCoverLetters(candidateId: string) {
        const { prisma } = await import('../../lib/prisma');
        return await prisma.candidateCoverLetter.findMany({
            where: { candidateId: candidateId },
            orderBy: [
                { isTemplate: 'desc' },
                { updatedAt: 'desc' }
            ],
        });
    }

    /**
     * Create a cover letter (draft or template)
     */
    static async createCoverLetter(
        candidateId: string,
        data: {
            title: string;
            content?: string;
            fileUrl?: string;
            fileName?: string;
            fileSize?: number;
            fileType?: string;
            isTemplate?: boolean;
            isDraft?: boolean;
        }
    ) {
        const { prisma } = await import('../../lib/prisma');
        const { randomUUID } = await import('crypto');
        return await prisma.candidateCoverLetter.create({
            data: {
                id: randomUUID(),
                candidateId: candidateId,
                title: data.title,
                content: data.content,
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                fileSize: data.fileSize,
                fileType: data.fileType,
                isTemplate: data.isTemplate ?? false,
                isDraft: data.isDraft ?? true,
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Update a cover letter
     */
    static async updateCoverLetter(
        candidateId: string,
        coverLetterId: string,
        data: {
            title?: string;
            content?: string;
            fileUrl?: string;
            fileName?: string;
            fileSize?: number;
            fileType?: string;
            isTemplate?: boolean;
            isDraft?: boolean;
        }
    ) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const coverLetter = await prisma.candidateCoverLetter.findFirst({
            where: { id: coverLetterId, candidateId: candidateId },
        });

        if (!coverLetter) {
            throw new Error('Cover letter not found');
        }

        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.content !== undefined) updateData.content = data.content;
        if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl;
        if (data.fileName !== undefined) updateData.fileName = data.fileName;
        if (data.fileSize !== undefined) updateData.fileSize = data.fileSize;
        if (data.fileType !== undefined) updateData.fileType = data.fileType;
        if (data.isTemplate !== undefined) updateData.isTemplate = data.isTemplate;
        if (data.isDraft !== undefined) updateData.isDraft = data.isDraft;
        updateData.updatedAt = new Date();

        return await prisma.candidateCoverLetter.update({
            where: { id: coverLetterId },
            data: updateData,
        });
    }

    /**
     * Delete a cover letter
     */
    static async deleteCoverLetter(candidateId: string, coverLetterId: string) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const coverLetter = await prisma.candidateCoverLetter.findFirst({
            where: { id: coverLetterId, candidateId: candidateId },
        });

        if (!coverLetter) {
            throw new Error('Cover letter not found');
        }

        return await prisma.candidateCoverLetter.delete({
            where: { id: coverLetterId },
        });
    }

    /**
     * Get all portfolio items for a candidate
     */
    static async getPortfolioItems(candidateId: string) {
        const { prisma } = await import('../../lib/prisma');
        return await prisma.candidatePortfolio.findMany({
            where: { candidateId: candidateId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Create a portfolio item (file or link)
     */
    static async createPortfolioItem(
        candidateId: string,
        data: {
            title: string;
            type: 'file' | 'link';
            fileUrl?: string;
            fileName?: string;
            fileSize?: number;
            fileType?: string;
            externalUrl?: string;
            platform?: string;
            description?: string;
        }
    ) {
        const { prisma } = await import('../../lib/prisma');
        const { randomUUID } = await import('crypto');
        return await prisma.candidatePortfolio.create({
            data: {
                id: randomUUID(),
                candidateId: candidateId,
                title: data.title,
                type: data.type,
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                fileSize: data.fileSize,
                fileType: data.fileType,
                externalUrl: data.externalUrl,
                platform: data.platform,
                description: data.description,
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Update a portfolio item
     */
    static async updatePortfolioItem(
        candidateId: string,
        portfolioId: string,
        data: {
            title?: string;
            fileUrl?: string;
            fileName?: string;
            fileSize?: number;
            fileType?: string;
            externalUrl?: string;
            platform?: string;
            description?: string;
        }
    ) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const portfolio = await prisma.candidatePortfolio.findFirst({
            where: { id: portfolioId, candidateId: candidateId },
        });

        if (!portfolio) {
            throw new Error('Portfolio item not found');
        }

        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl;
        if (data.fileName !== undefined) updateData.fileName = data.fileName;
        if (data.fileSize !== undefined) updateData.fileSize = data.fileSize;
        if (data.fileType !== undefined) updateData.fileType = data.fileType;
        if (data.externalUrl !== undefined) updateData.externalUrl = data.externalUrl;
        if (data.platform !== undefined) updateData.platform = data.platform;
        if (data.description !== undefined) updateData.description = data.description;
        updateData.updatedAt = new Date();

        return await prisma.candidatePortfolio.update({
            where: { id: portfolioId },
            data: updateData,
        });
    }

    /**
     * Delete a portfolio item
     */
    static async deletePortfolioItem(candidateId: string, portfolioId: string) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const portfolio = await prisma.candidatePortfolio.findFirst({
            where: { id: portfolioId, candidateId: candidateId },
        });

        if (!portfolio) {
            throw new Error('Portfolio item not found');
        }

        return await prisma.candidatePortfolio.delete({
            where: { id: portfolioId },
        });
    }
}

