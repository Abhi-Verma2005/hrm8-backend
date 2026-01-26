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
            const sessionId = (req as any).cookies?.session;
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

            // Map frontend values to Prisma enums
            const employmentTypeMap: Record<string, 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'CASUAL'> = {
                'full-time': 'FULL_TIME',
                'part-time': 'PART_TIME',
                'contract': 'CONTRACT',
                'casual': 'CASUAL',
            };

            const workArrangementMap: Record<string, 'ON_SITE' | 'REMOTE' | 'HYBRID'> = {
                'on-site': 'ON_SITE',
                'remote': 'REMOTE',
                'hybrid': 'HYBRID',
            };

            // Create the internal job
            const job = await prisma.job.create({
                data: {
                    title: data.title,
                    company_id: companyId,
                    department: data.department || null,
                    location: data.location || 'Remote',
                    category: data.category || null,
                    employment_type: employmentTypeMap[data.employmentType] || 'FULL_TIME',
                    work_arrangement: workArrangementMap[data.workArrangement || 'on-site'] || 'ON_SITE',
                    number_of_vacancies: data.vacancies || 1,
                    requirements: data.requirements || [],
                    responsibilities: data.responsibilities || [],
                    description: data.description || '',
                    // Mark as internal/assessment-only
                    status: 'DRAFT',
                    created_by: session.user_id,
                    hiring_mode: 'ASSESSMENT_ONLY', // New: Explicitly set hiring mode
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

    /**
     * Get user's internal jobs (for Roles tab)
     * GET /api/assess/my-jobs
     */
    static async getMyJobs(req: Request, res: Response): Promise<void> {
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

            // Get jobs created by this user's company with status DRAFT (internal jobs)
            const jobs = await prisma.job.findMany({
                where: {
                    company_id: session.company_id,
                    status: 'DRAFT', // Internal jobs are in draft status
                },
                include: {
                    applications: {
                        include: {
                            candidate: true,
                            application_round_progress: {
                                include: {
                                    job_round: true,
                                },
                            },
                        },
                    },
                    job_round: {
                        where: {
                            type: 'ASSESSMENT',
                        },
                        include: {
                            assessment_configuration: true,
                        },
                    },
                },
                orderBy: {
                    created_at: 'desc',
                },
            });

            // Transform to match frontend Role interface
            const roles = jobs.map(job => {
                const candidates = job.applications.map(app => ({
                    id: app.candidate_id,
                    firstName: app.candidate.first_name,
                    lastName: app.candidate.last_name,
                    email: app.candidate.email,
                    status: app.status === 'NEW' ? 'invited' :
                        app.status === 'IN_PROGRESS' ? 'in_progress' :
                            app.status === 'COMPLETED' ? 'completed' : 'invited',
                    stage: app.stage, // Pass raw enum value
                    completedAt: app.updated_at,
                    resumeUrl: app.resume_url,
                    assessmentResults: app.application_round_progress.map(progress => ({
                        assessmentId: progress.round_id,
                        assessmentName: progress.job_round.name,
                        status: progress.status === 'COMPLETED' ? 'completed' :
                            progress.status === 'IN_PROGRESS' ? 'in_progress' : 'pending',
                        assignedAt: progress.started_at || progress.created_at,
                        completedAt: progress.completed_at,
                    })),
                }));

                const assessments = job.job_round.map(round => ({
                    id: round.id,
                    name: round.name,
                    description: round.description || '',
                    category: 'assessment',
                }));

                const completedCount = candidates.filter(c => c.status === 'completed').length;
                const inProgressCount = candidates.filter(c => c.status === 'in_progress').length;

                return {
                    id: job.id,
                    position: {
                        id: job.id,
                        title: job.title,
                        location: job.location,
                        employmentType: job.employment_type.toLowerCase().replace('_', '-'),
                        seniority: 'mid', // Default
                        skills: job.requirements || [],
                        responsibilities: (job.responsibilities || []).join('\n'),
                    },
                    assessments,
                    candidates,
                    status: completedCount === candidates.length && candidates.length > 0 ? 'completed' :
                        job.status === 'DRAFT' ? 'active' : 'active',
                    createdAt: job.created_at,
                    orderId: `ORD-${job.id.slice(0, 8).toUpperCase()}`,
                };
            });

            res.json({
                success: true,
                data: roles,
            });
        } catch (error) {
            console.error('[AssessInternalJobController.getMyJobs] Error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch jobs',
            });
        }
    }

    /**
     * Get single job with candidates
     * GET /api/assess/jobs/:jobId
     */
    static async getJobWithCandidates(req: Request, res: Response): Promise<void> {
        try {
            const { jobId } = req.params;
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

            const job = await prisma.job.findUnique({
                where: { id: jobId },
                include: {
                    applications: {
                        include: {
                            candidate: true,
                            application_round_progress: {
                                include: {
                                    job_round: true,
                                },
                            },
                        },
                    },
                    job_rounds: {
                        include: {
                            assessment_config: true,
                        },
                    },
                },
            });

            if (!job || job.company_id !== session.company_id) {
                res.status(404).json({ success: false, error: 'Job not found' });
                return;
            }

            res.json({
                success: true,
                data: job,
            });
        } catch (error) {
            console.error('[AssessInternalJobController.getJobWithCandidates] Error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch job',
            });
        }
    }

    /**
     * Add candidate to job
     * POST /api/assess/jobs/:jobId/candidates
     */
    static async addCandidateToJob(req: Request, res: Response): Promise<void> {
        try {
            const { jobId } = req.params;
            const { firstName, lastName, email, mobile, mobileCountryCode } = req.body;
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

            if (!firstName || !lastName || !email) {
                res.status(400).json({
                    success: false,
                    error: 'First name, last name, and email are required',
                });
                return;
            }

            // Check if job exists and belongs to user's company
            const job = await prisma.job.findUnique({
                where: { id: jobId },
            });

            if (!job || job.company_id !== session.company_id) {
                res.status(404).json({ success: false, error: 'Job not found' });
                return;
            }

            // Upload resume if provided
            let resumeUrl: string | null = null;
            if (req.file && CloudinaryService.isConfigured()) {
                try {
                    const uploadResult = await CloudinaryService.uploadMulterFile(req.file, {
                        folder: `assess/resumes/${session.company_id}`,
                        resourceType: 'raw',
                    });
                    resumeUrl = uploadResult.url;
                } catch (uploadError) {
                    console.error('Resume upload failed:', uploadError);
                }
            }

            // Check if candidate already exists
            let candidate = await prisma.candidate.findUnique({
                where: { email: email.toLowerCase() },
            });

            if (!candidate) {
                // Create new candidate
                candidate = await prisma.candidate.create({
                    data: {
                        email: email.toLowerCase(),
                        first_name: firstName,
                        last_name: lastName,
                        phone: mobileCountryCode && mobile ? `${mobileCountryCode}${mobile}` : mobile || null,
                        status: 'ACTIVE',
                        password_hash: 'MANUAL_ENTRY', // Placeholder for manually added candidates
                    },
                });
            }

            // Check if application already exists
            const existingApplication = await prisma.application.findUnique({
                where: {
                    candidate_id_job_id: {
                        candidate_id: candidate.id,
                        job_id: jobId,
                    },
                },
            });

            if (existingApplication) {
                res.status(409).json({
                    success: false,
                    error: 'Candidate is already added to this job',
                });
                return;
            }

            // Create application
            const application = await prisma.application.create({
                data: {
                    candidate_id: candidate.id,
                    job_id: jobId,
                    status: 'NEW',
                    stage: 'NEW_APPLICATION',
                    resume_url: resumeUrl,
                    manually_added: true,
                    added_at: new Date(),
                    added_by: session.user_id,
                },
            });

            res.status(201).json({
                success: true,
                data: {
                    candidateId: candidate.id,
                    applicationId: application.id,
                    message: 'Candidate added successfully',
                },
            });
        } catch (error) {
            console.error('[AssessInternalJobController.addCandidateToJob] Error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to add candidate',
            });
        }
    }

    /**
     * Upload candidate CV
     * POST /api/assess/upload-cv
     */
    static async uploadCandidateCV(req: Request, res: Response): Promise<void> {
        try {
            const sessionId = (req as any).cookies?.session;
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
                res.status(400).json({ success: false, error: 'No file uploaded' });
                return;
            }

            if (!CloudinaryService.isConfigured()) {
                res.status(503).json({ success: false, error: 'File upload service not available' });
                return;
            }

            const uploadResult = await CloudinaryService.uploadMulterFile(req.file, {
                folder: `assess/resumes/${session.company_id}`,
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
            console.error('[AssessInternalJobController.uploadCandidateCV] Error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to upload CV',
            });
        }
    }

    /**
     * Move candidate to different stage
     * POST /api/assess/jobs/:jobId/candidates/:candidateId/move
     */
    static async moveCandidate(req: Request, res: Response): Promise<void> {
        try {
            const { jobId, candidateId } = req.params;
            const { stage, roundId } = req.body;
            const sessionId = (req as any).cookies?.session;

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

            // Find the application
            const application = await prisma.application.findFirst({
                where: {
                    job_id: jobId,
                    candidate_id: candidateId,
                },
            });

            if (!application) {
                res.status(404).json({ success: false, error: 'Application not found' });
                return;
            }

            // Map stage to appropriate status
            const stageToStatus: Record<string, string> = {
                'NEW_APPLICATION': 'SCREENING',
                'RESUME_REVIEW': 'SCREENING',
                'PHONE_SCREEN': 'SCREENING',
                'TECHNICAL_INTERVIEW': 'INTERVIEW',
                'ONSITE_INTERVIEW': 'INTERVIEW',
                'OFFER_EXTENDED': 'OFFER',
                'OFFER_ACCEPTED': 'HIRED',
                'REJECTED': 'REJECTED',
                'WITHDRAWN': 'WITHDRAWN',
            };
            const newStatus = stageToStatus[stage] || 'SCREENING';

            // Check for Assessment Only Mode and deduct credits
            // Need to fetch job details first
            const job = await prisma.job.findUnique({
                where: { id: jobId }
            });

            if (!job) {
                res.status(404).json({ success: false, error: 'Job not found' });
                return;
            }

            console.log('[MoveCandidate] Job ID:', jobId);
            console.log('[MoveCandidate] Hiring Mode:', job.hiring_mode);

            // Enforce credit check for Assessment Only jobs (or if mode is not set, assume Assessment for this controller)
            // Also include SELF_MANAGED as some legacy/default jobs might have this set but still need to be charged in Assess flow
            if (!job.hiring_mode || job.hiring_mode === 'ASSESSMENT_ONLY' || job.hiring_mode === 'SELF_MANAGED') {
                console.log('[MoveCandidate] Entering payment deduction block');
                // Import AssessmentPaymentService
                const { AssessmentPaymentService } = await import('../../services/payments/AssessmentPaymentService');
                const paymentService = new AssessmentPaymentService(prisma);

                // Check balance
                console.log('[MoveCandidate] Checking balance...');
                const check = await paymentService.checkCanMoveCandidate(session.company_id);
                console.log('[MoveCandidate] Balance check result:', check);

                if (!check.canMove) {
                    res.status(402).json({
                        success: false,
                        error: 'Insufficient credits',
                        data: {
                            required: check.required,
                            balance: check.balance,
                            shortfall: check.shortfall
                        }
                    });
                    return;
                }

                // Process deduction
                console.log('[MoveCandidate] Processing deduction...');
                const deduction = await paymentService.processMoveDeduction(
                    session.company_id,
                    jobId,
                    candidateId,
                    session.user_id,
                    application.stage, // Old stage
                    stage // New stage
                );
                console.log('[MoveCandidate] Deduction result:', deduction);

                if (!deduction.success) {
                    res.status(402).json({
                        success: false,
                        error: deduction.error || 'Payment failed'
                    });
                    return;
                }
            } else {
                console.log('[MoveCandidate] Skipping payment deduction (Mode not ASSESSMENT_ONLY and not null)');
            }

            // Update application stage
            const oldStage = application.stage;
            await prisma.application.update({
                where: { id: application.id },
                data: {
                    stage: stage as any,
                    status: newStatus as any,
                },
            });

            // Send email notification if stage changed
            if (oldStage !== stage) {
                import('../../services/notification/ApplicationNotificationService').then(({ ApplicationNotificationService }) => {
                    ApplicationNotificationService.notifyStageChange(
                        application.id,
                        candidateId,
                        jobId,
                        oldStage as any,
                        stage as any,
                        newStatus as any
                    ).catch((error) => {
                        console.error('[AssessInternalJobController.moveCandidate] Failed to send notification:', error);
                    });
                });
            }

            // If moving to an assessment round, create round progress
            if (roundId) {
                await prisma.applicationRoundProgress.upsert({
                    where: {
                        application_id_round_id: {
                            application_id: application.id,
                            round_id: roundId,
                        },
                    },
                    update: {
                        status: 'IN_PROGRESS',
                    },
                    create: {
                        application_id: application.id,
                        round_id: roundId,
                        status: 'NOT_STARTED',
                    },
                });
            }

            res.json({
                success: true,
                message: 'Candidate moved successfully',
            });
        } catch (error) {
            console.error('[AssessInternalJobController.moveCandidate] Error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to move candidate',
            });
        }
    }

    /**
     * Get company credit balance
     * GET /api/assess/balance
     */
    static async getCompanyBalance(req: Request, res: Response): Promise<void> {
        try {
            const sessionId = (req as any).cookies?.session;
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

            const { VirtualWalletService } = await import('../../services/virtualWalletService');
            const walletService = new VirtualWalletService(prisma);

            const account = await walletService.getOrCreateAccount({
                ownerType: 'COMPANY',
                ownerId: session.company_id
            });

            res.json({
                success: true,
                data: {
                    balance: account.balance,
                    currency: 'CREDITS'
                }
            });
        } catch (error) {
            console.error('[AssessInternalJobController.getCompanyBalance] Error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch balance',
            });
        }
    }

    /**
     * Add test credits to company balance (Dev/Test only)
     * POST /api/assess/test-credits
     */
    static async addTestCredits(req: Request, res: Response): Promise<void> {
        try {
            const sessionId = (req as any).cookies?.session;
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

            const { VirtualWalletService } = await import('../../services/virtualWalletService');
            const walletService = new VirtualWalletService(prisma);

            const account = await walletService.getOrCreateAccount({
                ownerType: 'COMPANY',
                ownerId: session.company_id
            });

            // Add 10 credits
            await walletService.creditAccount({
                accountId: account.id,
                amount: 10,
                description: 'Test Credit Top-up',
                type: 'ADMIN_ADJUSTMENT' as any, // Cast to any or import enum if possible, but safely passing string that matches enum
                metadata: {
                    source: 'test_utility',
                    userId: session.user_id
                }
            });

            const updatedAccount = await walletService.getAccount(account.id);

            res.json({
                success: true,
                data: {
                    balance: updatedAccount?.balance || 0,
                    currency: 'CREDITS',
                    message: 'Added 10 test credits'
                }
            });
        } catch (error) {
            console.error('[AssessInternalJobController.addTestCredits] Error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to add test credits',
            });
        }
    }
}


