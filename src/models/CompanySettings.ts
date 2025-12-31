/**
 * CompanySettings Model
 * Handles database operations for company settings including office hours and timezone
 */

import { prisma } from '../lib/prisma';

export interface CompanySettingsData {
  id: string;
  companyId: string;
  timezone: string | null;
  workDays: string[];
  startTime: string | null;
  endTime: string | null;
  lunchStart: string | null;
  lunchEnd: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanySettingsInput {
  companyId: string;
  timezone?: string;
  workDays?: string[];
  startTime?: string;
  endTime?: string;
  lunchStart?: string;
  lunchEnd?: string;
}

export interface UpdateCompanySettingsInput {
  timezone?: string;
  workDays?: string[];
  startTime?: string;
  endTime?: string;
  lunchStart?: string;
  lunchEnd?: string;
}

export class CompanySettingsModel {
  /**
   * Find settings by company ID
   */
  static async findByCompanyId(companyId: string): Promise<CompanySettingsData | null> {
    const settings = await prisma.companySettings.findUnique({
      where: { company_id: companyId },
    });
    return settings ? this.mapPrismaToCompanySettings(settings) : null;
  }

  /**
   * Create or update company settings (upsert)
   */
  static async upsert(
    companyId: string,
    data: UpdateCompanySettingsInput
  ): Promise<CompanySettingsData> {
    const defaults = {
      timezone: 'UTC',
      workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      startTime: '09:00',
      endTime: '17:00',
    };

    const settings = await prisma.companySettings.upsert({
      where: { company_id: companyId },
      update: {
        timezone: data.timezone ?? undefined,
        work_days: data.workDays ?? undefined,
        start_time: data.startTime ?? undefined,
        end_time: data.endTime ?? undefined,
        lunch_start: data.lunchStart ?? undefined,
        lunch_end: data.lunchEnd ?? undefined,
        updated_at: new Date(),
      },
      create: {
        id: companyId,
        company_id: companyId,
        timezone: data.timezone ?? defaults.timezone,
        work_days: data.workDays ?? defaults.workDays,
        start_time: data.startTime ?? defaults.startTime,
        end_time: data.endTime ?? defaults.endTime,
        lunch_start: data.lunchStart ?? null,
        lunch_end: data.lunchEnd ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    return this.mapPrismaToCompanySettings(settings);
  }

  /**
   * Update company settings
   */
  static async update(
    companyId: string,
    data: UpdateCompanySettingsInput
  ): Promise<CompanySettingsData> {
    const settings = await prisma.companySettings.update({
      where: { company_id: companyId },
      data: {
        ...data,
        work_days: data.workDays,
        start_time: data.startTime,
        end_time: data.endTime,
        lunch_start: data.lunchStart,
        lunch_end: data.lunchEnd,
        updated_at: new Date(),
      },
    });
    return this.mapPrismaToCompanySettings(settings);
  }

  /**
   * Map Prisma CompanySettings to CompanySettingsData
   */
  private static mapPrismaToCompanySettings(prismaSettings: any): CompanySettingsData {
    return {
      id: prismaSettings.id,
      companyId: prismaSettings.company_id,
      timezone: prismaSettings.timezone,
      workDays: prismaSettings.work_days,
      startTime: prismaSettings.start_time,
      endTime: prismaSettings.end_time,
      lunchStart: prismaSettings.lunch_start,
      lunchEnd: prismaSettings.lunch_end,
      createdAt: prismaSettings.created_at,
      updatedAt: prismaSettings.updated_at,
    };
  }

  /**
   * Get default settings (when company doesn't have settings yet)
   */
  static getDefaults(): Omit<CompanySettingsData, 'id' | 'companyId' | 'createdAt' | 'updatedAt'> {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      startTime: '09:00',
      endTime: '17:00',
      lunchStart: null,
      lunchEnd: null,
    };
  }
}

