/**
 * HRM8User Model
 * Represents HRM8 Global Admin and Regional Licensee users
 */

import prisma from '../lib/prisma';
import { HRM8User, HRM8UserRole, HRM8UserStatus } from '../types';

export class HRM8UserModel {
  /**
   * Create a new HRM8 user
   * Role defaults to REGIONAL_LICENSEE if not provided
   */
  static async create(userData: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string;
    photo?: string;
    role?: HRM8UserRole; // Optional - defaults to REGIONAL_LICENSEE
    status?: HRM8UserStatus;
    licenseeId?: string;
  }): Promise<HRM8User> {
    const user = await prisma.hRM8User.create({
      data: {
        email: userData.email.toLowerCase().trim(),
        passwordHash: userData.passwordHash,
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        phone: userData.phone?.trim(),
        photo: userData.photo,
        role: userData.role || HRM8UserRole.REGIONAL_LICENSEE,
        status: userData.status || HRM8UserStatus.ACTIVE,
        licensee_id: userData.licenseeId,
      },
    });

    return this.mapPrismaToUser(user);
  }

  /**
   * Find HRM8 user by ID
   */
  static async findById(id: string): Promise<HRM8User | null> {
    const user = await prisma.hRM8User.findUnique({
      where: { id },
    });

    return user ? this.mapPrismaToUser(user) : null;
  }

  /**
   * Find HRM8 user by email
   */
  static async findByEmail(email: string): Promise<HRM8User | null> {
    const user = await prisma.hRM8User.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    return user ? this.mapPrismaToUser(user) : null;
  }

  /**
   * Update HRM8 user
   */
  static async update(id: string, data: Partial<HRM8User>): Promise<HRM8User> {
    const user = await prisma.hRM8User.update({
      where: { id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.photo !== undefined && { photo: data.photo }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.licenseeId !== undefined && { licensee_id: data.licenseeId }),
      },
    });

    return this.mapPrismaToUser(user);
  }

  /**
   * Update password
   */
  static async updatePassword(id: string, passwordHash: string): Promise<void> {
    await prisma.hRM8User.update({
      where: { id },
      data: { passwordHash },
    });
  }

  /**
   * Update last login
   */
  static async updateLastLogin(id: string): Promise<void> {
    await prisma.hRM8User.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Update status
   */
  static async updateStatus(id: string, status: HRM8UserStatus): Promise<void> {
    await prisma.hRM8User.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Map Prisma user to HRM8UserData interface
   */
  private static mapPrismaToUser(prismaUser: {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    photo: string | null;
    role: HRM8UserRole;
    status: HRM8UserStatus;
    licensee_id: string | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): HRM8User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      passwordHash: prismaUser.passwordHash,
      firstName: prismaUser.firstName,
      lastName: prismaUser.lastName,
      phone: prismaUser.phone || undefined,
      photo: prismaUser.photo || undefined,
      role: prismaUser.role,
      status: prismaUser.status,
      licenseeId: prismaUser.licensee_id || undefined,
      lastLoginAt: prismaUser.lastLoginAt || undefined,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }
}

