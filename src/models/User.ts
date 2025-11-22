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
        passwordHash: userData.passwordHash,
        companyId: userData.companyId,
        role: userData.role,
        status: userData.status,
        assignedBy: userData.assignedBy,
        lastLoginAt: userData.lastLoginAt,
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

    return user ? this.mapPrismaToUser(user) : null;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    return user ? this.mapPrismaToUser(user) : null;
  }

  /**
   * Find all users by company ID
   */
  static async findByCompanyId(companyId: string): Promise<User[]> {
    const users = await prisma.user.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.mapPrismaToUser(user));
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
        companyId,
        role,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.mapPrismaToUser(user));
  }

  /**
   * Update user status
   */
  static async updateStatus(id: string, status: UserStatus): Promise<User> {
    const user = await prisma.user.update({
      where: { id },
      data: { status },
    });

    return this.mapPrismaToUser(user);
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(id: string): Promise<User> {
    const user = await prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });

    return this.mapPrismaToUser(user);
  }

  /**
   * Update user password
   */
  static async updatePassword(id: string, passwordHash: string): Promise<User> {
    const user = await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return this.mapPrismaToUser(user);
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
      data: { role, assignedBy },
    });

    return this.mapPrismaToUser(user);
  }

  /**
   * Map Prisma user model to our User interface
   */
  private static mapPrismaToUser(prismaUser: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    companyId: string;
    role: UserRole;
    status: UserStatus;
    assignedBy: string | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      name: prismaUser.name,
      passwordHash: prismaUser.passwordHash,
      companyId: prismaUser.companyId,
      role: prismaUser.role,
      status: prismaUser.status,
      assignedBy: prismaUser.assignedBy || undefined,
      lastLoginAt: prismaUser.lastLoginAt || undefined,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }
}
