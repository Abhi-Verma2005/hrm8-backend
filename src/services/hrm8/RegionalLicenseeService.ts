/**
 * Regional Licensee Service
 * Handles regional licensee business logic with governance automation
 */

import prisma from '../../lib/prisma';
import { RegionalLicenseeModel, RegionalLicenseeData } from '../../models/RegionalLicensee';
import { LicenseeStatus, HRM8UserRole, JobStatus } from '@prisma/client';
import { HRM8UserModel } from '../../models/HRM8User';
import { hashPassword } from '../../utils/password';
import { AuditLogService } from './AuditLogService';
import { SettlementService } from '../billing/SettlementService';

export interface SuspendResult {
  success: boolean;
  licenseeId: string;
  jobsPaused: number;
  regionsAffected: number;
}

export interface TerminateResult {
  success: boolean;
  licenseeId: string;
  regionsUnassigned: number;
  consultantsAffected: number;
  finalSettlement?: {
    amount: number;
    status: string;
  };
}

export class RegionalLicenseeService {
  /**
   * Create a new regional licensee
   */
  static async create(licenseeData: {
    name: string;
    legalEntityName: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    taxId?: string;
    agreementStartDate: Date;
    agreementEndDate?: Date;
    revenueSharePercent: number;
    exclusivity?: boolean;
    contractFileUrl?: string;
    managerContact: string;
    financeContact?: string;
    complianceContact?: string;
    password?: string;
  }, performedBy?: string): Promise<RegionalLicenseeData | { error: string; status: number }> {
    try {
      // Check if email already exists
      const existing = await RegionalLicenseeModel.findByEmail(licenseeData.email);
      if (existing) {
        return { error: 'Licensee with this email already exists', status: 409 };
      }

      // 1. Create the licensee record
      const licensee = await RegionalLicenseeModel.create(licenseeData);

      // 2. Create the HRM8User entry for login
      if (licensee && 'id' in licensee) {
        const password = licenseeData.password || 'vAbhi2678';
        const passwordHash = await hashPassword(password);

        // Split name for first/last name if possible, otherwise use name as first and contact as last
        const nameParts = licenseeData.managerContact.split(' ');
        const firstName = nameParts[0] || licenseeData.name;
        const lastName = nameParts.slice(1).join(' ') || 'Licensee';

        await HRM8UserModel.create({
          email: licenseeData.email,
          passwordHash,
          firstName,
          lastName,
          role: HRM8UserRole.REGIONAL_LICENSEE,
          licenseeId: licensee.id,
        });

        // Audit log
        if (performedBy) {
          await AuditLogService.log({
            entityType: 'LICENSEE',
            entityId: licensee.id,
            action: 'CREATE',
            newValue: { name: licensee.name, email: licensee.email },
            performedBy,
          });
        }
      }

      return licensee;
    } catch (error: any) {
      if (error.code === 'P2002') {
        return { error: 'Licensee email already exists', status: 409 };
      }
      throw error;
    }
  }

  /**
   * Get licensee by ID
   */
  static async getById(id: string): Promise<RegionalLicenseeData | null> {
    return await RegionalLicenseeModel.findById(id);
  }

  /**
   * Get all licensees with filters
   */
  static async getAll(filters?: {
    status?: LicenseeStatus;
    licenseeId?: string;
  }): Promise<RegionalLicenseeData[]> {
    return await RegionalLicenseeModel.findAll(filters);
  }

  /**
   * Update licensee
   */
  static async update(
    id: string,
    data: Partial<RegionalLicenseeData>,
    performedBy?: string
  ): Promise<RegionalLicenseeData | { error: string; status: number }> {
    try {
      const oldData = await RegionalLicenseeModel.findById(id);
      const result = await RegionalLicenseeModel.update(id, data);

      // Audit log for updates
      if (performedBy && oldData) {
        await AuditLogService.log({
          entityType: 'LICENSEE',
          entityId: id,
          action: 'UPDATE',
          oldValue: {
            name: oldData.name,
            status: oldData.status,
            revenueSharePercent: oldData.revenueSharePercent
          },
          newValue: data,
          performedBy,
        });
      }

      return result;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Suspend licensee - AUTOMATED
   * - Changes status to SUSPENDED
   * - Pauses all active jobs in licensee's regions
   * - Creates audit log entry
   * - Returns impact counts
   */
  static async suspend(
    id: string,
    options?: { performedBy?: string; notes?: string }
  ): Promise<SuspendResult> {
    // Get licensee and their regions
    const licensee = await RegionalLicenseeModel.findById(id);
    if (!licensee) {
      throw new Error('Licensee not found');
    }

    // Get regions owned by this licensee
    const regions = await prisma.region.findMany({
      where: { licensee_id: id },
      select: { id: true },
    });
    const regionIds = regions.map(r => r.id);

    // Pause all active jobs in these regions
    const pauseResult = await prisma.job.updateMany({
      where: {
        region_id: { in: regionIds },
        status: JobStatus.OPEN,
      },
      data: {
        status: JobStatus.ON_HOLD,
        updated_at: new Date(),
      },
    });

    // Update licensee status
    await RegionalLicenseeModel.suspend(id);

    // Audit log
    if (options?.performedBy) {
      await AuditLogService.log({
        entityType: 'LICENSEE',
        entityId: id,
        action: 'SUSPEND',
        oldValue: { status: licensee.status },
        newValue: {
          status: 'SUSPENDED',
          jobsPaused: pauseResult.count,
          regionsAffected: regionIds.length,
        },
        performedBy: options.performedBy,
        notes: options.notes,
      });
    }

    return {
      success: true,
      licenseeId: id,
      jobsPaused: pauseResult.count,
      regionsAffected: regionIds.length,
    };
  }

  /**
   * Terminate licensee - AUTOMATED
   * - Changes status to TERMINATED
   * - Unassigns all regions (returns to HRM8)
   * - Generates final settlement for pending revenue
   * - Creates audit log entry
   * - Returns impact counts
   */
  static async terminate(
    id: string,
    options?: { performedBy?: string; notes?: string }
  ): Promise<TerminateResult> {
    // Get licensee
    const licensee = await RegionalLicenseeModel.findById(id);
    if (!licensee) {
      throw new Error('Licensee not found');
    }

    // Get regions owned by this licensee
    const regions = await prisma.region.findMany({
      where: { licensee_id: id },
      select: { id: true },
    });
    const regionIds = regions.map(r => r.id);

    // Count consultants in these regions
    const consultantsCount = await prisma.consultant.count({
      where: { region_id: { in: regionIds } },
    });

    // Unassign all regions (return to HRM8)
    await prisma.region.updateMany({
      where: { licensee_id: id },
      data: {
        licensee_id: null,
        owner_type: 'HRM8',
        updated_at: new Date(),
      },
    });

    // Re-open any paused jobs (now under HRM8)
    await prisma.job.updateMany({
      where: {
        region_id: { in: regionIds },
        status: JobStatus.ON_HOLD,
      },
      data: {
        status: JobStatus.OPEN,
        updated_at: new Date(),
      },
    });

    // Generate final settlement
    let finalSettlement: { amount: number; status: string } | undefined;
    try {
      const settlementResult = await SettlementService.generateSettlement(id, new Date());
      if (settlementResult.success && settlementResult.settlement) {
        finalSettlement = {
          amount: settlementResult.settlement.licenseeShare,
          status: 'PENDING',
        };
      }
    } catch (e) {
      console.error('Failed to generate final settlement:', e);
      // Continue with termination even if settlement fails
    }

    // Update licensee status
    await RegionalLicenseeModel.terminate(id);

    // Audit log
    if (options?.performedBy) {
      await AuditLogService.log({
        entityType: 'LICENSEE',
        entityId: id,
        action: 'TERMINATE',
        oldValue: { status: licensee.status, regions: regionIds },
        newValue: {
          status: 'TERMINATED',
          regionsUnassigned: regionIds.length,
          consultantsAffected: consultantsCount,
          finalSettlement,
        },
        performedBy: options.performedBy,
        notes: options.notes,
      });
    }

    return {
      success: true,
      licenseeId: id,
      regionsUnassigned: regionIds.length,
      consultantsAffected: consultantsCount,
      finalSettlement,
    };
  }

  /**
   * Reactivate a suspended licensee
   */
  static async reactivate(
    id: string,
    options?: { performedBy?: string; notes?: string }
  ): Promise<{ success: boolean; jobsResumed: number }> {
    const licensee = await RegionalLicenseeModel.findById(id);
    if (!licensee) {
      throw new Error('Licensee not found');
    }

    if (licensee.status !== 'SUSPENDED') {
      throw new Error('Only suspended licensees can be reactivated');
    }

    // Get regions
    const regions = await prisma.region.findMany({
      where: { licensee_id: id },
      select: { id: true },
    });
    const regionIds = regions.map(r => r.id);

    // Resume paused jobs
    const resumeResult = await prisma.job.updateMany({
      where: {
        region_id: { in: regionIds },
        status: JobStatus.ON_HOLD,
      },
      data: {
        status: JobStatus.OPEN,
        updated_at: new Date(),
      },
    });

    // Update status
    await RegionalLicenseeModel.update(id, { status: 'ACTIVE' as LicenseeStatus });

    // Audit log
    if (options?.performedBy) {
      await AuditLogService.log({
        entityType: 'LICENSEE',
        entityId: id,
        action: 'REACTIVATE',
        oldValue: { status: 'SUSPENDED' },
        newValue: { status: 'ACTIVE', jobsResumed: resumeResult.count },
        performedBy: options.performedBy,
        notes: options.notes,
      });
    }

    return {
      success: true,
      jobsResumed: resumeResult.count,
    };
  }

  /**
   * Get impact preview for suspend/terminate
   */
  static async getImpactPreview(id: string): Promise<{
    regions: number;
    activeJobs: number;
    consultants: number;
    pendingRevenue: number;
  }> {
    const regions = await prisma.region.findMany({
      where: { licensee_id: id },
      select: { id: true },
    });
    const regionIds = regions.map(r => r.id);

    const [activeJobs, consultants, pendingRevenue] = await Promise.all([
      prisma.job.count({
        where: { region_id: { in: regionIds }, status: JobStatus.OPEN },
      }),
      prisma.consultant.count({
        where: { region_id: { in: regionIds }, status: 'ACTIVE' },
      }),
      prisma.regionalRevenue.aggregate({
        where: { licensee_id: id, status: 'PENDING' },
        _sum: { licensee_share: true },
      }),
    ]);

    return {
      regions: regionIds.length,
      activeJobs,
      consultants,
      pendingRevenue: pendingRevenue._sum.licensee_share || 0,
    };
  }
}
