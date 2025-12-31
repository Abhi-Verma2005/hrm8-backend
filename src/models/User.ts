/**
 * User Model
 * Represents a user (admin or employee) in the HRM8 system
 */

import { User, UserRole, UserStatus } from '../types';
import prisma from '../lib/prisma';

export class UserModel {
  /**
   * Create a new user
   */
  static async create(
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<User> {
    const user = await prisma.user.create({
      data: {
        email: userData.email.toLowerCase(),
        name: userData.name,
        password_hash: userData.passwordHash,
        company_id: userData.companyId,
        role: userData.role,
        status: userData.status,
        assigned_by: userData.assignedBy,
        last_login_at: userData.lastLoginAt,
      },
    });

    return this.mapPrismaToUser(user);
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    return user ? this.mapPrismaToUser(user as any) : null;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    return user ? this.mapPrismaToUser(user as any) : null;
  }

  /**
   * Find all users by company ID
   */
  static async findByCompanyId(companyId: string): Promise<User[]> {
    const users = await prisma.user.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });

    return users.map((user) => this.mapPrismaToUser(user as any));
  }

  /**
   * Find users by company ID and role
   */
  static async findByCompanyIdAndRole(
    companyId: string,
    role: UserRole
  ): Promise<User[]> {
    const users = await prisma.user.findMany({
      where: {
        company_id: companyId,
        role,
      },
      orderBy: { created_at: 'desc' },
    });

    return users.map((user) => this.mapPrismaToUser(user as any));
  }

  /**
   * Update user status
   */
  static async updateStatus(id: string, status: UserStatus): Promise<User> {
    const user = await prisma.user.update({
      where: { id },
      data: { status },
    });

    return this.mapPrismaToUser(user as any);
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(id: string): Promise<User> {
    const user = await prisma.user.update({
      where: { id },
      data: { last_login_at: new Date() },
    });

    return this.mapPrismaToUser(user as any);
  }

  /**
   * Update user password
   */
  static async updatePassword(id: string, passwordHash: string): Promise<User> {
    const user = await prisma.user.update({
      where: { id },
      data: { password_hash: passwordHash },
    });

    return this.mapPrismaToUser(user as any);
  }

  /**
   * Delete user by ID
   */
  static async deleteById(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Check if user exists by email
   */
  static async existsByEmail(email: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { email: email.toLowerCase() },
    });

    return count > 0;
  }

  /**
   * Check if email exists for a different user
   */
  static async emailExistsForDifferentUser(
    email: string,
    excludeUserId: string
  ): Promise<boolean> {
    const count = await prisma.user.count({
      where: {
        email: email.toLowerCase(),
        NOT: { id: excludeUserId },
      },
    });

    return count > 0;
  }

  /**
   * Update user role
   */
  static async updateRole(
    id: string,
    role: UserRole,
    assignedBy: string
  ): Promise<User> {
    const user = await prisma.user.update({
      where: { id },
      data: { role, assigned_by: assignedBy },
    });

    return this.mapPrismaToUser(user as any);
  }

  /**
   * Map Prisma user model to our User interface
   */
  private static mapPrismaToUser(prismaUser: {
    id: string;
    email: string;
    name: string;
    password_hash: string;
    company_id: string;
    role: UserRole;
    status: UserStatus;
    assigned_by: string | null;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      name: prismaUser.name,
      passwordHash: prismaUser.password_hash,
      companyId: prismaUser.company_id,
      role: prismaUser.role,
      status: prismaUser.status,
      assignedBy: prismaUser.assigned_by || undefined,
      lastLoginAt: prismaUser.last_login_at || undefined,
      createdAt: prismaUser.created_at,
      updatedAt: prismaUser.updated_at,
    };
  }
}
