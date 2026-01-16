import { Request, Response } from 'express';
import { ConsultantAuthenticatedRequest } from '../../middleware/consultantAuth';
import prisma from '../../lib/prisma';
import { ApplicationStatus, ApplicationStage } from '@prisma/client';
import { CommissionService } from '../../services/hrm8/CommissionService';

export class ConsultantCandidateController {

    /**
     * Get candidate pipeline for a specific job.
     * Returns applications including candidate profiles and statuses.
     */
    static async getPipeline(req: Request, res: Response) {
        try {
            const consultant = (req as ConsultantAuthenticatedRequest).consultant;
            if (!consultant) return res.status(401).json({ success: false, error: 'Unauthorized' });

            // We need to fetch from query params or params? Usually params based on plan
            // Assuming route is GET /jobs/:jobId/candidates
            const { jobId } = req.params;

            // 1. Verify Job access (Assigned to consultant OR in their Region for certain roles)
            const job = await prisma.job.findUnique({
                where: { id: jobId },
                select: { id: true, assigned_consultant_id: true, region_id: true }
            });

            if (!job) {
                return res.status(404).json({ success: false, error: 'Job not found' });
            }

            // Security: Strictly enforce assignment unless we add loose regional viewing later
            if (job.assigned_consultant_id !== consultant.id) {
                // Allow if licensee? For now, strict consultant check as per previous logic
                // But wait, Licensees might want to see too. 
                // For now, let's allow if assigned OR if user is a licensee of the region.
                // Simpler: Check assignment.
                const isLicenseeOfRegion = (consultant.role === 'LICENSEE' || consultant.role === 'AREA_MANAGER')
                    && consultant.regionId === job.region_id;

                if (job.assigned_consultant_id !== consultant.id && !isLicenseeOfRegion) {
                    return res.status(403).json({ success: false, error: 'Access denied to this job pipeline' });
                }
            }

            // 2. Fetch Applications
            const applications = await prisma.application.findMany({
                where: { job_id: jobId },
                include: {
                    candidate: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            email: true,
                            photo: true,
                            resume_url: true,
                            linked_in_url: true
                        }
                    },
                    // Include latest interview status if exists?
                    video_interview: {
                        orderBy: { created_at: 'desc' },
                        take: 1
                    }
                },
                orderBy: { applied_date: 'desc' }
            });

            return res.json({ success: true, data: applications });

        } catch (error) {
            console.error('Error fetching pipeline:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch pipeline' });
        }
    }

    /**
     * Get job rounds for a specific job (for pipeline columns)
     * GET /jobs/:jobId/rounds
     */
    static async getJobRounds(req: Request, res: Response) {
        try {
            const consultant = (req as ConsultantAuthenticatedRequest).consultant;
            if (!consultant) return res.status(401).json({ success: false, error: 'Unauthorized' });

            const { jobId } = req.params;

            // Verify Job access
            const job = await prisma.job.findUnique({
                where: { id: jobId },
                select: { id: true, assigned_consultant_id: true, region_id: true }
            });

            if (!job) {
                return res.status(404).json({ success: false, error: 'Job not found' });
            }

            // Security Check
            const isAssigned = job.assigned_consultant_id === consultant.id;
            const isLicenseeOfRegion = (consultant.role === 'LICENSEE' || consultant.role === 'AREA_MANAGER')
                && consultant.regionId === job.region_id;

            if (!isAssigned && !isLicenseeOfRegion) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            // Fetch rounds for this job
            const rounds = await prisma.jobRound.findMany({
                where: { job_id: jobId },
                orderBy: { order: 'asc' }
            });

            // Map to camelCase for frontend
            const mappedRounds = rounds.map(r => ({
                id: r.id,
                jobId: r.job_id,
                name: r.name,
                order: r.order,
                type: r.type,
                isFixed: r.is_fixed,
                fixedKey: r.fixed_key,
                createdAt: r.created_at.toISOString(),
                updatedAt: r.updated_at.toISOString()
            }));

            return res.json({ success: true, data: { rounds: mappedRounds } });

        } catch (error) {
            console.error('Error fetching job rounds:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch rounds' });
        }
    }

    /**
     * Update application status (Move stage)
     * POST /candidates/:applicationId/status
     */
    static async updateStatus(req: Request, res: Response) {
        try {
            const consultant = (req as ConsultantAuthenticatedRequest).consultant;
            if (!consultant) return res.status(401).json({ success: false, error: 'Unauthorized' });

            const { applicationId } = req.params;
            const { status, stage } = req.body; // Expect ApplicationStatus enum values

            // Validate Application access
            const application = await prisma.application.findUnique({
                where: { id: applicationId },
                include: { job: true, candidate: true }
            });

            if (!application) return res.status(404).json({ success: false, error: 'Application not found' });

            // Security Check (Same as pipeline)
            const isAssigned = application.job.assigned_consultant_id === consultant.id;
            const isLicenseeOfRegion = (consultant.role === 'LICENSEE' || consultant.role === 'AREA_MANAGER')
                && consultant.regionId === application.job.region_id;

            if (!isAssigned && !isLicenseeOfRegion) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            // Update Status
            const updatedApp = await prisma.application.update({
                where: { id: applicationId },
                data: {
                    status: status as ApplicationStatus,
                    stage: stage as ApplicationStage || undefined, // Optional stage update
                    updated_at: new Date()
                }
            });

            // If candidate is hired, confirm commission for this job
            if (status === 'HIRED') {
                try {
                    await CommissionService.confirmCommissionForJob(application.job_id);
                } catch (commError) {
                    console.error('Failed to auto-confirm commission:', commError);
                    // Don't fail the request, just log it
                }
            }

            // Notify Candidate (Optional but good UX)
            try {
                await prisma.notification.create({
                    data: {
                        candidate_id: application.candidate_id,
                        type: 'APPLICATION_UPDATE',
                        title: 'Application Update',
                        message: `Your application for ${application.job.title} has been updated to ${status}.`,
                        read: false
                    }
                });
            } catch (notifError) {
                console.error('Failed to send notification', notifError);
            }

            return res.json({ success: true, data: updatedApp });

        } catch (error) {
            console.error('Error updating status:', error);
            return res.status(500).json({ success: false, error: 'Failed to update status' });
        }
    }

    /**
     * Add operational note (private to recruiters)
     * POST /candidates/:applicationId/note
     */
    static async addNote(req: Request, res: Response) {
        try {
            const consultant = (req as ConsultantAuthenticatedRequest).consultant;
            if (!consultant) return res.status(401).json({ success: false, error: 'Unauthorized' });

            const { applicationId } = req.params;
            const { note } = req.body;

            const application = await prisma.application.findUnique({
                where: { id: applicationId },
                include: { job: true }
            });

            if (!application) return res.status(404).json({ success: false, error: 'Application not found' });

            // Append note with timestamp and author
            const newNote = `[${new Date().toISOString()}] ${consultant.firstName}: ${note}\n`;
            const currentNotes = application.recruiter_notes || '';

            await prisma.application.update({
                where: { id: applicationId },
                data: {
                    recruiter_notes: currentNotes + newNote
                }
            });

            return res.json({ success: true });

        } catch (error) {
            console.error('Error adding note:', error);
            return res.status(500).json({ success: false, error: 'Failed to add note' });
        }
    }

    /**
     * Move application to a specific round
     * POST /candidates/:applicationId/move-to-round
     */
    static async moveToRound(req: Request, res: Response) {
        try {
            const consultant = (req as ConsultantAuthenticatedRequest).consultant;
            if (!consultant) return res.status(401).json({ success: false, error: 'Unauthorized' });

            const { applicationId } = req.params;
            const { roundId } = req.body;

            if (!roundId) {
                return res.status(400).json({ success: false, error: 'roundId is required' });
            }

            // Validate Application access
            const application = await prisma.application.findUnique({
                where: { id: applicationId },
                include: { job: true }
            });

            if (!application) return res.status(404).json({ success: false, error: 'Application not found' });

            // Security Check
            const isAssigned = application.job.assigned_consultant_id === consultant.id;
            const isLicenseeOfRegion = (consultant.role === 'LICENSEE' || consultant.role === 'AREA_MANAGER')
                && consultant.regionId === application.job.region_id;

            if (!isAssigned && !isLicenseeOfRegion) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            // Validate the round belongs to this job
            const round = await prisma.jobRound.findFirst({
                where: { id: roundId, job_id: application.job_id }
            });

            if (!round) {
                return res.status(400).json({ success: false, error: 'Invalid round for this job' });
            }

            // Determine new stage based on round
            let newStage: ApplicationStage | undefined;
            if (round.is_fixed) {
                switch (round.fixed_key) {
                    case 'NEW': newStage = 'NEW_APPLICATION'; break;
                    case 'OFFER': newStage = 'OFFER_EXTENDED'; break;
                    case 'HIRED': newStage = 'OFFER_ACCEPTED'; break;
                    case 'REJECTED': newStage = 'REJECTED'; break;
                }
            }

            // Create or update ApplicationRoundProgress (same pattern as ApplicationService)
            await prisma.applicationRoundProgress.upsert({
                where: {
                    application_id_job_round_id: {
                        application_id: applicationId,
                        job_round_id: roundId,
                    },
                },
                create: {
                    application_id: applicationId,
                    job_round_id: roundId,
                    completed: false,
                    updated_at: new Date(),
                },
                update: {
                    completed: false,
                    completed_at: null,
                    updated_at: new Date(),
                },
            });

            // Update application stage for backward compatibility
            const updatedApp = await prisma.application.update({
                where: { id: applicationId },
                data: {
                    stage: newStage || application.stage,
                    updated_at: new Date()
                }
            });

            // If moving to HIRED round, confirm commission
            if (round.fixed_key === 'HIRED') {
                try {
                    await CommissionService.confirmCommissionForJob(application.job_id);
                } catch (commError) {
                    console.error('Failed to auto-confirm commission:', commError);
                }
            }

            return res.json({ success: true, data: updatedApp });

        } catch (error) {
            console.error('Error moving to round:', error);
            return res.status(500).json({ success: false, error: 'Failed to move to round' });
        }
    }

    /**
     * Update application stage (for drag-drop pipeline)
     * POST /candidates/:applicationId/stage
     */
    static async updateStage(req: Request, res: Response) {
        try {
            const consultant = (req as ConsultantAuthenticatedRequest).consultant;
            if (!consultant) return res.status(401).json({ success: false, error: 'Unauthorized' });

            const { applicationId } = req.params;
            const { stage } = req.body;

            if (!stage) {
                return res.status(400).json({ success: false, error: 'stage is required' });
            }

            // Validate Application access
            const application = await prisma.application.findUnique({
                where: { id: applicationId },
                include: { job: true }
            });

            if (!application) return res.status(404).json({ success: false, error: 'Application not found' });

            // Security Check
            const isAssigned = application.job.assigned_consultant_id === consultant.id;
            const isLicenseeOfRegion = (consultant.role === 'LICENSEE' || consultant.role === 'AREA_MANAGER')
                && consultant.regionId === application.job.region_id;

            if (!isAssigned && !isLicenseeOfRegion) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }

            // Map stage to status if needed
            let newStatus: ApplicationStatus | undefined;
            if (stage === 'OFFER_EXTENDED') newStatus = 'OFFER';
            else if (stage === 'OFFER_ACCEPTED') newStatus = 'HIRED';
            else if (stage === 'REJECTED') newStatus = 'REJECTED';

            // Update the application
            const updatedApp = await prisma.application.update({
                where: { id: applicationId },
                data: {
                    stage: stage as ApplicationStage,
                    status: newStatus || application.status,
                    updated_at: new Date()
                }
            });

            return res.json({ success: true, data: updatedApp });

        } catch (error) {
            console.error('Error updating stage:', error);
            return res.status(500).json({ success: false, error: 'Failed to update stage' });
        }
    }
}
