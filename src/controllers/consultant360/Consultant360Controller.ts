/**
 * Consultant 360 Controller
 * Handles unified dashboard, earnings, and commission endpoints
 * for users with the CONSULTANT_360 role.
 */

import { Response } from 'express';
import { ConsultantAuthenticatedRequest } from '../../middleware/consultantAuth';
import { UnifiedEarningsService } from '../../services/consultant360/UnifiedEarningsService';
import { WithdrawalService } from '../../services/sales/WithdrawalService';
import { LeadConversionService } from '../../services/sales/LeadConversionService';
import prisma from '../../lib/prisma';

export class Consultant360Controller {
    /**
     * Get Unified Dashboard Statistics
     * GET /api/consultant360/dashboard
     */
    static async getUnifiedDashboard(
        req: ConsultantAuthenticatedRequest,
        res: Response
    ): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const stats = await UnifiedEarningsService.getUnifiedDashboardStats(consultantId);

            // Get active jobs with details
            const activeJobs = await prisma.consultantJobAssignment.findMany({
                where: {
                    consultant_id: consultantId,
                    status: 'ACTIVE',
                },
                include: {
                    job: {
                        select: {
                            id: true,
                            title: true,
                            company: { select: { name: true } },
                            status: true,
                            location: true,
                            created_at: true,
                        },
                    },
                },
                take: 5,
                orderBy: { assigned_at: 'desc' },
            });

            // Get active leads with details
            const activeLeads = await prisma.lead.findMany({
                where: {
                    assigned_consultant_id: consultantId,
                    status: { notIn: ['CONVERTED', 'LOST'] },
                },
                select: {
                    id: true,
                    company_name: true,
                    email: true,
                    status: true,
                    lead_source: true,
                    created_at: true,
                },
                take: 5,
                orderBy: { created_at: 'desc' },
            });

            // Get recent commissions
            const earnings = await UnifiedEarningsService.getUnifiedEarnings(consultantId);

            res.json({
                success: true,
                data: {
                    stats,
                    activeJobs: activeJobs.map((a) => ({
                        id: a.job.id,
                        title: a.job.title,
                        companyName: a.job.company?.name || 'N/A',
                        status: a.job.status,
                        location: a.job.location,
                        assignedAt: a.assigned_at,
                    })),
                    activeLeads: activeLeads.map((l) => ({
                        id: l.id,
                        companyName: l.company_name,
                        contactEmail: l.email,
                        status: l.status,
                        source: l.lead_source,
                        createdAt: l.created_at,
                    })),
                    recentCommissions: earnings.recentCommissions.slice(0, 5),
                    monthlyTrend: earnings.monthlyTrend,
                },
            });
        } catch (error: any) {
            console.error('Get unified dashboard error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch dashboard data',
            });
        }
    }

    /**
     * Get Unified Earnings Breakdown
     * GET /api/consultant360/earnings
     */
    static async getUnifiedEarnings(
        req: ConsultantAuthenticatedRequest,
        res: Response
    ): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const earnings = await UnifiedEarningsService.getUnifiedEarnings(consultantId);

            res.json({
                success: true,
                data: earnings,
            });
        } catch (error: any) {
            console.error('Get unified earnings error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch earnings data',
            });
        }
    }

    /**
     * Get Unified Commissions with Filters
     * GET /api/consultant360/commissions
     * Query params: type (RECRUITER|SALES|ALL), status, limit, offset
     */
    static async getUnifiedCommissions(
        req: ConsultantAuthenticatedRequest,
        res: Response
    ): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { type, status, limit, offset } = req.query;

            const filters: any = {};
            if (type && ['RECRUITER', 'SALES', 'ALL'].includes(type as string)) {
                filters.type = type as 'RECRUITER' | 'SALES' | 'ALL';
            }
            if (status) {
                filters.status = status as any;
            }
            if (limit) {
                filters.limit = parseInt(limit as string, 10);
            }
            if (offset) {
                filters.offset = parseInt(offset as string, 10);
            }

            const result = await UnifiedEarningsService.getCommissions(consultantId, filters);

            res.json({
                success: true,
                data: {
                    commissions: result.commissions,
                    total: result.total,
                    limit: filters.limit || result.total,
                    offset: filters.offset || 0,
                },
            });
        } catch (error: any) {
            console.error('Get unified commissions error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch commissions',
            });
        }
    }

    /**
     * Get Unified Withdrawal Balance
     * GET /api/consultant360/balance
     */
    static async getUnifiedBalance(
        req: ConsultantAuthenticatedRequest,
        res: Response
    ): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const balance = await UnifiedEarningsService.getUnifiedBalance(consultantId);

            res.json({
                success: true,
                data: { balance },
            });
        } catch (error: any) {
            console.error('Get unified balance error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch balance',
            });
        }
    }

    /**
     * Request Unified Withdrawal
     * POST /api/consultant360/withdraw
     * Body: { amount, paymentMethod, paymentDetails?, commissionIds, notes? }
     */
    static async requestWithdrawal(
        req: ConsultantAuthenticatedRequest,
        res: Response
    ): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { amount, paymentMethod, paymentDetails, commissionIds, notes } = req.body;

            // Validation
            if (!amount || amount <= 0) {
                res.status(400).json({ success: false, error: 'Valid amount is required' });
                return;
            }

            if (!paymentMethod) {
                res.status(400).json({ success: false, error: 'Payment method is required' });
                return;
            }

            if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
                res.status(400).json({ success: false, error: 'Commission IDs are required' });
                return;
            }

            // Use existing withdrawal service (works for all commission types)
            const result = await WithdrawalService.createWithdrawal({
                consultantId,
                amount,
                paymentMethod,
                paymentDetails,
                commissionIds,
                notes,
            });

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.status(201).json({
                success: true,
                data: { withdrawal: result.withdrawal },
                message: 'Withdrawal request submitted successfully',
            });
        } catch (error: any) {
            console.error('Request withdrawal error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to create withdrawal request',
            });
        }
    }

    /**
     * Get Withdrawal History
     * GET /api/consultant360/withdrawals
     * Query params: status
     */
    static async getWithdrawals(
        req: ConsultantAuthenticatedRequest,
        res: Response
    ): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { status } = req.query;

            const withdrawals = await WithdrawalService.getWithdrawals(consultantId, {
                status: status as any,
            });

            res.json({
                success: true,
                data: { withdrawals },
            });
        } catch (error: any) {
            console.error('Get withdrawals error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch withdrawals',
            });
        }
    }

    /**
     * Cancel Withdrawal
     * POST /api/consultant360/withdrawals/:id/cancel
     */
    static async cancelWithdrawal(
        req: ConsultantAuthenticatedRequest,
        res: Response
    ): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;

            const result = await WithdrawalService.cancelWithdrawal(id, consultantId);

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.json({
                success: true,
                message: 'Withdrawal cancelled successfully',
            });
        } catch (error: any) {
            console.error('Cancel withdrawal error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to cancel withdrawal',
            });
        }
    }

    /**
     * Execute Withdrawal (Stripe payout)
     * POST /api/consultant360/withdrawals/:id/execute
     */
    static async executeWithdrawal(
        req: ConsultantAuthenticatedRequest,
        res: Response
    ): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;

            // Dynamically import to avoid circular deps
            const { StripePayoutService } = await import('../../services/sales/StripePayoutService');

            const result = await StripePayoutService.executeWithdrawal(id, 'AGENT');

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.json({
                success: true,
                data: { transfer: result.transfer },
                message: 'Payout initiated successfully',
            });
        } catch (error: any) {
            console.error('Execute withdrawal error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to execute withdrawal',
            });
        }
    }

    /**
     * Start Stripe Onboarding
     * POST /api/consultant360/stripe/onboard
     */
    static async stripeOnboard(
        req: ConsultantAuthenticatedRequest,
        res: Response
    ): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { StripeConnectService } = await import('../../services/sales/StripeConnectService');

            const result = await StripeConnectService.createConnectAccount(consultantId);

            res.json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            console.error('Stripe onboard error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to start Stripe onboarding',
            });
        }
    }

    /**
     * Get Stripe Account Status
     * GET /api/consultant360/stripe/status
     */
    static async getStripeStatus(
        req: ConsultantAuthenticatedRequest,
        res: Response
    ): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { StripeConnectService } = await import('../../services/sales/StripeConnectService');

            const status = await StripeConnectService.checkAccountStatus(consultantId);

            res.json({
                success: true,
                data: status,
            });
        } catch (error: any) {
            console.error('Get Stripe status error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get Stripe status',
            });
        }
    }

    /**
     * Get Stripe Login Link
     * POST /api/consultant360/stripe/login-link
     */
    static async getStripeLoginLink(
        req: ConsultantAuthenticatedRequest,
        res: Response
    ): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { StripeConnectService } = await import('../../services/sales/StripeConnectService');

            const url = await StripeConnectService.getLoginLink(consultantId);

            res.json({
                success: true,
                data: { url },
            });
        } catch (error: any) {
            console.error('Get Stripe login link error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get login link',
            });
        }
    }

    /**
     * Get Leads
     * GET /api/consultant360/leads
     */
    static async getLeads(
        req: ConsultantAuthenticatedRequest,
        res: Response
    ): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const leads = await prisma.lead.findMany({
                where: {
                    assigned_consultant_id: consultantId,
                },
                include: {
                    conversion_requests: {
                        orderBy: {
                            created_at: 'desc',
                        },
                        take: 1,
                    },
                },
                orderBy: {
                    created_at: 'desc',
                },
            });

            res.json({
                success: true,
                data: { leads },
            });
        } catch (error: any) {
            console.error('Get leads error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch leads' });
        }
    }

    /**
     * Create Lead
     * POST /api/consultant360/leads
     */
    static async createLead(
        req: ConsultantAuthenticatedRequest,
        res: Response
    ): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { companyName, email, phone, website, country, budget, timeline, message } = req.body;

            // Simple validation
            if (!companyName || !email) {
                res.status(400).json({ success: false, error: 'Company name and email are required' });
                return;
            }

            // Fetch consultant region
            const consultant = await prisma.consultant.findUnique({
                where: { id: consultantId },
                select: { region_id: true }
            });

            if (!consultant) {
                res.status(404).json({ success: false, error: 'Consultant not found' });
                return;
            }

            const lead = await prisma.lead.create({
                data: {
                    assigned_consultant_id: consultantId,
                    created_by: consultantId,
                    referred_by: consultantId, // Ensure attribution for commissions
                    region_id: consultant.region_id,
                    company_name: companyName,
                    email,
                    phone,
                    website,
                    country,
                    status: 'NEW',
                    notes: `Budget: ${budget}\nTimeline: ${timeline}\nMessage: ${message}`
                },
            });

            // Mock qualification data
            const qualification = {
                score: 85,
                category: 'HOT',
                status: 'QUALIFIED',
            };

            res.json({
                success: true,
                data: { lead, qualification },
            });
        } catch (error: any) {
            console.error('Create lead error:', error);
            res.status(500).json({ success: false, error: 'Failed to create lead' });
        }
    }

    /**
     * Submit Conversion Request
     * POST /api/consultant360/leads/:id/conversion-request
     */
    static async submitConversionRequest(
        req: ConsultantAuthenticatedRequest,
        res: Response
    ): Promise<void> {
        try {
            const consultantId = req.consultant?.id;
            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id: leadId } = req.params;
            const { agentNotes, tempPassword } = req.body;

            // Check if lead has region and referrer assigned (Hotfix for existing leads)
            const leadCheck = await prisma.lead.findUnique({
                where: { id: leadId },
                select: { region_id: true, referred_by: true }
            });

            if (leadCheck && (!leadCheck.region_id || !leadCheck.referred_by)) {
                // Fetch consultant region and patch lead
                const consultant = await prisma.consultant.findUnique({
                    where: { id: consultantId },
                    select: { region_id: true }
                });

                if (consultant) {
                    await prisma.lead.update({
                        where: { id: leadId },
                        data: {
                            region_id: leadCheck.region_id || consultant.region_id,
                            referred_by: leadCheck.referred_by || consultantId // Ensure attribution is persistent
                        }
                    });
                }
            }

            const result = await LeadConversionService.submitConversionRequest(leadId, consultantId, {
                agentNotes,
                tempPassword
            });

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.status(201).json({
                success: true,
                data: { request: result.request },
                message: 'Conversion request submitted successfully',
            });
        } catch (error: any) {
            console.error('Submit conversion request error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to submit conversion request',
            });
        }
    }
}
