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
        legal_entity_name: licenseeData.legalEntityName.trim(),
        email: licenseeData.email.toLowerCase().trim(),
        phone: licenseeData.phone?.trim(),
        address: licenseeData.address?.trim(),
        city: licenseeData.city?.trim(),
        state: licenseeData.state?.trim(),
        country: licenseeData.country?.trim(),
        tax_id: licenseeData.taxId?.trim(),
        agreement_start_date: licenseeData.agreementStartDate,
        agreement_end_date: licenseeData.agreementEndDate,
        revenue_share_percent: licenseeData.revenueSharePercent,
        exclusivity: licenseeData.exclusivity ?? false,
        contract_file_url: licenseeData.contractFileUrl,
        manager_contact: licenseeData.managerContact.trim(),
        finance_contact: licenseeData.financeContact?.trim(),
        compliance_contact: licenseeData.complianceContact?.trim(),
        status: licenseeData.status || LicenseeStatus.ACTIVE,
        updated_at: new Date(),
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
    licenseeId?: string;
  }): Promise<RegionalLicenseeData[]> {
    const licensees = await prisma.regionalLicensee.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.licenseeId && { id: filters.licenseeId }),
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
        ...(data.legalEntityName !== undefined && { legal_entity_name: data.legalEntityName.trim() }),
        ...(data.email !== undefined && { email: data.email.toLowerCase().trim() }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() }),
        ...(data.address !== undefined && { address: data.address?.trim() }),
        ...(data.city !== undefined && { city: data.city?.trim() }),
        ...(data.state !== undefined && { state: data.state?.trim() }),
        ...(data.country !== undefined && { country: data.country?.trim() }),
        ...(data.taxId !== undefined && { tax_id: data.taxId?.trim() }),
        ...(data.agreementStartDate !== undefined && { agreement_start_date: data.agreementStartDate }),
        ...(data.agreementEndDate !== undefined && { agreement_end_date: data.agreementEndDate }),
        ...(data.revenueSharePercent !== undefined && { revenue_share_percent: data.revenueSharePercent }),
        ...(data.exclusivity !== undefined && { exclusivity: data.exclusivity }),
        ...(data.contractFileUrl !== undefined && { contract_file_url: data.contractFileUrl }),
        ...(data.managerContact !== undefined && { manager_contact: data.managerContact.trim() }),
        ...(data.financeContact !== undefined && { finance_contact: data.financeContact?.trim() }),
        ...(data.complianceContact !== undefined && { compliance_contact: data.complianceContact?.trim() }),
        ...(data.status !== undefined && { status: data.status }),
        updated_at: new Date(),
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
      data: { 
        status,
        updated_at: new Date(),
      },
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
  private static mapPrismaToLicensee(prismaLicensee: any): RegionalLicenseeData {
    return {
      id: prismaLicensee.id,
      name: prismaLicensee.name,
      legalEntityName: prismaLicensee.legal_entity_name,
      email: prismaLicensee.email,
      phone: prismaLicensee.phone || undefined,
      address: prismaLicensee.address || undefined,
      city: prismaLicensee.city || undefined,
      state: prismaLicensee.state || undefined,
      country: prismaLicensee.country || undefined,
      taxId: prismaLicensee.tax_id || undefined,
      agreementStartDate: prismaLicensee.agreement_start_date,
      agreementEndDate: prismaLicensee.agreement_end_date || undefined,
      revenueSharePercent: prismaLicensee.revenue_share_percent,
      exclusivity: prismaLicensee.exclusivity,
      contractFileUrl: prismaLicensee.contract_file_url || undefined,
      managerContact: prismaLicensee.manager_contact,
      financeContact: prismaLicensee.finance_contact || undefined,
      complianceContact: prismaLicensee.compliance_contact || undefined,
      status: prismaLicensee.status,
      createdAt: prismaLicensee.created_at,
      updatedAt: prismaLicensee.updated_at,
    };
  }
}

