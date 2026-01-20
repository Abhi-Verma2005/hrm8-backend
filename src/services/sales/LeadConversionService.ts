/**
 * LeadConversionService
 * Business logic for lead conversion approval workflow
 */

import { LeadConversionRequestModel, LeadConversionRequestData } from '../../models/LeadConversionRequest';
import { ConversionRequestStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class LeadConversionService {
    /**
     * Submit a conversion request
     * Validates 2-attempt limit and creates request
     */
    static async submitConversionRequest(
        leadId: string,
        consultantId: string,
        data: {
            agentNotes?: string;
            tempPassword?: string;
        }
    ): Promise<{ success: boolean; request?: LeadConversionRequestData; error?: string }> {
        try {
            // ... (validations remain same)
            // 1. Verify lead exists and is assigned to consultant
            const lead = await prisma.lead.findUnique({
                where: { id: leadId },
                select: {
                    id: true,
                    assigned_consultant_id: true,
                    region_id: true,
                    company_name: true,
                    email: true,
                    phone: true,
                    website: true,
                    country: true,
                    city: true,
                    state_province: true,
                    status: true,
                    converted_to_company_id: true,
                },
            });

            if (!lead) {
                return { success: false, error: 'Lead not found' };
            }

            if (lead.assigned_consultant_id !== consultantId) {
                return { success: false, error: 'Lead is not assigned to you' };
            }

            if (lead.status === 'CONVERTED') {
                return { success: false, error: 'Lead has already been converted' };
            }

            if (!lead.region_id) {
                return { success: false, error: 'Lead must have a region assigned' };
            }

            // 2. Check for existing pending request
            const pendingCount = await LeadConversionRequestModel.countByLeadAndStatus(
                leadId,
                ['PENDING']
            );

            if (pendingCount > 0) {
                return { success: false, error: 'A pending conversion request already exists for this lead' };
            }

            // 3. Check 2-attempt limit
            const totalAttempts = await LeadConversionRequestModel.countByLeadAndStatus(
                leadId,
                ['PENDING', 'APPROVED', 'DECLINED', 'CONVERTED']
            );

            if (totalAttempts >= 2) {
                return { success: false, error: 'Maximum 2 conversion attempts allowed per lead' };
            }

            // 4. Create conversion request
            const request = await LeadConversionRequestModel.create({
                leadId,
                consultantId,
                regionId: lead.region_id,
                companyName: lead.company_name,
                email: lead.email,
                phone: lead.phone || undefined,
                website: lead.website || undefined,
                country: lead.country,
                city: lead.city || undefined,
                stateProvince: lead.state_province || undefined,
                agentNotes: data.agentNotes,
                tempPassword: data.tempPassword, // Save the password
            });

            return { success: true, request };
        } catch (error: any) {
            console.error('Submit conversion request error:', error);
            return { success: false, error: error.message || 'Failed to submit conversion request' };
        }
    }

    /**
     * Get consultant's conversion requests
     */
    static async getConsultantRequests(
            consultantId: string,
            filters?: { status?: ConversionRequestStatus }
        ): Promise<LeadConversionRequestData[]> {
        return await LeadConversionRequestModel.findByConsultant(consultantId, filters);
    }

    /**
     * Get regional conversion requests (for regional admin)
     */
    static async getRegionalRequests(
        regionId: string,
        filters?: { status?: ConversionRequestStatus }
    ): Promise<LeadConversionRequestData[]> {
        return await LeadConversionRequestModel.findByRegion(regionId, filters);
    }

    /**
     * Get all conversion requests (for global admin)
     */
    static async getAllRequests(filters?: {
        status?: ConversionRequestStatus;
        regionIds?: string[];
    }): Promise<LeadConversionRequestData[]> {
        return await LeadConversionRequestModel.findAll(filters);
    }

    /**
     * Approve conversion request and auto-convert lead
     */
    static async approveRequest(
        requestId: string,
        adminId: string,
        notes?: string
    ): Promise<{ success: boolean; request?: LeadConversionRequestData; company?: any; error?: string }> {
        try {
            // 1. Get request details
            const request = await LeadConversionRequestModel.findById(requestId);

            if (!request) {
                return { success: false, error: 'Conversion request not found' };
            }

            if (request.status !== 'PENDING') {
                return { success: false, error: 'Can only approve pending requests' };
            }

            // 2. Approve the request
            await LeadConversionRequestModel.approve(requestId, adminId, notes);

            // 3. Auto-convert lead to company
            const { LeadService } = await import('./LeadService');

            // Use provided temp password or fallback to generated one (though UI enforces it)
            const tempPassword = request.tempPassword || Math.random().toString(36).slice(-8);

            const company = await LeadService.convertLeadToCompany(request.leadId, {
                email: request.email,
                // Use domain from website if possible
                domain: request.website ? request.website.replace(/^https?:\/\//, '') : undefined,

                // Admin details required by LeadService
                adminFirstName: 'Company',
                adminLastName: 'Admin',
                password: tempPassword,
                acceptTerms: true,
            });

            // 4. Mark request as converted
            const convertedRequest = await LeadConversionRequestModel.markAsConverted(
                requestId,
                company.id
            );

            return { success: true, request: convertedRequest, company };
        } catch (error: any) {
            console.error('Approve conversion request error:', error);
            return { success: false, error: error.message || 'Failed to approve conversion request' };
        }
    }

    /**
     * Decline conversion request
     */
    static async declineRequest(
        requestId: string,
        adminId: string,
        reason: string
    ): Promise<{ success: boolean; request?: LeadConversionRequestData; error?: string }> {
        try {
            const request = await LeadConversionRequestModel.findById(requestId);

            if (!request) {
                return { success: false, error: 'Conversion request not found' };
            }

            if (request.status !== 'PENDING') {
                return { success: false, error: 'Can only decline pending requests' };
            }

            if (!reason || reason.trim() === '') {
                return { success: false, error: 'Decline reason is required' };
            }

            const declinedRequest = await LeadConversionRequestModel.decline(requestId, adminId, reason);

            return { success: true, request: declinedRequest };
        } catch (error: any) {
            console.error('Decline conversion request error:', error);
            return { success: false, error: error.message || 'Failed to decline conversion request' };
        }
    }

    /**
     * Cancel a pending conversion request
     */
    static async cancelRequest(
        requestId: string,
        consultantId: string
    ): Promise<{ success: boolean; request?: LeadConversionRequestData; error?: string }> {
        try {
            const request = await LeadConversionRequestModel.findById(requestId);

            if (!request) {
                return { success: false, error: 'Conversion request not found' };
            }

            if (request.consultantId !== consultantId) {
                return { success: false, error: 'Unauthorized' };
            }

            if (request.status !== 'PENDING') {
                return { success: false, error: 'Can only cancel pending requests' };
            }

            const cancelledRequest = await LeadConversionRequestModel.cancel(requestId);

            return { success: true, request: cancelledRequest };
        } catch (error: any) {
            console.error('Cancel conversion request error:', error);
            return { success: false, error: error.message || 'Failed to cancel conversion request' };
        }
    }

    /**
     * Get request by ID with authorization check
     */
    static async getRequestById(
        requestId: string,
        userId: string,
        userRole: 'consultant' | 'admin'
    ): Promise<{ success: boolean; request?: LeadConversionRequestData; error?: string }> {
        try {
            const request = await LeadConversionRequestModel.findById(requestId);

            if (!request) {
                return { success: false, error: 'Conversion request not found' };
            }

            // Authorization check
            if (userRole === 'consultant' && request.consultantId !== userId) {
                return { success: false, error: 'Unauthorized' };
            }

            return { success: true, request };
        } catch (error: any) {
            console.error('Get conversion request error:', error);
            return { success: false, error: error.message || 'Failed to get conversion request' };
        }
    }
}
