import { ConsultantAuthenticatedRequest } from '../../middleware/consultantAuth';
import prisma from '../../lib/prisma';
import { ApplicationStatus, ApplicationStage, NotificationType } from '@prisma/client';
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
                    && consultant.region_id === job.region_id;

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
                && consultant.region_id === application.job.region_id;

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
                        type: NotificationType.APPLICATION_STATUS,
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
            const newNote = `[${new Date().toISOString()}] ${consultant.first_name}: ${note}\n`;
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
}
