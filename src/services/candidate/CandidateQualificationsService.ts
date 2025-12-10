/**
 * Candidate Qualifications Service
 * Handles education, certifications, and training data
 */

/**
 * Helper to convert date string to ISO-8601 DateTime
 */
function toIsoDateTime(dateStr: string | undefined | null): string | undefined {
    if (!dateStr) return undefined;

    // If already in ISO format, return as is
    if (dateStr.includes('T')) return dateStr;

    // Convert YYYY-MM-DD to ISO-8601
    return new Date(dateStr + 'T00:00:00Z').toISOString();
}

/**
 * Normalize date fields in data object
 */
function normalizeDates(data: any, dateFields: string[]): any {
    const normalized = { ...data };
    for (const field of dateFields) {
        if (normalized[field]) {
            normalized[field] = toIsoDateTime(normalized[field]);
        }
    }
    return normalized;
}

export class CandidateQualificationsService {
    /**
     * Get all education records
     */
    static async getEducation(candidateId: string) {
        const { prisma } = await import('../../lib/prisma');
        return await prisma.candidateEducation.findMany({
            where: { candidateId },
            orderBy: { endDate: 'desc' },
        });
    }

    /**
     * Add education record
     */
    static async addEducation(candidateId: string, data: any) {
        const { prisma } = await import('../../lib/prisma');
        const { randomUUID } = await import('crypto');
        const normalized = normalizeDates(data, ['startDate', 'endDate']);
        return await prisma.candidateEducation.create({
            data: {
                id: randomUUID(),
                candidateId,
                ...normalized,
            },
        });
    }

    /**
     * Update education record
     */
    static async updateEducation(candidateId: string, id: string, data: any) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const existing = await prisma.candidateEducation.findFirst({
            where: { id, candidateId },
        });

        if (!existing) {
            throw new Error('Education record not found');
        }

        const normalized = normalizeDates(data, ['startDate', 'endDate']);
        return await prisma.candidateEducation.update({
            where: { id },
            data: normalized,
        });
    }

    /**
     * Delete education record
     */
    static async deleteEducation(candidateId: string, id: string) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const existing = await prisma.candidateEducation.findFirst({
            where: { id, candidateId },
        });

        if (!existing) {
            throw new Error('Education record not found');
        }

        return await prisma.candidateEducation.delete({
            where: { id },
        });
    }

    /**
     * Get all certifications
     */
    static async getCertifications(candidateId: string) {
        const { prisma } = await import('../../lib/prisma');
        return await prisma.candidateCertification.findMany({
            where: { candidateId },
            orderBy: { issueDate: 'desc' },
        });
    }

    /**
     * Add certification
     */
    static async addCertification(candidateId: string, data: any) {
        const { prisma } = await import('../../lib/prisma');
        const { randomUUID } = await import('crypto');
        const normalized = normalizeDates(data, ['issueDate', 'expiryDate']);
        return await prisma.candidateCertification.create({
            data: {
                id: randomUUID(),
                candidateId,
                ...normalized,
            },
        });
    }

    /**
     * Update certification
     */
    static async updateCertification(candidateId: string, id: string, data: any) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const existing = await prisma.candidateCertification.findFirst({
            where: { id, candidateId },
        });

        if (!existing) {
            throw new Error('Certification not found');
        }

        const normalized = normalizeDates(data, ['issueDate', 'expiryDate']);
        return await prisma.candidateCertification.update({
            where: { id },
            data: normalized,
        });
    }

    /**
     * Delete certification
     */
    static async deleteCertification(candidateId: string, id: string) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const existing = await prisma.candidateCertification.findFirst({
            where: { id, candidateId },
        });

        if (!existing) {
            throw new Error('Certification not found');
        }

        return await prisma.candidateCertification.delete({
            where: { id },
        });
    }

    /**
     * Get all training records
     */
    static async getTraining(candidateId: string) {
        const { prisma } = await import('../../lib/prisma');
        return await prisma.candidateTraining.findMany({
            where: { candidateId },
            orderBy: { completedDate: 'desc' },
        });
    }

    /**
     * Add training record
     */
    static async addTraining(candidateId: string, data: any) {
        const { prisma } = await import('../../lib/prisma');
        const { randomUUID } = await import('crypto');
        const normalized = normalizeDates(data, ['completedDate']);
        return await prisma.candidateTraining.create({
            data: {
                id: randomUUID(),
                candidateId,
                ...normalized,
            },
        });
    }

    /**
     * Update training record
     */
    static async updateTraining(candidateId: string, id: string, data: any) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const existing = await prisma.candidateTraining.findFirst({
            where: { id, candidateId },
        });

        if (!existing) {
            throw new Error('Training record not found');
        }

        const normalized = normalizeDates(data, ['completedDate']);
        return await prisma.candidateTraining.update({
            where: { id },
            data: normalized,
        });
    }

    /**
     * Delete training record
     */
    static async deleteTraining(candidateId: string, id: string) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const existing = await prisma.candidateTraining.findFirst({
            where: { id, candidateId },
        });

        if (!existing) {
            throw new Error('Training record not found');
        }

        return await prisma.candidateTraining.delete({
            where: { id },
        });
    }

    /**
     * Get expiring certifications (within next 30 days)
     */
    static async getExpiringCertifications(candidateId: string) {
        const { prisma } = await import('../../lib/prisma');
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        return await prisma.candidateCertification.findMany({
            where: {
                candidateId,
                doesNotExpire: false,
                expiryDate: {
                    lte: thirtyDaysFromNow,
                    gte: new Date(),
                },
            },
            orderBy: { expiryDate: 'asc' },
        });
    }

    /**
     * Delete all education records for a candidate
     */
    static async deleteAllEducation(candidateId: string) {
        const { prisma } = await import('../../lib/prisma');
        return await prisma.candidateEducation.deleteMany({
            where: { candidateId },
        });
    }

    /**
     * Delete all certifications for a candidate
     */
    static async deleteAllCertifications(candidateId: string) {
        const { prisma } = await import('../../lib/prisma');
        return await prisma.candidateCertification.deleteMany({
            where: { candidateId },
        });
    }

    /**
     * Delete all training records for a candidate
     */
    static async deleteAllTraining(candidateId: string) {
        const { prisma } = await import('../../lib/prisma');
        return await prisma.candidateTraining.deleteMany({
            where: { candidateId },
        });
    }
}
