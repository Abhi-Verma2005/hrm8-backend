/**
 * CompanySettings Model
 * Handles database operations for company settings including office hours and timezone
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    return prisma.companySettings.findUnique({
      where: { companyId },
    });
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

    return prisma.companySettings.upsert({
      where: { companyId },
      update: {
        timezone: data.timezone ?? undefined,
        workDays: data.workDays ?? undefined,
        startTime: data.startTime ?? undefined,
        endTime: data.endTime ?? undefined,
        lunchStart: data.lunchStart ?? undefined,
        lunchEnd: data.lunchEnd ?? undefined,
        updatedAt: new Date(),
      },
      create: {
        companyId,
        timezone: data.timezone ?? defaults.timezone,
        workDays: data.workDays ?? defaults.workDays,
        startTime: data.startTime ?? defaults.startTime,
        endTime: data.endTime ?? defaults.endTime,
        lunchStart: data.lunchStart ?? null,
        lunchEnd: data.lunchEnd ?? null,
      },
    });
  }

  /**
   * Update company settings
   */
  static async update(
    companyId: string,
    data: UpdateCompanySettingsInput
  ): Promise<CompanySettingsData> {
    return prisma.companySettings.update({
      where: { companyId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
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

