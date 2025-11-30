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
        stateProvince: regionData.stateProvince?.trim(),
        city: regionData.city?.trim(),
        boundaries: regionData.boundaries as Prisma.InputJsonValue | undefined,
        ownerType: regionData.ownerType || RegionOwnerType.HRM8,
        licenseeId: regionData.licenseeId,
        isActive: regionData.isActive ?? true,
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
        licensee: true,
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
        ...(filters?.ownerType && { ownerType: filters.ownerType }),
        ...(filters?.licenseeId && { licenseeId: filters.licenseeId }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters?.country && { country: filters.country }),
      },
      orderBy: { name: 'asc' },
    });

    return regions.map((region) => this.mapPrismaToRegion(region));
  }

  /**
   * Update region
   */
  static async update(id: string, data: Partial<RegionData>): Promise<RegionData> {
    const updateData: Prisma.RegionUncheckedUpdateInput = {};
    
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.code !== undefined) updateData.code = data.code.trim().toUpperCase();
    if (data.country !== undefined) updateData.country = data.country.trim();
    if (data.stateProvince !== undefined) updateData.stateProvince = data.stateProvince?.trim() || null;
    if (data.city !== undefined) updateData.city = data.city?.trim() || null;
    if (data.boundaries !== undefined) updateData.boundaries = data.boundaries as Prisma.InputJsonValue;
    if (data.ownerType !== undefined) updateData.ownerType = data.ownerType;
    if (data.licenseeId !== undefined) {
      updateData.licenseeId = data.licenseeId ? data.licenseeId : null;
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const region = await prisma.region.update({
      where: { id },
      data: updateData,
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
        licenseeId,
        ownerType: RegionOwnerType.LICENSEE,
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
        licenseeId: null,
        ownerType: RegionOwnerType.HRM8,
      },
    });

    return this.mapPrismaToRegion(region);
  }

  /**
   * Map Prisma region to RegionData interface
   */
  private static mapPrismaToRegion(prismaRegion: {
    id: string;
    name: string;
    code: string;
    country: string;
    stateProvince: string | null;
    city: string | null;
    boundaries: unknown;
    ownerType: RegionOwnerType;
    licenseeId: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): RegionData {
    return {
      id: prismaRegion.id,
      name: prismaRegion.name,
      code: prismaRegion.code,
      country: prismaRegion.country,
      stateProvince: prismaRegion.stateProvince || undefined,
      city: prismaRegion.city || undefined,
      boundaries: prismaRegion.boundaries as Record<string, unknown> | undefined,
      ownerType: prismaRegion.ownerType,
      licenseeId: prismaRegion.licenseeId || undefined,
      isActive: prismaRegion.isActive,
      createdAt: prismaRegion.createdAt,
      updatedAt: prismaRegion.updatedAt,
    };
  }
}

