/**
 * Sales Dashboard Controller
 * Aggregates data for the Sales Agent Dashboard
 */

import { Response } from 'express';
import { ConsultantAuthenticatedRequest } from '../../middleware/consultantAuth';
import { CommissionService } from '../../services/hrm8/CommissionService';
import { LeadService } from '../../services/sales/LeadService';
import prisma from '../../lib/prisma';
import { differenceInMonths } from 'date-fns';

export class SalesDashboardController {
  /**
   * Get Dashboard Statistics
   * GET /api/sales/dashboard/stats
   */
  static async getStats(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // 1. Get Commission Stats
      const commissions = await CommissionService.getConsultantCommissions(consultantId);
      const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0);
      const pendingCommissions = commissions
        .filter(c => c.status === 'PENDING')
        .reduce((sum, c) => sum + c.amount, 0);
      const paidCommissions = commissions
        .filter(c => c.status === 'PAID')
        .reduce((sum, c) => sum + c.amount, 0);

      // 2. Get Lead Stats
      const leads = await LeadService.getLeadsByAgent(consultantId);
      const totalLeads = leads.length;
      const convertedLeads = leads.filter(l => l.status === 'CONVERTED').length;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      // 3. Get Active Companies (Attributed)
      const companies = await prisma.company.findMany({
        where: { referred_by: consultantId },
        select: {
          id: true, name: true, created_at: true, attribution_locked: true, subscription: {
            where: { status: 'ACTIVE' },
            select: { id: true, plan_type: true, start_date: true }
          }
        }
      });

      // Calculate active MRR (Monthly Recurring Revenue) - simplified
      // Assuming Subscription planType maps to a price, or we check subscription.base_price
      // But here we didn't select price. Let's assume we can fetch it or just count subscriptions.
      const activeSubscriptions = companies.filter(c => c.subscription.length > 0).length;

      res.json({
        success: true,
        data: {
          commissions: {
            total: totalCommissions,
            pending: pendingCommissions,
            paid: paidCommissions,
          },
          leads: {
            total: totalLeads,
            converted: convertedLeads,
            conversionRate: Math.round(conversionRate * 10) / 10,
          },
          companies: {
            total: companies.length,
            activeSubscriptions,
          },
          recentActivity: [
            ...commissions.slice(0, 5).map(c => ({
              type: 'COMMISSION',
              description: c.description,
              date: c.createdAt,
              amount: c.amount,
              status: c.status
            })),
            ...leads.slice(0, 5).map(l => ({
              type: 'LEAD',
              description: `New Lead: ${l.company_name}`,
              date: l.created_at,
              status: l.status
            }))
          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
        },
      });
    } catch (error: any) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch dashboard stats',
      });
    }
  }

  /**
   * Get Attributed Companies
   * GET /api/sales/companies
   */
  static async getCompanies(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const companies = await prisma.company.findMany({
        where: { sales_agent_id: consultantId },
        include: {
          subscription: {
            where: { status: 'ACTIVE' },
            take: 1
          }
        },
        orderBy: { created_at: 'desc' }
      });

      // Transform to include subscription status and locking info
      const companyData = companies.map(c => {
        const hasActiveSub = c.subscription.length > 0;
        const sub = hasActiveSub ? c.subscription[0] : null;

        let attributionStatus = 'OPEN';
        if (c.attribution_locked) {
          // Check if expired
          if (c.attribution_locked_at) {
            const months = differenceInMonths(new Date(), c.attribution_locked_at);
            attributionStatus = months < 12 ? 'LOCKED' : 'EXPIRED';
          } else {
            attributionStatus = 'LOCKED';
          }
        }

        return {
          id: c.id,
          name: c.name,
          domain: c.domain,
          createdAt: c.created_at,
          attributionStatus,
          subscription: sub ? {
            plan: sub.plan_type,
            startDate: sub.start_date,
            renewalDate: sub.renewal_date
          } : null
        };
      });

      res.json({
        success: true,
        data: { companies: companyData },
      });
    } catch (error: any) {
      console.error('Get sales companies error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch companies',
      });
    }
  }

  /**
   * Get Commissions
   * GET /api/sales/commissions
   */
  static async getCommissions(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const commissions = await CommissionService.getConsultantCommissions(consultantId);

      res.json({
        success: true,
        data: { commissions },
      });
    } catch (error: any) {
      console.error('Get commissions error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch commissions',
      });
    }
  }
}
