/**
 * Company Model
 * Represents a company workspace in the HRM8 system
 */

import { Company, CompanyVerificationStatus, VerificationMethod } from '../types';
import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

export class CompanyModel {
  /**
   * Create a new company
   */
  static async create(
    companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Company> {
    const company = await prisma.company.create({
      data: {
        name: companyData.name,
        website: companyData.website,
        domain: companyData.domain,
        verificationStatus: companyData.verificationStatus,
        verificationMethod: companyData.verificationMethod,
        verifiedAt: companyData.verificationData?.verifiedAt,
        verifiedBy: companyData.verificationData?.verifiedBy,
        gstNumber: companyData.verificationData?.gstNumber,
        registrationNumber: companyData.verificationData?.registrationNumber,
        linkedInUrl: companyData.verificationData?.linkedInUrl,
      },
    });

    return this.mapPrismaToCompany(company);
  }

  /**
   * Find company by ID
   */
  static async findById(id: string): Promise<Company | null> {
    const company = await prisma.company.findUnique({
      where: { id },
    });

    return company ? this.mapPrismaToCompany(company) : null;
  }

  /**
   * Find company by domain
   */
  static async findByDomain(domain: string): Promise<Company | null> {
    const company = await prisma.company.findUnique({
      where: { domain: domain.toLowerCase() },
    });

    return company ? this.mapPrismaToCompany(company) : null;
  }

  /**
   * Update company verification status
   */
  static async updateVerificationStatus(
    id: string,
    status: CompanyVerificationStatus,
    method?: VerificationMethod
  ): Promise<Company> {
    const updateData: Prisma.CompanyUpdateInput = {
      verificationStatus: status,
    };

    if (method) {
      updateData.verificationMethod = method;
    }

    if (status === CompanyVerificationStatus.VERIFIED) {
      updateData.verifiedAt = new Date();
    }

    const company = await prisma.company.update({
      where: { id },
      data: updateData,
    });

    return this.mapPrismaToCompany(company);
  }

  /**
   * Update company verification data (for manual verification)
   */
  static async updateVerificationData(
    id: string,
    verificationData: {
      gstNumber?: string;
      registrationNumber?: string;
      linkedInUrl?: string;
      verifiedBy?: string;
    }
  ): Promise<Company> {
    const company = await prisma.company.update({
      where: { id },
      data: {
        gstNumber: verificationData.gstNumber,
        registrationNumber: verificationData.registrationNumber,
        linkedInUrl: verificationData.linkedInUrl,
        verifiedBy: verificationData.verifiedBy,
      },
    });

    return this.mapPrismaToCompany(company);
  }

  /**
   * Get all companies (admin use)
   */
  static async findAll(): Promise<Company[]> {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return companies.map((company) => this.mapPrismaToCompany(company));
  }

  /**
   * Delete company by ID
   */
  static async deleteById(id: string): Promise<void> {
    await prisma.company.delete({
      where: { id },
    });
  }

  /**
   * Check if company exists by domain
   */
  static async existsByDomain(domain: string): Promise<boolean> {
    const count = await prisma.company.count({
      where: { domain: domain.toLowerCase() },
    });

    return count > 0;
  }

  /**
   * Map Prisma company model to our Company interface
   */
  private static mapPrismaToCompany(prismaCompany: {
    id: string;
    name: string;
    website: string;
    domain: string;
    verificationStatus: CompanyVerificationStatus;
    verificationMethod: VerificationMethod | null;
    verifiedAt: Date | null;
    verifiedBy: string | null;
    gstNumber: string | null;
    registrationNumber: string | null;
    linkedInUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Company {
    return {
      id: prismaCompany.id,
      name: prismaCompany.name,
      website: prismaCompany.website,
      domain: prismaCompany.domain,
      verificationStatus: prismaCompany.verificationStatus,
      verificationMethod: prismaCompany.verificationMethod || undefined,
      verificationData: {
        verifiedAt: prismaCompany.verifiedAt || undefined,
        verifiedBy: prismaCompany.verifiedBy || undefined,
        gstNumber: prismaCompany.gstNumber || undefined,
        registrationNumber: prismaCompany.registrationNumber || undefined,
        linkedInUrl: prismaCompany.linkedInUrl || undefined,
      },
      createdAt: prismaCompany.createdAt,
      updatedAt: prismaCompany.updatedAt,
    };
  }
}
