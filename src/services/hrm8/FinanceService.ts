import { BillStatus, RevenueStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export class FinanceService {
  /**
   * Get all invoices (bills) with filters
   */
  static async getAllInvoices(filters: {
    status?: BillStatus;
    agingDays?: number; // e.g. > 30 days overdue
    companyId?: string;
  }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.companyId) where.company_id = filters.companyId;

    if (filters.agingDays) {
      const date = new Date();
      date.setDate(date.getDate() - filters.agingDays);
      where.due_date = { lt: date };
      // If filtering by aging, usually implies unpaid
      if (!filters.status) {
         where.status = { in: [BillStatus.PENDING, BillStatus.OVERDUE] };
      }
    }

    return prisma.bill.findMany({
      where,
      include: { company: true },
      orderBy: { due_date: 'asc' }
    });
  }

  /**
   * Calculate settlement for licensee
   * This is a simplified logic: aggregation of revenue in a period
   */
  static async calculateSettlement(licenseeId: string, periodStart: Date, periodEnd: Date) {
    // 1. Aggregate RegionalRevenue for this licensee in the period
    const revenues = await prisma.regionalRevenue.findMany({
      where: {
        licensee_id: licenseeId,
        period_start: { gte: periodStart },
        period_end: { lte: periodEnd },
        status: RevenueStatus.CONFIRMED // Only confirmed revenue
      }
    });

    if (revenues.length === 0) {
      return { error: 'No confirmed revenue found for this period' };
    }

    const totalRevenue = revenues.reduce((sum, r) => sum + r.total_revenue, 0);
    const licenseeShare = revenues.reduce((sum, r) => sum + r.licensee_share, 0);
    const hrm8Share = revenues.reduce((sum, r) => sum + r.hrm8_share, 0);

    // 2. Create Settlement record
    // Note: 'PENDING' string is used as default in schema, checking if it is an enum? 
    // Schema says: status String @default("PENDING")
    const settlement = await prisma.settlement.create({
      data: {
        licensee_id: licenseeId,
        period_start: periodStart,
        period_end: periodEnd,
        total_revenue: totalRevenue,
        licensee_share: licenseeShare,
        hrm8_share: hrm8Share,
        status: 'PENDING',
      }
    });

    return settlement;
  }

  /**
   * Get dunning candidates (companies with overdue bills)
   */
  static async getDunningCandidates() {
    // Find bills overdue > 30 days (default policy)
    const date = new Date();
    date.setDate(date.getDate() - 30);

    return prisma.bill.findMany({
      where: {
        status: { in: [BillStatus.PENDING, BillStatus.OVERDUE] },
        due_date: { lt: date }
      },
      include: { company: true }
    });
  }

  /**
   * Get all settlements with filters
   */
  static async getAllSettlements(filters: {
    licenseeId?: string;
    status?: string;
    periodStart?: Date;
    periodEnd?: Date;
  }) {
    const where: any = {};

    if (filters.licenseeId) where.licensee_id = filters.licenseeId;
    if (filters.status) where.status = filters.status;

    if (filters.periodStart) {
      where.period_start = { gte: filters.periodStart };
    }
    if (filters.periodEnd) {
      where.period_end = { lte: filters.periodEnd };
    }

    return prisma.settlement.findMany({
      where,
      include: {
        licensee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { period_end: 'desc' }
    });
  }

  /**
   * Get settlement by ID with related data
   */
  static async getSettlementById(id: string) {
    return prisma.settlement.findUnique({
      where: { id },
      include: {
        licensee: {
          select: {
            id: true,
            name: true,
            email: true,
            revenue_share_percent: true
          }
        }
      }
    });
  }

  /**
   * Mark settlement as paid
   */
  static async markSettlementAsPaid(id: string, paymentDate: Date, reference: string) {
    return prisma.settlement.update({
      where: { id },
      data: {
        status: 'PAID',
        payment_date: paymentDate,
        reference
      }
    });
  }

  /**
   * Get settlement statistics
   */
  static async getSettlementStats(licenseeId?: string) {
    const where: any = {};
    if (licenseeId) where.licensee_id = licenseeId;

    const [allSettlements, pendingSettlements, paidSettlements] = await Promise.all([
      prisma.settlement.findMany({ where }),
      prisma.settlement.findMany({ where: { ...where, status: 'PENDING' } }),
      prisma.settlement.findMany({ where: { ...where, status: 'PAID' } })
    ]);

    const totalPending = pendingSettlements.reduce((sum, s) => sum + s.licensee_share, 0);
    const totalPaid = paidSettlements.reduce((sum, s) => sum + s.licensee_share, 0);
    const currentPeriodRevenue = allSettlements
      .filter(s => {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return s.period_start >= monthAgo;
      })
      .reduce((sum, s) => sum + s.total_revenue, 0);

    return {
      totalPending,
      totalPaid,
      pendingCount: pendingSettlements.length,
      paidCount: paidSettlements.length,
      currentPeriodRevenue
    };
  }
}
