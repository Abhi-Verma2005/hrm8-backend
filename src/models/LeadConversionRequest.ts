/**
 * LeadConversionRequestModel
 * Database operations for lead conversion requests
 */

import { ConversionRequestStatus } from '@prisma/client';
import prisma from '../lib/prisma';

export interface LeadConversionRequestData {
    id: string;
    leadId: string;
    consultantId: string;
    regionId: string;
    status: ConversionRequestStatus;
    companyName: string;
    email: string;
    phone?: string | null;
    website?: string | null;
    country: string;
    city?: string | null;
    stateProvince?: string | null;
    agentNotes?: string | null;
    reviewedBy?: string | null;
    reviewedAt?: Date | null;
    adminNotes?: string | null;
    declineReason?: string | null;
    tempPassword?: string | null;
    convertedAt?: Date | null;
    companyId?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class LeadConversionRequestModel {
    /**
     * Map Prisma model to data interface
     */
    private static mapToData(request: any): LeadConversionRequestData {
        return {
            id: request.id,
            leadId: request.lead_id,
            consultantId: request.consultant_id,
            regionId: request.region_id,
            status: request.status,
            companyName: request.company_name,
            email: request.email,
            phone: request.phone,
            website: request.website,
            country: request.country,
            city: request.city,
            stateProvince: request.state_province,
            agentNotes: request.agent_notes,
            reviewedBy: request.reviewed_by,
            reviewedAt: request.reviewed_at,
            adminNotes: request.admin_notes,
            declineReason: request.decline_reason,
            tempPassword: request.temp_password,
            convertedAt: request.converted_at,
            companyId: request.company_id,
            createdAt: request.created_at,
            updatedAt: request.updated_at,
        };
    }

    /**
     * Create a new conversion request
     */
    static async create(data: {
        leadId: string;
        consultantId: string;
        regionId: string;
        companyName: string;
        email: string;
        phone?: string;
        website?: string;
        country: string;
        city?: string;
        stateProvince?: string;
        agentNotes?: string;
        tempPassword?: string;
    }): Promise<LeadConversionRequestData> {
        const request = await prisma.leadConversionRequest.create({
            data: {
                lead_id: data.leadId,
                consultant_id: data.consultantId,
                region_id: data.regionId,
                company_name: data.companyName,
                email: data.email,
                phone: data.phone,
                website: data.website,
                country: data.country,
                city: data.city,
                state_province: data.stateProvince,
                agent_notes: data.agentNotes,
                temp_password: data.tempPassword,
            },
        });

        return this.mapToData(request);
    }

    /**
     * Find request by ID
     */
    static async findById(id: string): Promise<LeadConversionRequestData | null> {
        const request = await prisma.leadConversionRequest.findUnique({
            where: { id },
        });

        return request ? this.mapToData(request) : null;
    }

    /**
     * Find all requests for a lead
     */
    static async findByLeadId(leadId: string): Promise<LeadConversionRequestData[]> {
        const requests = await prisma.leadConversionRequest.findMany({
            where: { lead_id: leadId },
            orderBy: { created_at: 'desc' },
        });

        return requests.map(this.mapToData);
    }

    /**
     * Find requests by consultant with optional filters
     */
    static async findByConsultant(
        consultantId: string,
        filters?: { status?: ConversionRequestStatus }
    ): Promise<LeadConversionRequestData[]> {
        const where: any = { consultant_id: consultantId };

        if (filters?.status) {
            where.status = filters.status;
        }

        const requests = await prisma.leadConversionRequest.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });

        return requests.map(this.mapToData);
    }

    /**
     * Find requests by region with optional filters (for admin)
     */
    static async findByRegion(
        regionId: string,
        filters?: { status?: ConversionRequestStatus }
    ): Promise<LeadConversionRequestData[]> {
        const where: any = { region_id: regionId };

        if (filters?.status) {
            where.status = filters.status;
        }

        const requests = await prisma.leadConversionRequest.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });

        return requests.map(this.mapToData);
    }

    /**
     * Find all requests (for global admin)
     */
    static async findAll(filters?: {
        status?: ConversionRequestStatus;
        regionIds?: string[];
    }): Promise<LeadConversionRequestData[]> {
        const where: any = {};

        if (filters?.status) {
            where.status = filters.status;
        }

        if (filters?.regionIds) {
            where.region_id = { in: filters.regionIds };
        }

        const requests = await prisma.leadConversionRequest.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });

        return requests.map(this.mapToData);
    }

    /**
     * Approve a conversion request
     */
    static async approve(
        id: string,
        reviewerId: string,
        notes?: string
    ): Promise<LeadConversionRequestData> {
        const request = await prisma.leadConversionRequest.update({
            where: { id },
            data: {
                status: 'APPROVED',
                reviewed_by: reviewerId,
                reviewed_at: new Date(),
                admin_notes: notes,
            },
        });

        return this.mapToData(request);
    }

    /**
     * Decline a conversion request
     */
    static async decline(
        id: string,
        reviewerId: string,
        reason: string
    ): Promise<LeadConversionRequestData> {
        const request = await prisma.leadConversionRequest.update({
            where: { id },
            data: {
                status: 'DECLINED',
                reviewed_by: reviewerId,
                reviewed_at: new Date(),
                decline_reason: reason,
            },
        });

        return this.mapToData(request);
    }

    /**
     * Mark request as converted
     */
    static async markAsConverted(
        id: string,
        companyId: string
    ): Promise<LeadConversionRequestData> {
        const request = await prisma.leadConversionRequest.update({
            where: { id },
            data: {
                status: 'CONVERTED',
                converted_at: new Date(),
                company_id: companyId,
            },
        });

        return this.mapToData(request);
    }

    /**
     * Cancel a pending request
     */
    static async cancel(id: string): Promise<LeadConversionRequestData> {
        const request = await prisma.leadConversionRequest.update({
            where: { id },
            data: {
                status: 'CANCELLED',
            },
        });

        return this.mapToData(request);
    }

    /**
     * Count requests for a lead by status
     */
    static async countByLeadAndStatus(
        leadId: string,
        statuses: ConversionRequestStatus[]
    ): Promise<number> {
        return await prisma.leadConversionRequest.count({
            where: {
                lead_id: leadId,
                status: { in: statuses },
            },
        });
    }
}
