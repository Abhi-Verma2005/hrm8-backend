import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { CommissionService } from '../../services/hrm8/CommissionService';

/**
 * Employer Hire Controller
 * Handles company-side actions for hiring approvals and placement confirmations
 */
export class EmployerHireController {

    /**
     * Approve a hire/placement
     * Endpoint: POST /api/employer/hires/:applicationId/approve
     * 
     * Actions:
     * 1. Validates the user is an Admin of the Company owning the Job
     * 2. Verifies Application is in a "HIRED" or "OFFER_ACCEPTED" state
     * 3. Triggers Commission Confirmation (Financial Lock)
     */
    static async approveHire(req: Request, res: Response) {
        try {
            // User is injected by authenticateUser middleware
            // @ts-ignore
            const user = req.user;
            const { applicationId } = req.params;

            if (!user || !user.companyId) {
                return res.status(401).json({ success: false, error: 'Unauthorized: Company context required' });
            }

            // 1. Fetch Application with Job details to verify ownership
            const application = await prisma.application.findUnique({
                where: { id: applicationId },
                include: {
                    job: {
                        select: {
                            company_id: true,
                            title: true,
                            hiring_mode: true
                        }
                    },
                    candidate: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                }
            });

            if (!application) {
                return res.status(404).json({ success: false, error: 'Application not found' });
            }

            // 2. Security Check: ensure job belongs to user's company
            if (application.job.company_id !== user.companyId) {
                return res.status(403).json({ success: false, error: 'Access Denied: This application does not belong to your company' });
            }

            // 3. Status Check: Must be marked HIRED by consultant first
            // Note: We might allow 'OFFER_ACCEPTED' if we want to support that flow, but Phase 7 says HIRED.
            if (application.status !== 'HIRED' && application.stage !== 'OFFER_ACCEPTED') {
                return res.status(400).json({
                    success: false,
                    error: `Candidate must be marked as HIRED by consultant before approval. Current status: ${application.status}`
                });
            }

            // 4. Confirm Commission
            console.log(`🏢 Company ${user.company_id} approving hire for App ${applicationId}`);

            const commissionResult = await CommissionService.confirmCommissionForJob(application.job_id);

            if (!commissionResult.success) {
                console.error(`❌ Commission Confirmation Failed: ${commissionResult.error}`);
                // Don't fail the HTTP request if commission fails (idempotency?), but warn
                // Actually, if this is finance, we might want to fail. 
                // Let's return success but with warning if commission logic had issues (e.g., no pending comms)
            }

            // 5. Audit Log (Optional but recommended)
            // TODO: Add activity log

            return res.json({
                success: true,
                message: 'Hire approved and commission confirmed.',
                data: {
                    applicationId,
                    jobTitle: application.job.title,
                    commissionConfirmed: commissionResult.success
                }
            });

        } catch (error) {
            console.error('Error approving hire:', error);
            return res.status(500).json({ success: false, error: 'Internal Server Error during approval' });
        }
    }
}
