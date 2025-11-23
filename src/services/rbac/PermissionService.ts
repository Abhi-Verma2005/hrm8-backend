/**
 * Permission Service
 * Handles permission checks based on user roles
 */

import { UserRole } from '../../types';

export class PermissionService {
  /**
   * Check if a role can post jobs
   * SUPER_ADMIN and ADMIN can post jobs
   */
  static canPostJobs(role: UserRole): boolean {
    return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
  }

  /**
   * Check if a role can manage users (assign roles)
   * SUPER_ADMIN and ADMIN can manage users
   */
  static canManageUsers(role: UserRole): boolean {
    return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
  }

  /**
   * Check if a role can manage company settings
   * Only SUPER_ADMIN can manage company settings
   */
  static canManageCompanySettings(role: UserRole): boolean {
    return role === UserRole.SUPER_ADMIN;
  }

  /**
   * Check if a role can view all company data
   * SUPER_ADMIN, ADMIN, and USER can view data
   * VISITOR has limited read access
   */
  static canViewCompanyData(role: UserRole): boolean {
    return (
      role === UserRole.SUPER_ADMIN ||
      role === UserRole.ADMIN ||
      role === UserRole.USER
    );
  }

  /**
   * Check if a role can edit company data
   * SUPER_ADMIN, ADMIN, and USER can edit data
   */
  static canEditCompanyData(role: UserRole): boolean {
    return (
      role === UserRole.SUPER_ADMIN ||
      role === UserRole.ADMIN ||
      role === UserRole.USER
    );
  }
}




