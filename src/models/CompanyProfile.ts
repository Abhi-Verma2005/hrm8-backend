/**
 * Company Profile Model
 * Provides data access helpers for company onboarding profiles
 */

import { Prisma } from '@prisma/client';
import {
  CompanyProfile,
  CompanyProfileData,
  CompanyProfileStatus,
  CompanyProfileSection,
} from '../types';
import prisma from '../lib/prisma';

const DEFAULT_PROFILE_DATA: CompanyProfileData = {
  teamMembers: {
    invites: [],
  },
  additionalLocations: [],
};

export class CompanyProfileModel {
  /**
   * Create a profile for a company
   */
  static async create(
    companyId: string,
    data: Partial<CompanyProfileData> = {}
  ): Promise<CompanyProfile> {
    const profile = await prisma.companyProfile.create({
      data: {
        company_id: companyId,
        profile_data: {
          ...DEFAULT_PROFILE_DATA,
          ...data,
        } as Prisma.JsonObject,
      },
    });

    return this.mapPrismaToProfile(profile);
  }

  /**
   * Get profile by company id
   */
  static async findByCompanyId(companyId: string): Promise<CompanyProfile | null> {
    const profile = await prisma.companyProfile.findUnique({
      where: { company_id: companyId },
    });

    return profile ? this.mapPrismaToProfile(profile) : null;
  }

  /**
   * Update a company profile by company ID
   */
  static async updateByCompanyId(
    companyId: string,
    data: Prisma.CompanyProfileUpdateInput
  ): Promise<CompanyProfile> {
    const profile = await prisma.companyProfile.update({
      where: { company_id: companyId },
      data,
    });

    return this.mapPrismaToProfile(profile);
  }

  /**
   * Ensure a profile exists and return it
   */
  static async getOrCreate(companyId: string): Promise<CompanyProfile> {
    const existing = await this.findByCompanyId(companyId);
    if (existing) {
      return existing;
    }
    return this.create(companyId);
  }

  /**
   * Map Prisma model to domain model
   */
  private static mapPrismaToProfile(profile: {
    id: string;
    company_id: string;
    status: CompanyProfileStatus;
    completion_percentage: number;
    completed_sections: CompanyProfileSection[];
    profile_data: Prisma.JsonValue | null;
    last_reminder_at: Date | null;
    skip_until: Date | null;
    created_at: Date;
    updated_at: Date;
  }): CompanyProfile {
    return {
      id: profile.id,
      companyId: profile.company_id,
      status: profile.status,
      completionPercentage: profile.completion_percentage,
      completedSections: profile.completed_sections || [],
      profileData: (profile.profile_data as CompanyProfileData | undefined) || undefined,
      lastReminderAt: profile.last_reminder_at || undefined,
      skipUntil: profile.skip_until || undefined,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  }
}

