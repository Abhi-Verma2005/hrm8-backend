/**
 * Company Careers Page Controller
 * Handles normal admin endpoints for managing company careers page
 */
import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import multer from 'multer';
import { CloudinaryService } from '../../services/storage/CloudinaryService';

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
        }
    },
});

export const uploadMiddleware = upload.single('file');

/**
 * Get company's careers page data
 * GET /api/company/careers
 */
export const getCareersPage = async (req: Request, res: Response) => {
    try {
        const companyId = (req as any).user?.companyId || (req as any).companyId;

        if (!companyId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized - no company context',
            });
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                website: true,
                domain: true,
                careers_page_status: true,
                careers_page_logo: true,
                careers_page_banner: true,
                careers_page_about: true,
                careers_page_social: true,
                careers_page_images: true,
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

        res.json({
            success: true,
            data: {
                id: company.id,
                name: company.name,
                website: company.website,
                domain: company.domain,
                status: company.careers_page_status,
                // Live (approved) data
                approved: {
                    logoUrl: company.careers_page_logo,
                    bannerUrl: company.careers_page_banner,
                    about: company.careers_page_about,
                    social: company.careers_page_social,
                    images: company.careers_page_images,
                },
                // Pending changes awaiting approval
                pending: company.careers_pending_changes,
                // Review notes (rejection reasons per section)
                reviewNotes: company.careers_review_notes,
            },
        });
    } catch (error) {
        console.error('Failed to fetch careers page:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch careers page data',
        });
    }
};

/**
 * Upload logo or banner image to Cloudinary
 * POST /api/company/careers/upload
 * Body: file (multipart), type ('logo' | 'banner')
 */
export const uploadCareersImage = async (req: Request, res: Response) => {
    try {
        const companyId = (req as any).user?.companyId || (req as any).companyId;

        if (!companyId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized - no company context',
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file provided',
            });
        }

        const { type } = req.body;
        if (!type || !['logo', 'banner', 'gallery'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid type. Must be "logo", "banner", or "gallery"',
            });
        }

        if (!CloudinaryService.isConfigured()) {
            return res.status(500).json({
                success: false,
                error: 'File storage not configured',
            });
        }

        // Upload to Cloudinary
        const result = await CloudinaryService.uploadMulterFile(req.file, {
            folder: `hrm8/careers/${companyId}`,
            resourceType: 'image',
        });

        res.json({
            success: true,
            data: {
                url: result.secureUrl,
                publicId: result.publicId,
                type,
            },
        });
    } catch (error) {
        console.error('Failed to upload careers image:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload image',
        });
    }
};

/**
 * Update careers page and submit for review
 * PUT /api/company/careers
 * Body: { logoUrl?, bannerUrl?, about?, social?, section? }
 * If status is PENDING or REJECTED and no section specified: submit full page
 * If status is APPROVED and section specified: submit only that section
 */
export const updateCareersPage = async (req: Request, res: Response) => {
    try {
        const companyId = (req as any).user?.companyId || (req as any).companyId;

        if (!companyId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized - no company context',
            });
        }

        const { logoUrl, bannerUrl, about, social, images, section } = req.body;

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                careers_page_status: true,
                careers_pending_changes: true,
            },
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Company not found',
            });
        }

        const currentStatus = company.careers_page_status;
        const existingPending = (company.careers_pending_changes as any) || {};

        // If already approved, handle per-section updates
        if (currentStatus === 'APPROVED' && section) {
            const sectionUpdates: Record<string, any> = {};

            switch (section) {
                case 'logo':
                    if (logoUrl !== undefined) sectionUpdates.logoUrl = logoUrl;
                    break;
                case 'banner':
                    if (bannerUrl !== undefined) sectionUpdates.bannerUrl = bannerUrl;
                    break;
                case 'about':
                    if (about !== undefined) sectionUpdates.about = about;
                    break;
                case 'social':
                    if (social !== undefined) sectionUpdates.social = social;
                    break;
                case 'images':
                    if (images !== undefined) sectionUpdates.images = images;
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid section. Must be logo, banner, about, social, or images',
                    });
            }

            // Merge with existing pending changes
            const updatedPending = { ...existingPending, ...sectionUpdates };

            await prisma.company.update({
                where: { id: companyId },
                data: {
                    careers_pending_changes: updatedPending,
                },
            });

            return res.json({
                success: true,
                message: `Section "${section}" submitted for review`,
                data: {
                    pending: updatedPending,
                },
            });
        }

        // For new/rejected pages, submit full page
        const fullUpdate = {
            logoUrl,
            bannerUrl,
            about,
            social,
            images,
        };

        await prisma.company.update({
            where: { id: companyId },
            data: {
                careers_page_status: 'SUBMITTED',
                careers_pending_changes: fullUpdate,
                careers_review_notes: null, // Clear previous review notes
            },
        });

        res.json({
            success: true,
            message: 'Careers page submitted for review',
            data: {
                status: 'SUBMITTED',
                pending: fullUpdate,
            },
        });
    } catch (error) {
        console.error('Failed to update careers page:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update careers page',
        });
    }
};
