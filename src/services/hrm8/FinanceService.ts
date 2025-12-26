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
    if (filters.companyId) where.companyId = filters.companyId;

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
      include: { Company: true },
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
        licenseeId,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
        status: RevenueStatus.CONFIRMED // Only confirmed revenue
      }
    });

    if (revenues.length === 0) {
      return { error: 'No confirmed revenue found for this period' };
    }

    const totalRevenue = revenues.reduce((sum, r) => sum + r.totalRevenue, 0);
    const licenseeShare = revenues.reduce((sum, r) => sum + r.licenseeShare, 0);
    const hrm8Share = revenues.reduce((sum, r) => sum + r.hrm8Share, 0);

    // 2. Create Settlement record
    // Note: 'PENDING' string is used as default in schema, checking if it is an enum? 
    // Schema says: status String @default("PENDING")
    const settlement = await prisma.settlement.create({
      data: {
        licenseeId,
        periodStart,
        periodEnd,
        totalRevenue,
        licenseeShare,
        hrm8Share,
        status: 'PENDING'
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
      include: { Company: true }
    });
  }
}
