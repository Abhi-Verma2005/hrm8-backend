/**
 * Regional Licensee Service
 * Handles regional licensee business logic
 */

import { RegionalLicenseeModel, RegionalLicenseeData } from '../../models/RegionalLicensee';
import { LicenseeStatus, HRM8UserRole } from '@prisma/client';
import { HRM8UserModel } from '../../models/HRM8User';
import { hashPassword } from '../../utils/password';

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
  }): Promise<RegionalLicenseeData | { error: string; status: number }> {
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
  }): Promise<RegionalLicenseeData[]> {
    return await RegionalLicenseeModel.findAll(filters);
  }

  /**
   * Update licensee
   */
  static async update(id: string, data: Partial<RegionalLicenseeData>): Promise<RegionalLicenseeData | { error: string; status: number }> {
    try {
      return await RegionalLicenseeModel.update(id, data);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Suspend licensee
   */
  static async suspend(id: string): Promise<void> {
    await RegionalLicenseeModel.suspend(id);
  }

  /**
   * Terminate licensee
   */
  static async terminate(id: string): Promise<void> {
    await RegionalLicenseeModel.terminate(id);
  }
}

