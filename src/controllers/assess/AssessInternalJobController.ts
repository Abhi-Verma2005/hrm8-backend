/**
 * Assess Internal Job Controller
 * Handles creation of internal jobs for HRM8-Assess
 * These jobs are not posted on job boards - used only for assessment tracking
 */

import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { CloudinaryService } from '../../services/storage/CloudinaryService';

interface CreateInternalJobRequest {
    title: string;
    department?: string;
    location?: string;
    category?: string;
    employmentType: string;
    experienceLevel?: string;
    workArrangement?: string;
    vacancies?: number;
    requirements?: string[];
    responsibilities?: string[];
    description?: string;
}

export class AssessInternalJobController {
    /**
     * Create an internal job for assessment tracking
     * POST /api/assess/jobs
     */
    static async createJob(req: Request, res: Response): Promise<void> {
        try {
            const sessionId = req.cookies?.session;
            if (!sessionId) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            // Get user session
            const session = await prisma.session.findUnique({
                where: { session_id: sessionId },
                include: { user: true },
            });

            if (!session || session.expires_at < new Date()) {
                res.status(401).json({ success: false, error: 'Session expired' });
                return;
            }

            const companyId = session.company_id;
            const data: CreateInternalJobRequest = req.body;

            if (!data.title) {
                res.status(400).json({
                    success: false,
                    error: 'Job title is required',
                });
                return;
            }

            // Handle file upload for position description
            let positionDescriptionUrl: string | null = null;
            if (req.file && CloudinaryService.isConfigured()) {
                try {
                    const uploadResult = await CloudinaryService.uploadMulterFile(req.file, {
                        folder: `assess/jobs/${companyId}`,
                        resourceType: 'raw',
                    });
                    positionDescriptionUrl = uploadResult.url;
                } catch (uploadError) {
                    console.error('[AssessInternalJobController] File upload failed:', uploadError);
                    // Continue without the file
                }
            }

            // Create the internal job
            const job = await prisma.job.create({
                data: {
                    title: data.title,
                    company_id: companyId,
                    department: data.department || null,
                    location: data.location || 'Remote',
                    category: data.category || null,
                    employment_type: data.employmentType || 'full-time',
                    experience_level: data.experienceLevel || 'mid',
                    work_arrangement: data.workArrangement || 'on-site',
                    number_of_vacancies: data.vacancies || 1,
                    requirements: data.requirements || [],
                    responsibilities: data.responsibilities || [],
                    description: data.description || '',
                    // Mark as internal/assessment-only
                    status: 'DRAFT', // Not published
                    is_internal: true,
                    position_description_url: positionDescriptionUrl,
                    created_by: session.user_id,
                },
            });

            res.status(201).json({
                success: true,
                data: {
                    jobId: job.id,
                    title: job.title,
                    positionDescriptionUrl,
                    message: 'Internal job created successfully',
                },
            });
        } catch (error) {
            console.error('[AssessInternalJobController.createJob] Error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create job',
            });
        }
    }

    /**
     * Upload position description file
     * POST /api/assess/jobs/upload-description
     */
    static async uploadPositionDescription(req: Request, res: Response): Promise<void> {
        try {
            const sessionId = req.cookies?.session;
            if (!sessionId) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const session = await prisma.session.findUnique({
                where: { session_id: sessionId },
            });

            if (!session || session.expires_at < new Date()) {
                res.status(401).json({ success: false, error: 'Session expired' });
                return;
            }

            if (!req.file) {
                res.status(400).json({
                    success: false,
                    error: 'No file uploaded',
                });
                return;
            }

            if (!CloudinaryService.isConfigured()) {
                res.status(503).json({
                    success: false,
                    error: 'File upload service not available',
                });
                return;
            }

            const uploadResult = await CloudinaryService.uploadMulterFile(req.file, {
                folder: `assess/position-descriptions/${session.company_id}`,
                resourceType: 'raw',
            });

            res.json({
                success: true,
                data: {
                    url: uploadResult.url,
                    publicId: uploadResult.publicId,
                    fileName: req.file.originalname,
                },
            });
        } catch (error) {
            console.error('[AssessInternalJobController.uploadPositionDescription] Error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to upload file',
            });
        }
    }
}
