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
}
