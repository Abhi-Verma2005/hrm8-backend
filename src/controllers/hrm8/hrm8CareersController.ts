/**
 * HRM8 Careers Approval Controller
 * Handles global admin endpoints for approving/rejecting company careers pages
 */
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';

/**
 * Get all pending careers page requests
 * GET /api/hrm8/careers/requests
 */
export const getCareersRequests = async (_req: Request, res: Response): Promise<any> => {
    try {
        // Get companies with submitted full pages
        const submittedCompanies = await prisma.company.findMany({
            where: {
                careers_page_status: 'SUBMITTED',
            },
            select: {
                id: true,
                name: true,
                domain: true,
                careers_page_status: true,
                careers_pending_changes: true,
                updated_at: true,
            },
            orderBy: { updated_at: 'desc' },
        });

        // Get approved companies with pending section updates
        const sectionUpdates = await prisma.company.findMany({
            where: {
                careers_page_status: 'APPROVED',
                careers_pending_changes: {
                    not: Prisma.DbNull,
                },
            },
            select: {
                id: true,
                name: true,
                domain: true,
                careers_page_status: true,
                careers_page_logo: true,
                careers_page_banner: true,
                careers_page_about: true,
                careers_page_social: true,
                careers_page_images: true,
                careers_pending_changes: true,
                updated_at: true,
            },
            orderBy: { updated_at: 'desc' },
        });

        // Filter out companies with empty pending changes
        const validSectionUpdates = sectionUpdates.filter((c) => {
            const pending = c.careers_pending_changes as any;
            return pending && Object.keys(pending).length > 0;
        });

        const requests = [
            ...submittedCompanies.map((c) => ({
                id: c.id,
                companyName: c.name,
                domain: c.domain,
                type: 'NEW_PAGE' as const,
                status: c.careers_page_status,
                pending: c.careers_pending_changes,
                current: null,
                submittedAt: c.updated_at,
            })),
            ...validSectionUpdates.map((c) => ({
                id: c.id,
                companyName: c.name,
                domain: c.domain,
                type: 'SECTION_UPDATE' as const,
                status: c.careers_page_status,
                pending: c.careers_pending_changes,
                current: {
                    logoUrl: c.careers_page_logo,
                    bannerUrl: c.careers_page_banner,
                    about: c.careers_page_about,
                    social: c.careers_page_social,
                    images: c.careers_page_images,
                },
                submittedAt: c.updated_at,
            })),
        ];

        res.json({
            success: true,
            data: {
                requests,
                total: requests.length,
            },
        });
    } catch (error) {
        console.error('Failed to fetch careers requests:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch careers requests',
        });
    }
};

/**
 * Approve a careers page request
 * POST /api/hrm8/careers/:companyId/approve
 * Body: { section? } - if section specified, approve only that section
 */
export const approveCareersRequest = async (req: Request, res: Response): Promise<any> => {
    try {
        const { companyId } = req.params;
        const { section } = req.body;

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                careers_page_status: true,
                careers_page_logo: true,
                careers_page_banner: true,
                careers_page_about: true,
                careers_page_social: true,
                careers_page_images: true,
                careers_pending_changes: true,
            },
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Company not found',
            });
        }

        const pending = (company.careers_pending_changes as any) || {};

        // If it's a new page submission (status = SUBMITTED)
        if (company.careers_page_status === 'SUBMITTED') {
            await prisma.company.update({
                where: { id: companyId },
                data: {
                    careers_page_status: 'APPROVED',
                    careers_page_logo: pending.logoUrl || null,
                    careers_page_banner: pending.bannerUrl || null,
                    careers_page_about: pending.about || null,
                    careers_page_social: pending.social || null,
                    careers_page_images: pending.images || null,
                    careers_pending_changes: Prisma.DbNull, // Clear pending
                    careers_review_notes: Prisma.DbNull,
                },
            });

            return res.json({
                success: true,
                message: 'Careers page approved and now live',
            });
        }

        // For section updates on already approved pages
        if (section) {
            const updateData: any = {};
            const remainingPending = { ...pending };

            switch (section) {
                case 'logo':
                    if (pending.logoUrl !== undefined) {
                        updateData.careers_page_logo = pending.logoUrl;
                        delete remainingPending.logoUrl;
                    }
                    break;
                case 'banner':
                    if (pending.bannerUrl !== undefined) {
                        updateData.careers_page_banner = pending.bannerUrl;
                        delete remainingPending.bannerUrl;
                    }
                    break;
                case 'about':
                    if (pending.about !== undefined) {
                        updateData.careers_page_about = pending.about;
                        delete remainingPending.about;
                    }
                    break;
                case 'social':
                    if (pending.social !== undefined) {
                        updateData.careers_page_social = pending.social;
                        delete remainingPending.social;
                    }
                    break;
                case 'images':
                    if (pending.images !== undefined) {
                        updateData.careers_page_images = pending.images;
                        delete remainingPending.images;
                    }
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid section',
                    });
            }

            // Clear pending if no more changes, otherwise update
            updateData.careers_pending_changes =
                Object.keys(remainingPending).length > 0 ? remainingPending : Prisma.DbNull;

            // Clear review note for this section
            const existingNotes = (company.careers_pending_changes as any)?.reviews || {};
            delete existingNotes[section];
            if (Object.keys(existingNotes).length === 0) {
                updateData.careers_review_notes = Prisma.DbNull;
            }

            await prisma.company.update({
                where: { id: companyId },
                data: updateData,
            });

            return res.json({
                success: true,
                message: `Section "${section}" approved`,
            });
        }

        // Approve all pending sections at once
        const updateData: any = {
            careers_pending_changes: Prisma.DbNull,
            careers_review_notes: Prisma.DbNull,
        };

        if (pending.logoUrl !== undefined) updateData.careers_page_logo = pending.logoUrl;
        if (pending.bannerUrl !== undefined) updateData.careers_page_banner = pending.bannerUrl;
        if (pending.about !== undefined) updateData.careers_page_about = pending.about;
        if (pending.social !== undefined) updateData.careers_page_social = pending.social;
        if (pending.images !== undefined) updateData.careers_page_images = pending.images;

        await prisma.company.update({
            where: { id: companyId },
            data: updateData,
        });

        res.json({
            success: true,
            message: 'All pending changes approved',
        });
    } catch (error) {
        console.error('Failed to approve careers request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to approve request',
        });
    }
};

/**
 * Reject a careers page request
 * POST /api/hrm8/careers/:companyId/reject
 * Body: { reason, section? } - if section specified, reject only that section
 */
export const rejectCareersRequest = async (req: Request, res: Response): Promise<any> => {
    try {
        const { companyId } = req.params;
        const { reason, section } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Rejection reason is required',
            });
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                careers_page_status: true,
                careers_pending_changes: true,
                careers_review_notes: true,
            },
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Company not found',
            });
        }

        const existingNotes = (company.careers_review_notes as any) || {};

        // If full page rejection
        if (company.careers_page_status === 'SUBMITTED') {
            await prisma.company.update({
                where: { id: companyId },
                data: {
                    careers_page_status: 'REJECTED',
                    careers_review_notes: {
                        general: reason,
                        rejectedAt: new Date().toISOString(),
                    },
                },
            });

            return res.json({
                success: true,
                message: 'Careers page rejected',
            });
        }

        // Section-specific rejection
        if (section) {
            const updatedNotes = {
                ...existingNotes,
                [section]: {
                    reason,
                    rejectedAt: new Date().toISOString(),
                },
            };

            await prisma.company.update({
                where: { id: companyId },
                data: {
                    careers_review_notes: updatedNotes,
                },
            });

            return res.json({
                success: true,
                message: `Section "${section}" rejected`,
            });
        }

        // Reject all pending
        await prisma.company.update({
            where: { id: companyId },
            data: {
                careers_pending_changes: Prisma.DbNull,
                careers_review_notes: {
                    general: reason,
                    rejectedAt: new Date().toISOString(),
                },
            },
        });

        res.json({
            success: true,
            message: 'All pending changes rejected',
        });
    } catch (error) {
        console.error('Failed to reject careers request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reject request',
        });
    }
};
