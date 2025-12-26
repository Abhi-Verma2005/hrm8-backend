/**
 * Candidate Document Controller
 * Handles document management endpoints (resumes, cover letters, portfolio)
 */

import { Request, Response } from 'express';
import { CandidateDocumentService } from '../../services/candidate/CandidateDocumentService';
import { CloudinaryService } from '../../services/storage/CloudinaryService';
import { LocalStorageService } from '../../services/storage/LocalStorageService';
import { DocumentParserService } from '../../services/document/DocumentParserService';

export class CandidateDocumentController {
    // ========== Resume Endpoints ==========

    /**
     * GET /api/candidate/documents/resumes
     * Get all resumes for the authenticated candidate
     */
    static async getResumes(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const resumes = await CandidateDocumentService.getResumes(candidateId);
            res.json({ success: true, data: resumes });
        } catch (error: any) {
            console.error('Error fetching resumes:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /api/candidate/documents/resumes
     * Upload a new resume
     */
    static async uploadResume(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            if (!req.file) {
                res.status(400).json({ success: false, error: 'No file uploaded' });
                return;
            }

            // Parse document content
            let content: string | undefined;
            try {
                const parsedDoc = await DocumentParserService.parseDocument(req.file);
                content = parsedDoc.text;
            } catch (error: any) {
                console.warn('Failed to parse document content:', error);
                // Continue without content but log error in content field
                content = `[Parsing Error] ${error.message}`;
            }

            // Upload to Cloudinary
            let fileUrl: string;
            if (CloudinaryService.isConfigured()) {
                const uploadResult = await CloudinaryService.uploadMulterFile(req.file, {
                    folder: `hrm8/candidates/${candidateId}/resumes`,
                    resourceType: 'raw',
                });
                fileUrl = uploadResult.secureUrl;
            } else {
                // Fallback: Upload to local storage
                const uploadResult = await LocalStorageService.uploadFile(req.file.buffer, req.file.originalname, {
                    folder: `candidates/${candidateId}/resumes`
                });
                // Prepend API URL if needed, or use relative path
                const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
                fileUrl = `${API_BASE_URL}${uploadResult.url}`;
            }

            const resume = await CandidateDocumentService.uploadResume(
                candidateId,
                req.file.originalname,
                fileUrl,
                req.file.size,
                req.file.mimetype,
                content
            );

            res.json({ success: true, data: resume });
        } catch (error: any) {
            console.error('Error uploading resume:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * PUT /api/candidate/documents/resumes/:id/set-default
     * Set a resume as default
     */
    static async setDefaultResume(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            const { id } = req.params;

            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const resume = await CandidateDocumentService.setDefaultResume(candidateId, id);
            res.json({ success: true, data: resume });
        } catch (error: any) {
            console.error('Error setting default resume:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * DELETE /api/candidate/documents/resumes/:id
     * Delete a resume
     */
    static async deleteResume(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            const { id } = req.params;

            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            await CandidateDocumentService.deleteResume(candidateId, id);
            res.json({ success: true, message: 'Resume deleted' });
        } catch (error: any) {
            console.error('Error deleting resume:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // ========== Cover Letter Endpoints ==========

    /**
     * GET /api/candidate/documents/cover-letters
     * Get all cover letters for the authenticated candidate
     */
    static async getCoverLetters(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const coverLetters = await CandidateDocumentService.getCoverLetters(candidateId);
            res.json({ success: true, data: coverLetters });
        } catch (error: any) {
            console.error('Error fetching cover letters:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /api/candidate/documents/cover-letters
     * Create a new cover letter (draft or template)
     */
    static async createCoverLetter(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { title, content, isTemplate, isDraft } = req.body;

            // If file is uploaded, handle it
            let fileUrl: string | undefined;
            let fileName: string | undefined;
            let fileSize: number | undefined;
            let fileType: string | undefined;

            if (req.file) {
                if (CloudinaryService.isConfigured()) {
                    const uploadResult = await CloudinaryService.uploadMulterFile(req.file, {
                        folder: `hrm8/candidates/${candidateId}/cover-letters`,
                        resourceType: 'raw',
                    });
                    fileUrl = uploadResult.secureUrl;
                } else {
                    const uploadResult = await LocalStorageService.uploadFile(req.file.buffer, req.file.originalname, {
                        folder: `candidates/${candidateId}/cover-letters`
                    });
                    const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
                    fileUrl = `${API_BASE_URL}${uploadResult.url}`;
                }
                fileName = req.file.originalname;
                fileSize = req.file.size;
                fileType = req.file.mimetype;
            }

            const coverLetter = await CandidateDocumentService.createCoverLetter(candidateId, {
                title,
                content,
                fileUrl,
                fileName,
                fileSize,
                fileType,
                isTemplate: isTemplate === true || isTemplate === 'true',
                isDraft: isDraft !== false && isDraft !== 'false',
            });

            res.json({ success: true, data: coverLetter });
        } catch (error: any) {
            console.error('Error creating cover letter:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * PUT /api/candidate/documents/cover-letters/:id
     * Update a cover letter
     */
    static async updateCoverLetter(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            const { id } = req.params;

            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { title, content, isTemplate, isDraft } = req.body;

            // If file is uploaded, handle it
            let fileUrl: string | undefined;
            let fileName: string | undefined;
            let fileSize: number | undefined;
            let fileType: string | undefined;

            if (req.file) {
                if (CloudinaryService.isConfigured()) {
                    const uploadResult = await CloudinaryService.uploadMulterFile(req.file, {
                        folder: `hrm8/candidates/${candidateId}/cover-letters`,
                        resourceType: 'raw',
                    });
                    fileUrl = uploadResult.secureUrl;
                } else {
                    const uploadResult = await LocalStorageService.uploadFile(req.file.buffer, req.file.originalname, {
                        folder: `candidates/${candidateId}/cover-letters`
                    });
                    const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
                    fileUrl = `${API_BASE_URL}${uploadResult.url}`;
                }
                fileName = req.file.originalname;
                fileSize = req.file.size;
                fileType = req.file.mimetype;
            }

            const updateData: any = {};
            if (title !== undefined) updateData.title = title;
            if (content !== undefined) updateData.content = content;
            if (isTemplate !== undefined) updateData.isTemplate = isTemplate === true || isTemplate === 'true';
            if (isDraft !== undefined) updateData.isDraft = isDraft !== false && isDraft !== 'false';
            if (fileUrl !== undefined) updateData.fileUrl = fileUrl;
            if (fileName !== undefined) updateData.fileName = fileName;
            if (fileSize !== undefined) updateData.fileSize = fileSize;
            if (fileType !== undefined) updateData.fileType = fileType;

            const coverLetter = await CandidateDocumentService.updateCoverLetter(candidateId, id, updateData);
            res.json({ success: true, data: coverLetter });
        } catch (error: any) {
            console.error('Error updating cover letter:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * DELETE /api/candidate/documents/cover-letters/:id
     * Delete a cover letter
     */
    static async deleteCoverLetter(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            const { id } = req.params;

            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            await CandidateDocumentService.deleteCoverLetter(candidateId, id);
            res.json({ success: true, message: 'Cover letter deleted' });
        } catch (error: any) {
            console.error('Error deleting cover letter:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // ========== Portfolio Endpoints ==========

    /**
     * GET /api/candidate/documents/portfolio
     * Get all portfolio items for the authenticated candidate
     */
    static async getPortfolioItems(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const portfolioItems = await CandidateDocumentService.getPortfolioItems(candidateId);
            res.json({ success: true, data: portfolioItems });
        } catch (error: any) {
            console.error('Error fetching portfolio items:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * POST /api/candidate/documents/portfolio
     * Create a new portfolio item (file or link)
     */
    static async createPortfolioItem(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { title, type, externalUrl, platform, description } = req.body;

            // If file is uploaded, handle it
            let fileUrl: string | undefined;
            let fileName: string | undefined;
            let fileSize: number | undefined;
            let fileType: string | undefined;

            if (req.file) {
                if (CloudinaryService.isConfigured()) {
                    const uploadResult = await CloudinaryService.uploadMulterFile(req.file, {
                        folder: `hrm8/candidates/${candidateId}/portfolio`,
                        resourceType: 'raw',
                    });
                    fileUrl = uploadResult.secureUrl;
                } else {
                    const uploadResult = await LocalStorageService.uploadFile(req.file.buffer, req.file.originalname, {
                        folder: `candidates/${candidateId}/portfolio`
                    });
                    const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
                    fileUrl = `${API_BASE_URL}${uploadResult.url}`;
                }
                fileName = req.file.originalname;
                fileSize = req.file.size;
                fileType = req.file.mimetype;
            }

            const portfolioItem = await CandidateDocumentService.createPortfolioItem(candidateId, {
                title,
                type: type || (req.file ? 'file' : 'link'),
                fileUrl,
                fileName,
                fileSize,
                fileType,
                externalUrl,
                platform,
                description,
            });

            res.json({ success: true, data: portfolioItem });
        } catch (error: any) {
            console.error('Error creating portfolio item:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * PUT /api/candidate/documents/portfolio/:id
     * Update a portfolio item
     */
    static async updatePortfolioItem(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            const { id } = req.params;

            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { title, externalUrl, platform, description } = req.body;

            // If file is uploaded, handle it
            let fileUrl: string | undefined;
            let fileName: string | undefined;
            let fileSize: number | undefined;
            let fileType: string | undefined;

            if (req.file) {
                if (CloudinaryService.isConfigured()) {
                    const uploadResult = await CloudinaryService.uploadMulterFile(req.file, {
                        folder: `hrm8/candidates/${candidateId}/portfolio`,
                        resourceType: 'raw',
                    });
                    fileUrl = uploadResult.secureUrl;
                } else {
                    const uploadResult = await LocalStorageService.uploadFile(req.file.buffer, req.file.originalname, {
                        folder: `candidates/${candidateId}/portfolio`
                    });
                    const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
                    fileUrl = `${API_BASE_URL}${uploadResult.url}`;
                }
                fileName = req.file.originalname;
                fileSize = req.file.size;
                fileType = req.file.mimetype;
            }

            const updateData: any = {};
            if (title !== undefined) updateData.title = title;
            if (externalUrl !== undefined) updateData.externalUrl = externalUrl;
            if (platform !== undefined) updateData.platform = platform;
            if (description !== undefined) updateData.description = description;
            if (fileUrl !== undefined) updateData.fileUrl = fileUrl;
            if (fileName !== undefined) updateData.fileName = fileName;
            if (fileSize !== undefined) updateData.fileSize = fileSize;
            if (fileType !== undefined) updateData.fileType = fileType;

            const portfolioItem = await CandidateDocumentService.updatePortfolioItem(candidateId, id, updateData);
            res.json({ success: true, data: portfolioItem });
        } catch (error: any) {
            console.error('Error updating portfolio item:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * DELETE /api/candidate/documents/portfolio/:id
     * Delete a portfolio item
     */
    static async deletePortfolioItem(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            const { id } = req.params;

            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            await CandidateDocumentService.deletePortfolioItem(candidateId, id);
            res.json({ success: true, message: 'Portfolio item deleted' });
        } catch (error: any) {
            console.error('Error deleting portfolio item:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

