/**
 * Consultant Management Service
 * Handles consultant management for HRM8 Admin
 */

import { ConsultantModel, ConsultantData } from '../../models/Consultant';
import { ConsultantRole, ConsultantStatus } from '@prisma/client';
import { hashPassword } from '../../utils/password';
import prisma from '../../lib/prisma';

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
    regionId: string; // Required - consultants must belong to a region
  }): Promise<ConsultantData | { error: string; status: number }> {
    try {
      // Check if consultant already exists
      const existing = await ConsultantModel.findByEmail(consultantData.email);
      if (existing) {
        return { error: 'Consultant with this email already exists', status: 409 };
      }

      // Note: Multiple consultants can belong to the same region
      // (removed the check that prevented multiple consultants per region)

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
    regionIds?: string[];
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
      // Allowing multiple consultants per region now
      /*
      if (data.regionId) {
        const existingRegionConsultant = await ConsultantModel.findByRegionId(data.regionId);
        if (existingRegionConsultant && existingRegionConsultant.id !== id) {
          return { error: 'Region already has a consultant assigned', status: 409 };
        }
      }
      */

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
      // Allowing multiple consultants per region now
      /*
      const existingRegionConsultant = await ConsultantModel.findByRegionId(regionId);
      if (existingRegionConsultant && existingRegionConsultant.id !== consultantId) {
        return { error: 'Region already has a consultant assigned', status: 409 };
      }
      */

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

  /**
   * Delete consultant
   * Soft delete by setting status to INACTIVE
   */
  static async deleteConsultant(id: string): Promise<void | { error: string; status: number }> {
    try {
      // Soft delete by setting status to INACTIVE
      await ConsultantModel.updateStatus(id, ConsultantStatus.INACTIVE);
    } catch (error: any) {
      console.error('Delete consultant error:', error);
      throw error;
    }
  }


  /**
   * Generate HRM8 email address for consultant
   * Format: firstname.lastname@hrm8.com
   * If email exists, appends number (e.g., firstname.lastname2@hrm8.com)
   */
  static async generateEmail(
    firstName: string,
    lastName: string,
    excludeConsultantId?: string
  ): Promise<{ email: string } | { error: string; status: number }> {
    try {
      if (!firstName || !lastName) {
        return { error: 'First name and last name are required', status: 400 };
      }

      // Normalize names: lowercase, remove special characters, handle spaces
      const normalizeName = (name: string): string => {
        return name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, '') // Remove special characters
          .replace(/\s+/g, ''); // Remove spaces
      };

      const normalizedFirstName = normalizeName(firstName);
      const normalizedLastName = normalizeName(lastName);

      if (!normalizedFirstName || !normalizedLastName) {
        return { error: 'Invalid first name or last name', status: 400 };
      }

      // Generate base email
      const baseEmail = `${normalizedFirstName}.${normalizedLastName}@hrm8.com`;

      // Check if base email exists
      const existingBase = await prisma.consultant.findUnique({
        where: { email: baseEmail },
      });

      // If base email doesn't exist or it's the same consultant being updated, return it
      if (!existingBase || (excludeConsultantId && existingBase.id === excludeConsultantId)) {
        return { email: baseEmail };
      }

      // If base email exists, try with numbers
      let counter = 2;
      let generatedEmail = `${normalizedFirstName}.${normalizedLastName}${counter}@hrm8.com`;

      while (counter < 1000) {
        const existing = await prisma.consultant.findUnique({
          where: { email: generatedEmail },
        });

        // If email doesn't exist or it's the same consultant, return it
        if (!existing || (excludeConsultantId && existing.id === excludeConsultantId)) {
          return { email: generatedEmail };
        }

        counter++;
        generatedEmail = `${normalizedFirstName}.${normalizedLastName}${counter}@hrm8.com`;
      }

      // If we've tried 1000 variations, return error
      return { error: 'Unable to generate unique email address', status: 500 };
    } catch (error: any) {
      console.error('Generate email error:', error);
      return { error: 'Failed to generate email address', status: 500 };
    }
  }
}



