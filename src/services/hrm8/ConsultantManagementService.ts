/**
 * Consultant Management Service
 * Handles consultant management for HRM8 Admin
 */

import { ConsultantModel, ConsultantData } from '../../models/Consultant';
import { ConsultantRole, ConsultantStatus } from '@prisma/client';
import { hashPassword } from '../../utils/password';

export class ConsultantManagementService {
  /**
   * Create a new consultant (admin only)
   */
  static async createConsultant(consultantData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    photo?: string;
    role: ConsultantRole;
    regionId?: string;
  }): Promise<ConsultantData | { error: string; status: number }> {
    try {
      // Check if consultant already exists
      const existing = await ConsultantModel.findByEmail(consultantData.email);
      if (existing) {
        return { error: 'Consultant with this email already exists', status: 409 };
      }

      // If regionId provided, check if region already has a consultant
      if (consultantData.regionId) {
        const existingRegionConsultant = await ConsultantModel.findByRegionId(consultantData.regionId);
        if (existingRegionConsultant) {
          return { error: 'Region already has a consultant assigned', status: 409 };
        }
      }

      // Hash password
      const passwordHash = await hashPassword(consultantData.password);

      const consultant = await ConsultantModel.create({
        email: consultantData.email,
        passwordHash,
        firstName: consultantData.firstName,
        lastName: consultantData.lastName,
        phone: consultantData.phone,
        photo: consultantData.photo,
        role: consultantData.role,
        regionId: consultantData.regionId,
        status: ConsultantStatus.ACTIVE,
      });

      return consultant;
    } catch (error: any) {
      if (error.code === 'P2002') {
        return { error: 'Consultant email already exists', status: 409 };
      }
      throw error;
    }
  }

  /**
   * Get all consultants with filters
   */
  static async getAllConsultants(filters?: {
    regionId?: string;
    role?: ConsultantRole;
    status?: ConsultantStatus;
  }): Promise<ConsultantData[]> {
    return await ConsultantModel.findAll(filters);
  }

  /**
   * Get consultant by ID
   */
  static async getConsultantById(id: string): Promise<ConsultantData | null> {
    return await ConsultantModel.findById(id);
  }

  /**
   * Update consultant (admin fields)
   */
  static async updateConsultant(
    id: string,
    data: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        photo?: string;
        role?: ConsultantRole;
        status?: ConsultantStatus;
        regionId?: string;
      }
  ): Promise<ConsultantData | { error: string; status: number }> {
    try {
      // If updating regionId, check if that region already has a consultant
      if (data.regionId) {
        const existingRegionConsultant = await ConsultantModel.findByRegionId(data.regionId);
        if (existingRegionConsultant && existingRegionConsultant.id !== id) {
          return { error: 'Region already has a consultant assigned', status: 409 };
        }
      }

      return await ConsultantModel.update(id, data);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Assign consultant to region
   */
  static async assignToRegion(consultantId: string, regionId: string): Promise<ConsultantData | { error: string; status: number }> {
    try {
      // Check if region already has a consultant
      const existingRegionConsultant = await ConsultantModel.findByRegionId(regionId);
      if (existingRegionConsultant && existingRegionConsultant.id !== consultantId) {
        return { error: 'Region already has a consultant assigned', status: 409 };
      }

      return await ConsultantModel.assignToRegion(consultantId, regionId);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Suspend consultant
   */
  static async suspendConsultant(id: string): Promise<void> {
    await ConsultantModel.updateStatus(id, ConsultantStatus.SUSPENDED);
  }

  /**
   * Reactivate consultant
   */
  static async reactivateConsultant(id: string): Promise<void> {
    await ConsultantModel.updateStatus(id, ConsultantStatus.ACTIVE);
  }
}



