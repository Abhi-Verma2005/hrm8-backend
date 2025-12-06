/**
 * Company Settings Service
 * Manages company-level settings including office hours and timezone
 */

import { CompanySettingsModel, type UpdateCompanySettingsInput } from '../../models/CompanySettings';
import { CompanyService } from '../company/CompanyService';

export interface OfficeHoursConfig {
  timezone: string;
  workDays: string[];
  startTime: string;
  endTime: string;
  lunchStart?: string;
  lunchEnd?: string;
}

export class CompanySettingsService {
  /**
   * Get company settings, or return defaults if not set
   */
  static async getCompanySettings(companyId: string): Promise<OfficeHoursConfig> {
    // Verify company exists
    const company = await CompanyService.findById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    const settings = await CompanySettingsModel.findByCompanyId(companyId);
    
    if (settings) {
      return {
        timezone: settings.timezone || 'UTC',
        workDays: settings.workDays,
        startTime: settings.startTime || '09:00',
        endTime: settings.endTime || '17:00',
        lunchStart: settings.lunchStart || undefined,
        lunchEnd: settings.lunchEnd || undefined,
      };
    }

    // Return defaults
    const defaults = CompanySettingsModel.getDefaults();
    return {
      timezone: defaults.timezone || 'UTC',
      workDays: defaults.workDays,
      startTime: defaults.startTime || '09:00',
      endTime: defaults.endTime || '17:00',
      lunchStart: defaults.lunchStart || undefined,
      lunchEnd: defaults.lunchEnd || undefined,
    };
  }

  /**
   * Create or update company settings
   */
  static async updateCompanySettings(
    companyId: string,
    settings: UpdateCompanySettingsInput
  ): Promise<OfficeHoursConfig> {
    // Verify company exists
    const company = await CompanyService.findById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    // Validate settings
    this.validateSettings(settings);

    // Upsert settings
    const updated = await CompanySettingsModel.upsert(companyId, settings);

    return {
      timezone: updated.timezone || 'UTC',
      workDays: updated.workDays,
      startTime: updated.startTime || '09:00',
      endTime: updated.endTime || '17:00',
      lunchStart: updated.lunchStart || undefined,
      lunchEnd: updated.lunchEnd || undefined,
    };
  }

  /**
   * Validate settings data
   */
  private static validateSettings(settings: UpdateCompanySettingsInput): void {
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    if (settings.workDays) {
      const invalidDays = settings.workDays.filter(day => !validDays.includes(day.toLowerCase()));
      if (invalidDays.length > 0) {
        throw new Error(`Invalid work days: ${invalidDays.join(', ')}`);
      }
    }

    if (settings.startTime && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(settings.startTime)) {
      throw new Error('Invalid start time format. Use HH:MM format (e.g., 09:00)');
    }

    if (settings.endTime && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(settings.endTime)) {
      throw new Error('Invalid end time format. Use HH:MM format (e.g., 17:00)');
    }

    if (settings.lunchStart && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(settings.lunchStart)) {
      throw new Error('Invalid lunch start time format. Use HH:MM format (e.g., 12:00)');
    }

    if (settings.lunchEnd && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(settings.lunchEnd)) {
      throw new Error('Invalid lunch end time format. Use HH:MM format (e.g., 13:00)');
    }

    if (settings.startTime && settings.endTime) {
      const [startHour, startMin] = settings.startTime.split(':').map(Number);
      const [endHour, endMin] = settings.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        throw new Error('End time must be after start time');
      }
    }
  }
}

