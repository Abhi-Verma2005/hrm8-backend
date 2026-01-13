/**
 * Consultant Model
 * Represents HRM8 consultants (Recruiters, Sales Agents, 360)
 */

import prisma from '../lib/prisma';
import { ConsultantRole, ConsultantStatus, AvailabilityStatus } from '@prisma/client';

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
  currentLeads: number;
  maxLeads: number;

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
    regionId: string; // Required - consultants must belong to a region
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
    currentLeads?: number;
    maxLeads?: number;
    commissionStructure?: string;
    defaultCommissionRate?: number;
  }): Promise<ConsultantData> {
    const createData: any = {
      email: consultantData.email.toLowerCase().trim(),
      password_hash: consultantData.passwordHash,
      first_name: consultantData.firstName.trim(),
      last_name: consultantData.lastName.trim(),
      phone: consultantData.phone?.trim() || null,
      photo: consultantData.photo || null,
      role: consultantData.role,
      status: consultantData.status || ConsultantStatus.ACTIVE,
      address: consultantData.address?.trim() || null,
      city: consultantData.city?.trim() || null,
      state_province: consultantData.stateProvince?.trim() || null,
      country: consultantData.country?.trim() || null,
      languages: consultantData.languages ? JSON.parse(JSON.stringify(consultantData.languages)) : null,
      industry_expertise: consultantData.industryExpertise || [],
      resume_url: consultantData.resumeUrl || null,
      payment_method: consultantData.paymentMethod ? JSON.parse(JSON.stringify(consultantData.paymentMethod)) : null,
      tax_information: consultantData.taxInformation ? JSON.parse(JSON.stringify(consultantData.taxInformation)) : null,
      availability: consultantData.availability || AvailabilityStatus.AVAILABLE,
      max_employers: consultantData.maxEmployers ?? 10,
      current_employers: consultantData.currentEmployers ?? 0,
      max_jobs: consultantData.maxJobs ?? 20,
      current_jobs: consultantData.currentJobs ?? 0,
      current_leads: consultantData.currentLeads ?? 0,
      max_leads: consultantData.maxLeads ?? 20,
      commission_structure: consultantData.commissionStructure || null,
      default_commission_rate: consultantData.defaultCommissionRate || null,
      region_id: consultantData.regionId, // Required field
    };

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
      where: { region_id: regionId },
    });

    return consultant ? this.mapPrismaToConsultant(consultant) : null;
  }

  /**
   * Find all consultants
   */
  static async findAll(filters?: {
    regionId?: string;
    regionIds?: string[];
    role?: ConsultantRole;
    status?: ConsultantStatus;
  }): Promise<ConsultantData[]> {
    const consultants = await prisma.consultant.findMany({
      where: {
        ...(filters?.regionId && { region_id: filters.regionId }),
        ...(filters?.regionIds && { region_id: { in: filters.regionIds } }),
        ...(filters?.role && { role: filters.role }),
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { created_at: 'desc' },
    });

    return consultants.map((consultant) => this.mapPrismaToConsultant(consultant));
  }

  /**
   * Update consultant
   */
  static async update(id: string, data: Partial<ConsultantData>): Promise<ConsultantData> {
    const updateData: any = {};

    if (data.firstName !== undefined) updateData.first_name = data.firstName.trim();
    if (data.lastName !== undefined) updateData.last_name = data.lastName.trim();
    if (data.phone !== undefined) updateData.phone = data.phone?.trim();
    if (data.photo !== undefined) updateData.photo = data.photo;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.regionId !== undefined) {

      if (!data.regionId || data.regionId === '') {
        throw new Error('Consultants must always be assigned to a region. regionId cannot be empty or null.');
      }
      updateData.region_id = data.regionId;
    }
    if (data.address !== undefined) updateData.address = data.address?.trim() || null;
    if (data.city !== undefined) updateData.city = data.city?.trim() || null;
    if (data.stateProvince !== undefined) updateData.state_province = data.stateProvince?.trim() || null;
    if (data.country !== undefined) updateData.country = data.country?.trim() || null;
    if (data.languages !== undefined) updateData.languages = data.languages ? JSON.parse(JSON.stringify(data.languages)) : null;
    if (data.industryExpertise !== undefined) updateData.industry_expertise = data.industryExpertise;
    if (data.resumeUrl !== undefined) updateData.resume_url = data.resumeUrl || null;
    if (data.paymentMethod !== undefined) updateData.payment_method = data.paymentMethod ? JSON.parse(JSON.stringify(data.paymentMethod)) : null;
    if (data.taxInformation !== undefined) updateData.tax_information = data.taxInformation ? JSON.parse(JSON.stringify(data.taxInformation)) : null;
    if (data.availability !== undefined) updateData.availability = data.availability;
    if (data.maxEmployers !== undefined) updateData.max_employers = data.maxEmployers;
    if (data.currentEmployers !== undefined) updateData.current_employers = data.currentEmployers;
    if (data.maxJobs !== undefined) updateData.max_jobs = data.maxJobs;
    if (data.currentJobs !== undefined) updateData.current_jobs = data.currentJobs;
    if (data.commissionStructure !== undefined) updateData.commission_structure = data.commissionStructure || null;
    if (data.defaultCommissionRate !== undefined) updateData.default_commission_rate = data.defaultCommissionRate || null;
    if (data.totalCommissionsPaid !== undefined) updateData.total_commissions_paid = data.totalCommissionsPaid;
    if (data.pendingCommissions !== undefined) updateData.pending_commissions = data.pendingCommissions;
    if (data.totalPlacements !== undefined) updateData.total_placements = data.totalPlacements;
    if (data.totalRevenue !== undefined) updateData.total_revenue = data.totalRevenue;
    if (data.successRate !== undefined) updateData.success_rate = data.successRate;
    if (data.averageDaysToFill !== undefined) updateData.average_days_to_fill = data.averageDaysToFill || null;
    if (data.currentLeads !== undefined) updateData.current_leads = data.currentLeads;
    if (data.maxLeads !== undefined) updateData.max_leads = data.maxLeads;

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
      data: { password_hash: passwordHash },
    });
  }

  /**
   * Update last login
   */
  static async updateLastLogin(id: string): Promise<void> {
    await prisma.consultant.update({
      where: { id },
      data: { last_login_at: new Date() },
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
   * Unassign consultant from region - This is actually not allowed by schema (region_id is mandatory)
   * Instead, we should reassign to a default or global region if needed, 
   * but for now we'll throw an error or mark it as requiring a new region.
   */
  static async unassignFromRegion(_id: string): Promise<ConsultantData> {
    throw new Error('Consultants must always be assigned to a region. Use assignToRegion instead.');
  }

  /**
   * Map Prisma consultant to ConsultantData interface
   */
  private static mapPrismaToConsultant(prismaConsultant: any): ConsultantData {
    return {
      id: prismaConsultant.id,
      email: prismaConsultant.email,
      passwordHash: prismaConsultant.password_hash,
      firstName: prismaConsultant.first_name,
      lastName: prismaConsultant.last_name,
      phone: prismaConsultant.phone || undefined,
      photo: prismaConsultant.photo || undefined,
      role: prismaConsultant.role,
      status: prismaConsultant.status,
      regionId: prismaConsultant.region_id || undefined,
      address: prismaConsultant.address || undefined,
      city: prismaConsultant.city || undefined,
      stateProvince: prismaConsultant.state_province || undefined,
      country: prismaConsultant.country || undefined,
      languages: prismaConsultant.languages as Array<{ language: string; proficiency: string }> | undefined,
      industryExpertise: prismaConsultant.industry_expertise,
      resumeUrl: prismaConsultant.resume_url || undefined,
      paymentMethod: prismaConsultant.payment_method as Record<string, unknown> | undefined,
      taxInformation: prismaConsultant.tax_information as Record<string, unknown> | undefined,
      availability: prismaConsultant.availability,
      maxEmployers: prismaConsultant.max_employers,
      currentEmployers: prismaConsultant.current_employers,
      maxJobs: prismaConsultant.max_jobs,
      currentJobs: prismaConsultant.current_jobs,
      commissionStructure: prismaConsultant.commission_structure || undefined,
      defaultCommissionRate: prismaConsultant.default_commission_rate || undefined,
      totalCommissionsPaid: prismaConsultant.total_commissions_paid,
      pendingCommissions: prismaConsultant.pending_commissions,
      totalPlacements: prismaConsultant.total_placements,
      totalRevenue: prismaConsultant.total_revenue,
      successRate: prismaConsultant.success_rate,
      averageDaysToFill: prismaConsultant.average_days_to_fill || undefined,
      currentLeads: prismaConsultant.current_leads || 0,
      maxLeads: prismaConsultant.max_leads || 20,
      lastLoginAt: prismaConsultant.last_login_at || undefined,
      createdAt: prismaConsultant.created_at,
      updatedAt: prismaConsultant.updated_at,
    };
  }
}
