/**
 * RegionalLicensee Model
 * Represents regional licensee entities managing regions
 */

import prisma from '../lib/prisma';
import { LicenseeStatus } from '@prisma/client';

export interface RegionalLicenseeData {
  id: string;
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
  exclusivity: boolean;
  contractFileUrl?: string;
  managerContact: string;
  financeContact?: string;
  complianceContact?: string;
  status: LicenseeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class RegionalLicenseeModel {
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
    status?: LicenseeStatus;
  }): Promise<RegionalLicenseeData> {
    const licensee = await prisma.regionalLicensee.create({
      data: {
        name: licenseeData.name.trim(),
        legalEntityName: licenseeData.legalEntityName.trim(),
        email: licenseeData.email.toLowerCase().trim(),
        phone: licenseeData.phone?.trim(),
        address: licenseeData.address?.trim(),
        city: licenseeData.city?.trim(),
        state: licenseeData.state?.trim(),
        country: licenseeData.country?.trim(),
        taxId: licenseeData.taxId?.trim(),
        agreementStartDate: licenseeData.agreementStartDate,
        agreementEndDate: licenseeData.agreementEndDate,
        revenueSharePercent: licenseeData.revenueSharePercent,
        exclusivity: licenseeData.exclusivity ?? false,
        contractFileUrl: licenseeData.contractFileUrl,
        managerContact: licenseeData.managerContact.trim(),
        financeContact: licenseeData.financeContact?.trim(),
        complianceContact: licenseeData.complianceContact?.trim(),
        status: licenseeData.status || LicenseeStatus.ACTIVE,
      },
    });

    return this.mapPrismaToLicensee(licensee);
  }

  /**
   * Find licensee by ID
   */
  static async findById(id: string): Promise<RegionalLicenseeData | null> {
    const licensee = await prisma.regionalLicensee.findUnique({
      where: { id },
      include: {
        regions: true,
      },
    });

    return licensee ? this.mapPrismaToLicensee(licensee) : null;
  }

  /**
   * Find licensee by email
   */
  static async findByEmail(email: string): Promise<RegionalLicenseeData | null> {
    const licensee = await prisma.regionalLicensee.findFirst({
      where: { email: email.toLowerCase().trim() },
    });

    return licensee ? this.mapPrismaToLicensee(licensee) : null;
  }

  /**
   * Find all licensees
   */
  static async findAll(filters?: {
    status?: LicenseeStatus;
  }): Promise<RegionalLicenseeData[]> {
    const licensees = await prisma.regionalLicensee.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { name: 'asc' },
    });

    return licensees.map((licensee) => this.mapPrismaToLicensee(licensee));
  }

  /**
   * Update licensee
   */
  static async update(id: string, data: Partial<RegionalLicenseeData>): Promise<RegionalLicenseeData> {
    const licensee = await prisma.regionalLicensee.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.legalEntityName !== undefined && { legalEntityName: data.legalEntityName.trim() }),
        ...(data.email !== undefined && { email: data.email.toLowerCase().trim() }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() }),
        ...(data.address !== undefined && { address: data.address?.trim() }),
        ...(data.city !== undefined && { city: data.city?.trim() }),
        ...(data.state !== undefined && { state: data.state?.trim() }),
        ...(data.country !== undefined && { country: data.country?.trim() }),
        ...(data.taxId !== undefined && { taxId: data.taxId?.trim() }),
        ...(data.agreementStartDate !== undefined && { agreementStartDate: data.agreementStartDate }),
        ...(data.agreementEndDate !== undefined && { agreementEndDate: data.agreementEndDate }),
        ...(data.revenueSharePercent !== undefined && { revenueSharePercent: data.revenueSharePercent }),
        ...(data.exclusivity !== undefined && { exclusivity: data.exclusivity }),
        ...(data.contractFileUrl !== undefined && { contractFileUrl: data.contractFileUrl }),
        ...(data.managerContact !== undefined && { managerContact: data.managerContact.trim() }),
        ...(data.financeContact !== undefined && { financeContact: data.financeContact?.trim() }),
        ...(data.complianceContact !== undefined && { complianceContact: data.complianceContact?.trim() }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    return this.mapPrismaToLicensee(licensee);
  }

  /**
   * Update status
   */
  static async updateStatus(id: string, status: LicenseeStatus): Promise<void> {
    await prisma.regionalLicensee.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Suspend licensee
   */
  static async suspend(id: string): Promise<void> {
    await this.updateStatus(id, LicenseeStatus.SUSPENDED);
  }

  /**
   * Terminate licensee
   */
  static async terminate(id: string): Promise<void> {
    await this.updateStatus(id, LicenseeStatus.TERMINATED);
  }

  /**
   * Map Prisma licensee to RegionalLicenseeData interface
   */
  private static mapPrismaToLicensee(prismaLicensee: {
    id: string;
    name: string;
    legalEntityName: string;
    email: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    taxId: string | null;
    agreementStartDate: Date;
    agreementEndDate: Date | null;
    revenueSharePercent: number;
    exclusivity: boolean;
    contractFileUrl: string | null;
    managerContact: string;
    financeContact: string | null;
    complianceContact: string | null;
    status: LicenseeStatus;
    createdAt: Date;
    updatedAt: Date;
  }): RegionalLicenseeData {
    return {
      id: prismaLicensee.id,
      name: prismaLicensee.name,
      legalEntityName: prismaLicensee.legalEntityName,
      email: prismaLicensee.email,
      phone: prismaLicensee.phone || undefined,
      address: prismaLicensee.address || undefined,
      city: prismaLicensee.city || undefined,
      state: prismaLicensee.state || undefined,
      country: prismaLicensee.country || undefined,
      taxId: prismaLicensee.taxId || undefined,
      agreementStartDate: prismaLicensee.agreementStartDate,
      agreementEndDate: prismaLicensee.agreementEndDate || undefined,
      revenueSharePercent: prismaLicensee.revenueSharePercent,
      exclusivity: prismaLicensee.exclusivity,
      contractFileUrl: prismaLicensee.contractFileUrl || undefined,
      managerContact: prismaLicensee.managerContact,
      financeContact: prismaLicensee.financeContact || undefined,
      complianceContact: prismaLicensee.complianceContact || undefined,
      status: prismaLicensee.status,
      createdAt: prismaLicensee.createdAt,
      updatedAt: prismaLicensee.updatedAt,
    };
  }
}

