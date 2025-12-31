import { prisma } from '../../lib/prisma';
import { randomUUID } from 'crypto';

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
        return await prisma.candidateEducation.findMany({
            where: { candidate_id: candidateId },
            orderBy: { end_date: 'desc' },
        });
    }

    /**
     * Add education record
     */
    static async addEducation(candidateId: string, data: any) {
        const normalized = normalizeDates(data, ['startDate', 'endDate', 'start_date', 'end_date']);
        
        const educationData = {
            id: data.id || randomUUID(),
            candidate_id: candidateId,
            institution: normalized.institution,
            degree: normalized.degree,
            field: normalized.field,
            start_date: normalized.startDate || normalized.start_date,
            end_date: normalized.endDate || normalized.end_date,
            current: normalized.current || false,
            grade: normalized.grade,
            description: normalized.description,
            updated_at: new Date(),
        };

        return await prisma.candidateEducation.create({
            data: educationData,
        });
    }

    /**
     * Update education record
     */
    static async updateEducation(candidateId: string, id: string, data: any) {
        // Verify ownership
        const existing = await prisma.candidateEducation.findFirst({
            where: { id, candidate_id: candidateId },
        });

        if (!existing) {
            throw new Error('Education record not found');
        }

        const normalized = normalizeDates(data, ['startDate', 'endDate', 'start_date', 'end_date']);
        
        const updateData: any = {};
        if (normalized.institution !== undefined) updateData.institution = normalized.institution;
        if (normalized.degree !== undefined) updateData.degree = normalized.degree;
        if (normalized.field !== undefined) updateData.field = normalized.field;
        if (normalized.startDate !== undefined || normalized.start_date !== undefined) 
            updateData.start_date = normalized.startDate || normalized.start_date;
        if (normalized.endDate !== undefined || normalized.end_date !== undefined) 
            updateData.end_date = normalized.endDate || normalized.end_date;
        if (normalized.current !== undefined) updateData.current = normalized.current;
        if (normalized.grade !== undefined) updateData.grade = normalized.grade;
        if (normalized.description !== undefined) updateData.description = normalized.description;
        updateData.updated_at = new Date();

        return await prisma.candidateEducation.update({
            where: { id },
            data: updateData,
        });
    }

    /**
     * Delete education record
     */
    static async deleteEducation(candidateId: string, id: string) {
        // Verify ownership
        const existing = await prisma.candidateEducation.findFirst({
            where: { id, candidate_id: candidateId },
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
        return await prisma.candidateCertification.findMany({
            where: { candidate_id: candidateId },
            orderBy: { issue_date: 'desc' },
        });
    }

    /**
     * Add certification
     */
    static async addCertification(candidateId: string, data: any) {
        const normalized = normalizeDates(data, ['issueDate', 'expiryDate', 'issue_date', 'expiry_date']);
        
        return await prisma.candidateCertification.create({
            data: {
                id: data.id || randomUUID(),
                candidate_id: candidateId,
                name: normalized.name,
                issuing_org: normalized.issuingOrg || normalized.issuing_org,
                issue_date: normalized.issueDate || normalized.issue_date,
                expiry_date: normalized.expiryDate || normalized.expiry_date,
                credential_id: normalized.credentialId || normalized.credential_id,
                credential_url: normalized.credentialUrl || normalized.credential_url,
                does_not_expire: normalized.doesNotExpire || normalized.does_not_expire || false,
                updated_at: new Date(),
            },
        });
    }

    /**
     * Update certification
     */
    static async updateCertification(candidateId: string, id: string, data: any) {
        // Verify ownership
        const existing = await prisma.candidateCertification.findFirst({
            where: { id, candidate_id: candidateId },
        });

        if (!existing) {
            throw new Error('Certification not found');
        }

        const normalized = normalizeDates(data, ['issueDate', 'expiryDate', 'issue_date', 'expiry_date']);
        
        const updateData: any = {};
        if (normalized.name !== undefined) updateData.name = normalized.name;
        if (normalized.issuingOrg !== undefined || normalized.issuing_org !== undefined)
            updateData.issuing_org = normalized.issuingOrg || normalized.issuing_org;
        if (normalized.issueDate !== undefined || normalized.issue_date !== undefined)
            updateData.issue_date = normalized.issueDate || normalized.issue_date;
        if (normalized.expiryDate !== undefined || normalized.expiry_date !== undefined)
            updateData.expiry_date = normalized.expiryDate || normalized.expiry_date;
        if (normalized.credentialId !== undefined || normalized.credential_id !== undefined)
            updateData.credential_id = normalized.credentialId || normalized.credential_id;
        if (normalized.credentialUrl !== undefined || normalized.credential_url !== undefined)
            updateData.credential_url = normalized.credentialUrl || normalized.credential_url;
        if (normalized.doesNotExpire !== undefined || normalized.does_not_expire !== undefined)
            updateData.does_not_expire = normalized.doesNotExpire || normalized.does_not_expire;
        updateData.updated_at = new Date();

        return await prisma.candidateCertification.update({
            where: { id },
            data: updateData,
        });
    }

    /**
     * Delete certification
     */
    static async deleteCertification(candidateId: string, id: string) {
        // Verify ownership
        const existing = await prisma.candidateCertification.findFirst({
            where: { id, candidate_id: candidateId },
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
        return await prisma.candidateTraining.findMany({
            where: { candidate_id: candidateId },
            orderBy: { completed_date: 'desc' },
        });
    }

    /**
     * Add training record
     */
    static async addTraining(candidateId: string, data: any) {
        const normalized = normalizeDates(data, ['completedDate', 'completed_date']);
        
        return await prisma.candidateTraining.create({
            data: {
                id: data.id || randomUUID(),
                candidate_id: candidateId,
                course_name: normalized.courseName || normalized.course_name,
                provider: normalized.provider,
                completed_date: normalized.completedDate || normalized.completed_date,
                duration: normalized.duration,
                description: normalized.description,
                certificate_url: normalized.certificateUrl || normalized.certificate_url,
                updated_at: new Date(),
            },
        });
    }

    /**
     * Update training record
     */
    static async updateTraining(candidateId: string, id: string, data: any) {
        // Verify ownership
        const existing = await prisma.candidateTraining.findFirst({
            where: { id, candidate_id: candidateId },
        });

        if (!existing) {
            throw new Error('Training record not found');
        }

        const normalized = normalizeDates(data, ['completedDate', 'completed_date']);
        
        const updateData: any = {};
        if (normalized.courseName !== undefined || normalized.course_name !== undefined)
            updateData.course_name = normalized.courseName || normalized.course_name;
        if (normalized.provider !== undefined) updateData.provider = normalized.provider;
        if (normalized.completedDate !== undefined || normalized.completed_date !== undefined)
            updateData.completed_date = normalized.completedDate || normalized.completed_date;
        if (normalized.duration !== undefined) updateData.duration = normalized.duration;
        if (normalized.description !== undefined) updateData.description = normalized.description;
        if (normalized.certificateUrl !== undefined || normalized.certificate_url !== undefined)
            updateData.certificate_url = normalized.certificateUrl || normalized.certificate_url;
        updateData.updated_at = new Date();

        return await prisma.candidateTraining.update({
            where: { id },
            data: updateData,
        });
    }

    /**
     * Delete training record
     */
    static async deleteTraining(candidateId: string, id: string) {
        // Verify ownership
        const existing = await prisma.candidateTraining.findFirst({
            where: { id, candidate_id: candidateId },
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
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        return await prisma.candidateCertification.findMany({
            where: {
                candidate_id: candidateId,
                does_not_expire: false,
                expiry_date: {
                    lte: thirtyDaysFromNow,
                    gte: new Date(),
                },
            },
            orderBy: { expiry_date: 'asc' },
        });
    }

    /**
     * Delete all education records for a candidate
     */
    static async deleteAllEducation(candidateId: string) {
        return await prisma.candidateEducation.deleteMany({
            where: { candidate_id: candidateId },
        });
    }

    /**
     * Delete all certifications for a candidate
     */
    static async deleteAllCertifications(candidateId: string) {
        return await prisma.candidateCertification.deleteMany({
            where: { candidate_id: candidateId },
        });
    }

    /**
     * Delete all training records for a candidate
     */
    static async deleteAllTraining(candidateId: string) {
        return await prisma.candidateTraining.deleteMany({
            where: { candidate_id: candidateId },
        });
    }
}
