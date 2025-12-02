/**
 * Consultant Model
 * Represents HRM8 consultants (Recruiters, Sales Agents, 360)
 */

import prisma from '../lib/prisma';
import { ConsultantRole, ConsultantStatus, AvailabilityStatus, Prisma } from '@prisma/client';

export interface ConsultantData {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  photo?: string;
  role: ConsultantRole;
  status: ConsultantStatus;
  regionId?: string;
  
  // Profile fields
  address?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  languages?: Array<{ language: string; proficiency: string }>;
  industryExpertise?: string[];
  resumeUrl?: string;
  
  // Payment details
  paymentMethod?: Record<string, unknown>;
  taxInformation?: Record<string, unknown>;
  
  // Capacity & Availability
  availability: AvailabilityStatus;
  maxEmployers: number;
  currentEmployers: number;
  maxJobs: number;
  currentJobs: number;
  
  // Commission
  commissionStructure?: string;
  defaultCommissionRate?: number;
  totalCommissionsPaid: number;
  pendingCommissions: number;
  
  // Performance metrics
  totalPlacements: number;
  totalRevenue: number;
  successRate: number;
  averageDaysToFill?: number;
  
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class ConsultantModel {
  /**
   * Create a new consultant
   */
  static async create(consultantData: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string;
    photo?: string;
    role: ConsultantRole;
    status?: ConsultantStatus;
    regionId?: string;
    address?: string;
    city?: string;
    stateProvince?: string;
    country?: string;
    languages?: Array<{ language: string; proficiency: string }>;
    industryExpertise?: string[];
    resumeUrl?: string;
    paymentMethod?: Record<string, unknown>;
    taxInformation?: Record<string, unknown>;
    availability?: AvailabilityStatus;
    maxEmployers?: number;
    currentEmployers?: number;
    maxJobs?: number;
    currentJobs?: number;
    commissionStructure?: string;
    defaultCommissionRate?: number;
  }): Promise<ConsultantData> {
    const createData: any = {
        email: consultantData.email.toLowerCase().trim(),
        passwordHash: consultantData.passwordHash,
        firstName: consultantData.firstName.trim(),
        lastName: consultantData.lastName.trim(),
        phone: consultantData.phone?.trim() || null,
        photo: consultantData.photo || null,
        role: consultantData.role,
        status: consultantData.status || ConsultantStatus.ACTIVE,
        address: consultantData.address?.trim() || null,
        city: consultantData.city?.trim() || null,
        stateProvince: consultantData.stateProvince?.trim() || null,
        country: consultantData.country?.trim() || null,
        languages: consultantData.languages ? JSON.parse(JSON.stringify(consultantData.languages)) : null,
        industryExpertise: consultantData.industryExpertise || [],
        resumeUrl: consultantData.resumeUrl || null,
        paymentMethod: consultantData.paymentMethod ? JSON.parse(JSON.stringify(consultantData.paymentMethod)) : null,
        taxInformation: consultantData.taxInformation ? JSON.parse(JSON.stringify(consultantData.taxInformation)) : null,
        availability: consultantData.availability || AvailabilityStatus.AVAILABLE,
        maxEmployers: consultantData.maxEmployers ?? 10,
        currentEmployers: consultantData.currentEmployers ?? 0,
        maxJobs: consultantData.maxJobs ?? 20,
        currentJobs: consultantData.currentJobs ?? 0,
        commissionStructure: consultantData.commissionStructure || null,
        defaultCommissionRate: consultantData.defaultCommissionRate || null,
    };

    if (consultantData.regionId) {
      createData.regionId = consultantData.regionId;
    }

    const consultant = await prisma.consultant.create({
      data: createData,
    });

    return this.mapPrismaToConsultant(consultant);
  }

  /**
   * Find consultant by ID
   */
  static async findById(id: string): Promise<ConsultantData | null> {
    const consultant = await prisma.consultant.findUnique({
      where: { id },
      include: {
        region: true,
      },
    });

    return consultant ? this.mapPrismaToConsultant(consultant) : null;
  }

  /**
   * Find consultant by email
   */
  static async findByEmail(email: string): Promise<ConsultantData | null> {
    const consultant = await prisma.consultant.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    return consultant ? this.mapPrismaToConsultant(consultant) : null;
  }

  /**
   * Find consultant by region ID
   */
  static async findByRegionId(regionId: string): Promise<ConsultantData | null> {
    const consultant = await prisma.consultant.findFirst({
      where: { regionId },
    });

    return consultant ? this.mapPrismaToConsultant(consultant) : null;
  }

  /**
   * Find all consultants
   */
  static async findAll(filters?: {
    regionId?: string;
    role?: ConsultantRole;
    status?: ConsultantStatus;
  }): Promise<ConsultantData[]> {
    const consultants = await prisma.consultant.findMany({
      where: {
        ...(filters?.regionId && { regionId: filters.regionId }),
        ...(filters?.role && { role: filters.role }),
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return consultants.map((consultant) => this.mapPrismaToConsultant(consultant));
  }

  /**
   * Update consultant
   */
  static async update(id: string, data: Partial<ConsultantData>): Promise<ConsultantData> {
    const updateData: Prisma.ConsultantUncheckedUpdateInput = {};
    
    if (data.firstName !== undefined) updateData.firstName = data.firstName.trim();
    if (data.lastName !== undefined) updateData.lastName = data.lastName.trim();
    if (data.phone !== undefined) updateData.phone = data.phone?.trim();
    if (data.photo !== undefined) updateData.photo = data.photo;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.regionId !== undefined) {
      if (data.regionId === null || data.regionId === '') {
        updateData.regionId = null as any;
      } else {
        updateData.regionId = data.regionId;
      }
    }
    if (data.address !== undefined) updateData.address = data.address?.trim() || null;
    if (data.city !== undefined) updateData.city = data.city?.trim() || null;
    if (data.stateProvince !== undefined) updateData.stateProvince = data.stateProvince?.trim() || null;
    if (data.country !== undefined) updateData.country = data.country?.trim() || null;
    if (data.languages !== undefined) updateData.languages = data.languages ? JSON.parse(JSON.stringify(data.languages)) : null;
    if (data.industryExpertise !== undefined) updateData.industryExpertise = data.industryExpertise;
    if (data.resumeUrl !== undefined) updateData.resumeUrl = data.resumeUrl || null;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod ? JSON.parse(JSON.stringify(data.paymentMethod)) : null;
    if (data.taxInformation !== undefined) updateData.taxInformation = data.taxInformation ? JSON.parse(JSON.stringify(data.taxInformation)) : null;
    if (data.availability !== undefined) updateData.availability = data.availability;
    if (data.maxEmployers !== undefined) updateData.maxEmployers = data.maxEmployers;
    if (data.currentEmployers !== undefined) updateData.currentEmployers = data.currentEmployers;
    if (data.maxJobs !== undefined) updateData.maxJobs = data.maxJobs;
    if (data.currentJobs !== undefined) updateData.currentJobs = data.currentJobs;
    if (data.commissionStructure !== undefined) updateData.commissionStructure = data.commissionStructure || null;
    if (data.defaultCommissionRate !== undefined) updateData.defaultCommissionRate = data.defaultCommissionRate || null;
    if (data.totalCommissionsPaid !== undefined) updateData.totalCommissionsPaid = data.totalCommissionsPaid;
    if (data.pendingCommissions !== undefined) updateData.pendingCommissions = data.pendingCommissions;
    if (data.totalPlacements !== undefined) updateData.totalPlacements = data.totalPlacements;
    if (data.totalRevenue !== undefined) updateData.totalRevenue = data.totalRevenue;
    if (data.successRate !== undefined) updateData.successRate = data.successRate;
    if (data.averageDaysToFill !== undefined) updateData.averageDaysToFill = data.averageDaysToFill || null;

    const consultant = await prisma.consultant.update({
      where: { id },
      data: updateData,
    });

    return this.mapPrismaToConsultant(consultant);
  }

  /**
   * Update password
   */
  static async updatePassword(id: string, passwordHash: string): Promise<void> {
    await prisma.consultant.update({
      where: { id },
      data: { passwordHash },
    });
  }

  /**
   * Update last login
   */
  static async updateLastLogin(id: string): Promise<void> {
    await prisma.consultant.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Update status
   */
  static async updateStatus(id: string, status: ConsultantStatus): Promise<void> {
    await prisma.consultant.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Assign consultant to region
   */
  static async assignToRegion(id: string, regionId: string): Promise<ConsultantData> {
    return await this.update(id, { regionId });
  }

  /**
   * Unassign consultant from region
   */
  static async unassignFromRegion(id: string): Promise<ConsultantData> {
    const updateData: Prisma.ConsultantUncheckedUpdateInput = {
      regionId: null as any,
    };
    
    const consultant = await prisma.consultant.update({
      where: { id },
      data: updateData,
    });

    return this.mapPrismaToConsultant(consultant);
  }

  /**
   * Map Prisma consultant to ConsultantData interface
   */
  private static mapPrismaToConsultant(prismaConsultant: any): ConsultantData {
    return {
      id: prismaConsultant.id,
      email: prismaConsultant.email,
      passwordHash: prismaConsultant.passwordHash,
      firstName: prismaConsultant.firstName,
      lastName: prismaConsultant.lastName,
      phone: prismaConsultant.phone || undefined,
      photo: prismaConsultant.photo || undefined,
      role: prismaConsultant.role,
      status: prismaConsultant.status,
      regionId: prismaConsultant.regionId || undefined,
      address: prismaConsultant.address || undefined,
      city: prismaConsultant.city || undefined,
      stateProvince: prismaConsultant.stateProvince || undefined,
      country: prismaConsultant.country || undefined,
      languages: prismaConsultant.languages as Array<{ language: string; proficiency: string }> | undefined,
      industryExpertise: prismaConsultant.industryExpertise,
      resumeUrl: prismaConsultant.resumeUrl || undefined,
      paymentMethod: prismaConsultant.paymentMethod as Record<string, unknown> | undefined,
      taxInformation: prismaConsultant.taxInformation as Record<string, unknown> | undefined,
      availability: prismaConsultant.availability,
      maxEmployers: prismaConsultant.maxEmployers,
      currentEmployers: prismaConsultant.currentEmployers,
      maxJobs: prismaConsultant.maxJobs,
      currentJobs: prismaConsultant.currentJobs,
      commissionStructure: prismaConsultant.commissionStructure || undefined,
      defaultCommissionRate: prismaConsultant.defaultCommissionRate || undefined,
      totalCommissionsPaid: prismaConsultant.totalCommissionsPaid,
      pendingCommissions: prismaConsultant.pendingCommissions,
      totalPlacements: prismaConsultant.totalPlacements,
      totalRevenue: prismaConsultant.totalRevenue,
      successRate: prismaConsultant.successRate,
      averageDaysToFill: prismaConsultant.averageDaysToFill || undefined,
      lastLoginAt: prismaConsultant.lastLoginAt || undefined,
      createdAt: prismaConsultant.createdAt,
      updatedAt: prismaConsultant.updatedAt,
    };
  }
}
