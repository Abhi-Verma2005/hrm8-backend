import { Response } from 'express';
import { FinanceService } from '../../services/hrm8/FinanceService';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import { BillStatus } from '@prisma/client';

export class FinanceController {
  static async getInvoices(req: Hrm8AuthenticatedRequest, res: Response) {
    try {
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status as BillStatus;
      if (req.query.agingDays) filters.agingDays = parseInt(req.query.agingDays as string);
      if (req.query.companyId) filters.companyId = req.query.companyId as string;

      const invoices = await FinanceService.getAllInvoices(filters);
      res.json({ success: true, data: { invoices } });
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
    }
  }

  static async calculateSettlement(req: Hrm8AuthenticatedRequest, res: Response) {
    try {
      const { licenseeId, periodStart, periodEnd } = req.body;
      const settlement = await FinanceService.calculateSettlement(
        licenseeId,
        new Date(periodStart),
        new Date(periodEnd)
      );

      if ('error' in (settlement as any)) {
        res.status(400).json({ success: false, error: (settlement as any).error });
        return;
      }

      res.json({ success: true, data: { settlement } });
    } catch (error) {
      console.error('Calculate settlement error:', error);
      res.status(500).json({ success: false, error: 'Failed to calculate settlement' });
    }
  }

  static async getDunning(_: Hrm8AuthenticatedRequest, res: Response) {
    try {
      const candidates = await FinanceService.getDunningCandidates();
      res.json({ success: true, data: { candidates } });
    } catch (error) {
      console.error('Get dunning error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch dunning candidates' });
    }
  }

  /**
   * Get all settlements with filters
   */
  static async getSettlements(req: Hrm8AuthenticatedRequest, res: Response) {
    try {
      const filters: any = {};

      if (req.query.licenseeId) filters.licenseeId = req.query.licenseeId as string;
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.periodStart) filters.periodStart = new Date(req.query.periodStart as string);
      if (req.query.periodEnd) filters.periodEnd = new Date(req.query.periodEnd as string);

      // If user is REGIONAL_LICENSEE, only show their settlements
      if (req.hrm8User?.role === 'REGIONAL_LICENSEE') {
        filters.licenseeId = req.hrm8User.licenseeId;
      }

      const settlements = await FinanceService.getAllSettlements(filters);
      res.json({ success: true, data: { settlements } });
    } catch (error) {
      console.error('Get settlements error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch settlements' });
    }
  }

  /**
   * Get settlement by ID
   */
  static async getSettlementById(req: Hrm8AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const settlement = await FinanceService.getSettlementById(id);

      if (!settlement) {
        res.status(404).json({ success: false, error: 'Settlement not found' });
        return;
      }

      // If user is REGIONAL_LICENSEE, only allow viewing their own settlement
      if (req.hrm8User?.role === 'REGIONAL_LICENSEE' && settlement.licensee_id !== req.hrm8User.licenseeId) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      res.json({ success: true, data: { settlement } });
    } catch (error) {
      console.error('Get settlement by ID error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch settlement' });
    }
  }

  /**
   * Mark settlement as paid (GLOBAL_ADMIN only)
   */
  static async markSettlementAsPaid(req: Hrm8AuthenticatedRequest, res: Response) {
    try {
      // Validate GLOBAL_ADMIN role
      if (req.hrm8User?.role !== 'GLOBAL_ADMIN') {
        res.status(403).json({ success: false, error: 'Only Global Admins can mark settlements as paid' });
        return;
      }

      const { id } = req.params;
      const { paymentDate, reference } = req.body;

      if (!paymentDate || !reference) {
        res.status(400).json({ success: false, error: 'Payment date and reference are required' });
        return;
      }

      const settlement = await FinanceService.markSettlementAsPaid(
        id,
        new Date(paymentDate),
        reference
      );

      res.json({ success: true, data: { settlement } });
    } catch (error) {
      console.error('Mark settlement as paid error:', error);
      res.status(500).json({ success: false, error: 'Failed to mark settlement as paid' });
    }
  }

  /**
   * Get settlement statistics
   */
  static async getSettlementStats(req: Hrm8AuthenticatedRequest, res: Response) {
    try {
      let licenseeId: string | undefined;

      // If user is REGIONAL_LICENSEE, only show their stats
      if (req.hrm8User?.role === 'REGIONAL_LICENSEE') {
        licenseeId = req.hrm8User.licenseeId;
      } else if (req.query.licenseeId) {
        licenseeId = req.query.licenseeId as string;
      }

      const stats = await FinanceService.getSettlementStats(licenseeId);
      res.json({ success: true, data: { stats } });
    } catch (error) {
      console.error('Get settlement stats error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch settlement stats' });
    }
  }
}
