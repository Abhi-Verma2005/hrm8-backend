/**
 * Region Model
 * Represents geographic regions with ownership (HRM8 or Licensee)
 */

import prisma from '../lib/prisma';
import { RegionOwnerType, Prisma } from '@prisma/client';

export interface RegionData {
  id: string;
  name: string;
  code: string;
  country: string;
  stateProvince?: string;
  city?: string;
  boundaries?: Record<string, unknown>;
  ownerType: RegionOwnerType;
  licenseeId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  licensee?: {
    id: string;
    name: string;
    legalEntityName: string;
    email: string;
  } | null;
}

export class RegionModel {
  /**
   * Create a new region
   */
  static async create(regionData: {
    name: string;
    code: string;
    country: string;
    stateProvince?: string;
    city?: string;
    boundaries?: Record<string, unknown>;
    ownerType?: RegionOwnerType;
    licenseeId?: string;
    isActive?: boolean;
  }): Promise<RegionData> {
    const region = await prisma.region.create({
      data: {
        name: regionData.name.trim(),
        code: regionData.code.trim().toUpperCase(),
        country: regionData.country.trim(),
        state_province: regionData.stateProvince?.trim(),
        city: regionData.city?.trim(),
        boundaries: regionData.boundaries as Prisma.InputJsonValue | undefined,
        owner_type: regionData.ownerType || RegionOwnerType.HRM8,
        licensee_id: regionData.licenseeId,
        is_active: regionData.isActive ?? true,
      },
    });

    return this.mapPrismaToRegion(region);
  }

  /**
   * Find region by ID
   */
  static async findById(id: string): Promise<RegionData | null> {
    const region = await prisma.region.findUnique({
      where: { id },
      include: {
        consultants: true,
        licensee: {
          select: {
            id: true,
            name: true,
            legal_entity_name: true,
            email: true,
          },
        },
      },
    });

    return region ? this.mapPrismaToRegion(region) : null;
  }

  /**
   * Find region by code
   */
  static async findByCode(code: string): Promise<RegionData | null> {
    const region = await prisma.region.findUnique({
      where: { code: code.toUpperCase() },
    });

    return region ? this.mapPrismaToRegion(region) : null;
  }

  /**
   * Find all regions
   */
  static async findAll(filters?: {
    ownerType?: RegionOwnerType;
    licenseeId?: string;
    isActive?: boolean;
    country?: string;
  }): Promise<RegionData[]> {
    const regions = await prisma.region.findMany({
      where: {
        ...(filters?.ownerType && { owner_type: filters.ownerType }),
        ...(filters?.licenseeId && { licensee_id: filters.licenseeId }),
        ...(filters?.isActive !== undefined && { is_active: filters.isActive }),
        ...(filters?.country && { country: filters.country }),
      },
      include: {
        licensee: {
          select: {
            id: true,
            name: true,
            legal_entity_name: true,
            email: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return regions.map((region) => this.mapPrismaToRegion(region));
  }

  /**
   * Update region
   */
  static async update(id: string, data: Partial<RegionData>): Promise<RegionData> {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.code !== undefined) updateData.code = data.code.trim().toUpperCase();
    if (data.country !== undefined) updateData.country = data.country.trim();
    if (data.stateProvince !== undefined) updateData.state_province = data.stateProvince?.trim() || null;
    if (data.city !== undefined) updateData.city = data.city?.trim() || null;
    if (data.boundaries !== undefined) updateData.boundaries = data.boundaries as Prisma.InputJsonValue;
    if (data.ownerType !== undefined) updateData.owner_type = data.ownerType;
    if (data.licenseeId !== undefined) {
      updateData.licensee_id = data.licenseeId ? data.licenseeId : null;
    }
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const region = await prisma.region.update({
      where: { id },
      data: updateData,
      include: {
        licensee: {
          select: {
            id: true,
            name: true,
            legal_entity_name: true,
            email: true,
          },
        },
      },
    });

    return this.mapPrismaToRegion(region);
  }

  /**
   * Delete region
   */
  static async delete(id: string): Promise<void> {
    await prisma.region.delete({
      where: { id },
    });
  }

  /**
   * Assign licensee to region
   */
  static async assignLicensee(regionId: string, licenseeId: string): Promise<RegionData> {
    const region = await prisma.region.update({
      where: { id: regionId },
      data: {
        licensee_id: licenseeId,
        owner_type: RegionOwnerType.LICENSEE,
      },
      include: {
        licensee: {
          select: {
            id: true,
            name: true,
            legal_entity_name: true,
            email: true,
          },
        },
      },
    });

    return this.mapPrismaToRegion(region);
  }

  /**
   * Unassign licensee from region
   */
  static async unassignLicensee(regionId: string): Promise<RegionData> {
    const region = await prisma.region.update({
      where: { id: regionId },
      data: {
        licensee_id: null,
        owner_type: RegionOwnerType.HRM8,
      },
      include: {
        licensee: {
          select: {
            id: true,
            name: true,
            legal_entity_name: true,
            email: true,
          },
        },
      },
    });

    return this.mapPrismaToRegion(region);
  }

  /**
   * Map Prisma region to RegionData interface
   */
  private static mapPrismaToRegion(prismaRegion: any): RegionData {
    return {
      id: prismaRegion.id,
      name: prismaRegion.name,
      code: prismaRegion.code,
      country: prismaRegion.country,
      stateProvince: prismaRegion.state_province || undefined,
      city: prismaRegion.city || undefined,
      boundaries: prismaRegion.boundaries as Record<string, unknown> | undefined,
      ownerType: prismaRegion.owner_type,
      licenseeId: prismaRegion.licensee_id || undefined,
      isActive: prismaRegion.is_active,
      createdAt: prismaRegion.created_at,
      updatedAt: prismaRegion.updated_at,
      licensee: prismaRegion.licensee ? {
        id: prismaRegion.licensee.id,
        name: prismaRegion.licensee.name,
        legalEntityName: prismaRegion.licensee.legal_entity_name,
        email: prismaRegion.licensee.email,
      } : null,
    };
  }
}

