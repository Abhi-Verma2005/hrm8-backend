/**
 * Role Service
 * Handles role assignment and role-based permission checks
 */

import { UserRole } from '../../types';
import { UserModel } from '../../models/User';

export class RoleService {
  /**
   * Check if a user can assign a specific role
   * SUPER_ADMIN can assign ADMIN, USER, VISITOR
   * ADMIN can assign USER, VISITOR
   */
  static canUserAssignRole(
    assignerRole: UserRole,
    targetRole: UserRole
  ): boolean {
    // SUPER_ADMIN can assign ADMIN, USER, VISITOR (but not another SUPER_ADMIN)
    if (assignerRole === UserRole.SUPER_ADMIN) {
      return (
        targetRole === UserRole.ADMIN ||
        targetRole === UserRole.USER ||
        targetRole === UserRole.VISITOR
      );
    }

    // ADMIN can assign USER, VISITOR
    if (assignerRole === UserRole.ADMIN) {
      return targetRole === UserRole.USER || targetRole === UserRole.VISITOR;
    }

    // USER and VISITOR cannot assign roles
    return false;
  }

  /**
   * Assign role to a user
   * Validates role assignment rules before assigning
   */
  static async assignRole(
    userId: string,
    newRole: UserRole,
    assignedBy: string
  ): Promise<void> {
    // Get the assigner's role
    const assigner = await UserModel.findById(assignedBy);
    if (!assigner) {
      throw new Error('Assigner not found');
    }

    // Check if assigner can assign this role
    if (!this.canUserAssignRole(assigner.role, newRole)) {
      throw new Error(
        `You do not have permission to assign the role ${newRole}`
      );
    }

    // Prevent self-assignment
    if (userId === assignedBy) {
      throw new Error('You cannot assign a role to yourself');
    }

    // Get target user
    const targetUser = await UserModel.findById(userId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    // Prevent demoting the last SUPER_ADMIN
    if (
      targetUser.role === UserRole.SUPER_ADMIN &&
      newRole !== UserRole.SUPER_ADMIN
    ) {
      const superAdmins = await UserModel.findByCompanyIdAndRole(
        targetUser.companyId,
        UserRole.SUPER_ADMIN
      );
      if (superAdmins.length === 1) {
        throw new Error(
          'Cannot demote the last super administrator. Please assign another super administrator first.'
        );
      }
    }

    // Assign the role
    await UserModel.updateRole(userId, newRole, assignedBy);
  }

  /**
   * Get role hierarchy level (higher number = more permissions)
   */
  static getRoleLevel(role: UserRole): number {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 4;
      case UserRole.ADMIN:
        return 3;
      case UserRole.USER:
        return 2;
      case UserRole.VISITOR:
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Check if role1 has higher or equal permissions than role2
   */
  static hasHigherOrEqualPermissions(
    role1: UserRole,
    role2: UserRole
  ): boolean {
    return this.getRoleLevel(role1) >= this.getRoleLevel(role2);
  }
}

