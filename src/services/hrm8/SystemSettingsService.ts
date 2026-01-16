import prisma from '../../lib/prisma';
import { Prisma } from '@prisma/client';

export class SystemSettingsService {
  /**
   * Get setting by key
   */
  static async getSetting(key: string) {
    return prisma.systemSettings.findUnique({
      where: { key },
    });
  }

  /**
   * Get all settings (for admin view)
   */
  static async getAllSettings() {
    return prisma.systemSettings.findMany({
      orderBy: { key: 'asc' },
    });
  }

  /**
   * Set usage for setting (Update or Create)
   */
  static async setSetting(key: string, value: any, isPublic: boolean = false, updatedBy: string = 'system') {
    return prisma.systemSettings.upsert({
      where: { key },
      update: {
        value,
        is_public: isPublic,
        updated_by: updatedBy,
      },
      create: {
        key,
        value,
        is_public: isPublic,
        updated_by: updatedBy,
      },
    });
  }

  /**
   * Get only public settings (for frontend branding etc)
   */
  static async getPublicSettings() {
    return prisma.systemSettings.findMany({
      where: { is_public: true },
    });
  }
}
