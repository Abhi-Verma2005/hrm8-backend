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
        password_hash: userData.passwordHash,
        first_name: userData.firstName.trim(),
        last_name: userData.lastName.trim(),
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
    const existing = await this.findById(id);

    const user = await prisma.hRM8User.update({
      where: { id },
      data: {
        ...(data.firstName !== undefined && { first_name: data.firstName }),
        ...(data.lastName !== undefined && { last_name: data.lastName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.photo !== undefined && { photo: data.photo }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.licenseeId !== undefined && { licensee_id: data.licenseeId }),
      },
    });

    const mappedUser = this.mapPrismaToUser(user);

    // If role changed, send email
    if (existing && data.role && existing.role !== data.role) {
      try {
        const { emailService } = await import('../services/email/EmailService');
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
        await emailService.sendRoleChangeEmail({
          to: mappedUser.email,
          name: `${mappedUser.firstName} ${mappedUser.lastName}`,
          oldRole: existing.role,
          newRole: mappedUser.role,
          loginUrl: `${baseUrl}/hrm8/login`
        });
      } catch (error) {
        console.error('Failed to send role change email for HRM8 user:', error);
      }
    }

    return mappedUser;
  }

  /**
   * Update password
   */
  static async updatePassword(id: string, passwordHash: string): Promise<void> {
    await prisma.hRM8User.update({
      where: { id },
      data: { password_hash: passwordHash },
    });
  }

  /**
   * Update last login
   */
  static async updateLastLogin(id: string): Promise<void> {
    await prisma.hRM8User.update({
      where: { id },
      data: { last_login_at: new Date() },
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
   * Map Prisma user to HRM8User domain type
   */
  private static mapPrismaToUser(prismaUser: any): HRM8User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      passwordHash: prismaUser.password_hash,
      firstName: prismaUser.first_name,
      lastName: prismaUser.last_name,
      phone: prismaUser.phone || undefined,
      photo: prismaUser.photo || undefined,
      role: prismaUser.role,
      status: prismaUser.status,
      licenseeId: prismaUser.licensee_id || undefined,
      lastLoginAt: prismaUser.last_login_at || undefined,
      createdAt: prismaUser.created_at,
      updatedAt: prismaUser.updated_at,
    };
  }
}

