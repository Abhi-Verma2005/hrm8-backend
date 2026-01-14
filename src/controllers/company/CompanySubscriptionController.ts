/**
 * Company Subscription Controller
 * Handles company-specific subscription queries
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import prisma from '../../lib/prisma';

const PLAN_HIERARCHY = ['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'];

/**
 * Get active subscription with upgrade info
 * GET /api/companies/:id/subscription/active
 */
export class CompanySubscriptionController {
    static async getActiveSubscription(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            // Verify the user belongs to this company
            if (req.user?.companyId !== id) {
                res.status(403).json({
                    success: false,
                    error: 'Unauthorized to access this company\'s subscription',
                });
                return;
            }

            // Find active subscription
            const subscription = await prisma.subscription.findFirst({
                where: {
                    company_id: id,
                    status: 'ACTIVE',
                },
                orderBy: {
                    created_at: 'desc',
                },
            });

            if (!subscription) {
                res.json({
                    success: true,
                    data: null,
                });
                return;
            }

            // Calculate usage stats
            const usagePercent = subscription.job_quota && subscription.job_quota > 0
                ? (subscription.jobs_used / subscription.job_quota) * 100
                : 0;

            // Determine if upgrade is available
            const currentPlanIndex = PLAN_HIERARCHY.indexOf(subscription.plan_type);
            const canUpgrade = currentPlanIndex >= 0 && currentPlanIndex < PLAN_HIERARCHY.length - 2; // Not CUSTOM or ENTERPRISE
            const nextTier = canUpgrade ? PLAN_HIERARCHY[currentPlanIndex + 1] : null;

            res.json({
                success: true,
                data: {
                    subscription: {
                        id: subscription.id,
                        name: subscription.name,
                        plan_type: subscription.plan_type,
                        base_price: subscription.base_price,
                        billing_cycle: subscription.billing_cycle,
                        status: subscription.status,
                        renewal_date: subscription.renewal_date,
                        job_quota: subscription.job_quota,
                        jobs_used: subscription.jobs_used,
                        prepaid_balance: subscription.prepaid_balance,
                    },
                    canUpgrade,
                    nextTier,
                    usagePercent: Math.round(usagePercent),
                },
            });
        } catch (error) {
            console.error('[CompanySubscriptionController] Error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch active subscription',
            });
        }
    }
}
