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
            where: { candidateId },
            orderBy: [
                { isDefault: 'desc' },
                { uploadedAt: 'desc' }
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
            where: { candidateId },
            orderBy: { version: 'desc' },
        });

        const nextVersion = latestResume ? latestResume.version + 1 : 1;

        return await prisma.candidateResume.create({
            data: {
                candidateId,
                fileName,
                fileUrl,
                fileSize,
                fileType,
                version: nextVersion,
                isDefault: false, // New uploads are not default by default
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
            where: { id: resumeId, candidateId },
        });

        if (!resume) {
            throw new Error('Resume not found');
        }

        // Unset all other defaults
        await prisma.candidateResume.updateMany({
            where: { candidateId, isDefault: true },
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
            where: { id: resumeId, candidateId },
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
            where: { candidateId },
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
        return await prisma.candidateCoverLetter.create({
            data: {
                candidateId,
                ...data,
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
            where: { id: coverLetterId, candidateId },
        });

        if (!coverLetter) {
            throw new Error('Cover letter not found');
        }

        return await prisma.candidateCoverLetter.update({
            where: { id: coverLetterId },
            data,
        });
    }

    /**
     * Delete a cover letter
     */
    static async deleteCoverLetter(candidateId: string, coverLetterId: string) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const coverLetter = await prisma.candidateCoverLetter.findFirst({
            where: { id: coverLetterId, candidateId },
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
            where: { candidateId },
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
        return await prisma.candidatePortfolio.create({
            data: {
                candidateId,
                ...data,
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
            where: { id: portfolioId, candidateId },
        });

        if (!portfolio) {
            throw new Error('Portfolio item not found');
        }

        return await prisma.candidatePortfolio.update({
            where: { id: portfolioId },
            data,
        });
    }

    /**
     * Delete a portfolio item
     */
    static async deletePortfolioItem(candidateId: string, portfolioId: string) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const portfolio = await prisma.candidatePortfolio.findFirst({
            where: { id: portfolioId, candidateId },
        });

        if (!portfolio) {
            throw new Error('Portfolio item not found');
        }

        return await prisma.candidatePortfolio.delete({
            where: { id: portfolioId },
        });
    }
}

