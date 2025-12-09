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
            where: { candidate_id: candidateId },
            orderBy: [
                { is_default: 'desc' },
                { uploaded_at: 'desc' }
            ],
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
        fileType: string
    ) {
        const { prisma } = await import('../../lib/prisma');

        // Get the highest version number for this candidate
        const latestResume = await prisma.candidateResume.findFirst({
            where: { candidate_id: candidateId },
            orderBy: { version: 'desc' },
        });

        const nextVersion = latestResume ? latestResume.version + 1 : 1;

        const { randomUUID } = await import('crypto');
        return await prisma.candidateResume.create({
            data: {
                id: randomUUID(),
                candidate_id: candidateId,
                file_name: fileName,
                file_url: fileUrl,
                file_size: fileSize,
                file_type: fileType,
                version: nextVersion,
                is_default: false, // New uploads are not default by default
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
            where: { id: resumeId, candidate_id: candidateId },
        });

        if (!resume) {
            throw new Error('Resume not found');
        }

        // Unset all other defaults
        await prisma.candidateResume.updateMany({
            where: { candidate_id: candidateId, is_default: true },
            data: { is_default: false },
        });

        // Set this one as default
        return await prisma.candidateResume.update({
            where: { id: resumeId },
            data: { is_default: true },
        });
    }

    /**
     * Delete a resume
     */
    static async deleteResume(candidateId: string, resumeId: string) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const resume = await prisma.candidateResume.findFirst({
            where: { id: resumeId, candidate_id: candidateId },
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
            where: { candidate_id: candidateId },
            orderBy: [
                { is_template: 'desc' },
                { updated_at: 'desc' }
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
                candidate_id: candidateId,
                title: data.title,
                content: data.content,
                file_url: data.fileUrl,
                file_name: data.fileName,
                file_size: data.fileSize,
                file_type: data.fileType,
                is_template: data.isTemplate ?? false,
                is_draft: data.isDraft ?? true,
                updated_at: new Date(),
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
            where: { id: coverLetterId, candidate_id: candidateId },
        });

        if (!coverLetter) {
            throw new Error('Cover letter not found');
        }

        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.content !== undefined) updateData.content = data.content;
        if (data.fileUrl !== undefined) updateData.file_url = data.fileUrl;
        if (data.fileName !== undefined) updateData.file_name = data.fileName;
        if (data.fileSize !== undefined) updateData.file_size = data.fileSize;
        if (data.fileType !== undefined) updateData.file_type = data.fileType;
        if (data.isTemplate !== undefined) updateData.is_template = data.isTemplate;
        if (data.isDraft !== undefined) updateData.is_draft = data.isDraft;
        updateData.updated_at = new Date();

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
            where: { id: coverLetterId, candidate_id: candidateId },
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
            where: { candidate_id: candidateId },
            orderBy: { created_at: 'desc' },
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
                candidate_id: candidateId,
                title: data.title,
                type: data.type,
                file_url: data.fileUrl,
                file_name: data.fileName,
                file_size: data.fileSize,
                file_type: data.fileType,
                external_url: data.externalUrl,
                platform: data.platform,
                description: data.description,
                updated_at: new Date(),
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
            where: { id: portfolioId, candidate_id: candidateId },
        });

        if (!portfolio) {
            throw new Error('Portfolio item not found');
        }

        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.fileUrl !== undefined) updateData.file_url = data.fileUrl;
        if (data.fileName !== undefined) updateData.file_name = data.fileName;
        if (data.fileSize !== undefined) updateData.file_size = data.fileSize;
        if (data.fileType !== undefined) updateData.file_type = data.fileType;
        if (data.externalUrl !== undefined) updateData.external_url = data.externalUrl;
        if (data.platform !== undefined) updateData.platform = data.platform;
        if (data.description !== undefined) updateData.description = data.description;
        updateData.updated_at = new Date();

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
            where: { id: portfolioId, candidate_id: candidateId },
        });

        if (!portfolio) {
            throw new Error('Portfolio item not found');
        }

        return await prisma.candidatePortfolio.delete({
            where: { id: portfolioId },
        });
    }
}

