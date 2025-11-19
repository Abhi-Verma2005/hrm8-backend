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
        companyId,
        profileData: {
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
      where: { companyId },
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
      where: { companyId },
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
    companyId: string;
    status: CompanyProfileStatus;
    completionPercentage: number;
    completedSections: CompanyProfileSection[];
    profileData: Prisma.JsonValue | null;
    lastReminderAt: Date | null;
    skipUntil: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): CompanyProfile {
    return {
      id: profile.id,
      companyId: profile.companyId,
      status: profile.status,
      completionPercentage: profile.completionPercentage,
      completedSections: profile.completedSections || [],
      profileData: (profile.profileData as CompanyProfileData | undefined) || undefined,
      lastReminderAt: profile.lastReminderAt || undefined,
      skipUntil: profile.skipUntil || undefined,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}

