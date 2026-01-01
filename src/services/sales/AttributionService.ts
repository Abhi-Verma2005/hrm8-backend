/**
 * Attribution Service
 * Handles sales agent attribution and locking logic for companies and leads
 */

import prisma from '../../lib/prisma';
import { CompanyModel } from '../../models/Company';
import { differenceInMonths } from 'date-fns';

export class AttributionService {
  /**
   * Assign a sales agent to a company
   * Only works if attribution is not locked
   */
  static async assignAgentToCompany(
    companyId: string,
    agentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const company = await CompanyModel.findById(companyId);
      if (!company) {
        return { success: false, error: 'Company not found' };
      }

      // Check if attribution is locked and valid
      if (this.isAttributionLocked(company)) {
        return { 
          success: false, 
          error: `Attribution is locked to agent ${company.referredBy} until ${this.getLockExpiryDate(company)}` 
        };
      }

      // Update company attribution
      await prisma.company.update({
        where: { id: companyId },
        data: {
          referred_by: agentId,
          // If simply assigned, we don't lock yet. Locking happens on payment.
        },
      });

      return { success: true };
    } catch (error: any) {
      console.error('Assign agent error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lock attribution for a company (e.g., after payment)
   * Locks for 12 months from now
   */
  static async lockAttribution(companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const company = await CompanyModel.findById(companyId);
      if (!company) {
        return { success: false, error: 'Company not found' };
      }

      if (!company.referredBy) {
        return { success: false, error: 'Cannot lock attribution: No agent assigned' };
      }

      await prisma.company.update({
        where: { id: companyId },
        data: {
          attribution_locked: true,
          attribution_locked_at: new Date(),
        },
      });

      return { success: true };
    } catch (error: any) {
      console.error('Lock attribution error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if attribution is currently locked
   * Locked if flag is true AND duration < 12 months
   */
  static isAttributionLocked(company: any): boolean {
    if (!company.attributionLocked || !company.attributionLockedAt) {
      return false;
    }

    const monthsSinceLock = differenceInMonths(new Date(), new Date(company.attributionLockedAt));
    return monthsSinceLock < 12;
  }

  /**
   * Get the date when the lock expires
   */
  static getLockExpiryDate(company: any): Date | null {
    if (!company.attributionLockedAt) return null;
    
    const lockDate = new Date(company.attributionLockedAt);
    lockDate.setFullYear(lockDate.getFullYear() + 1); // Add 1 year
    return lockDate;
  }

  /**
   * Check if a specific agent has valid attribution
   */
  static async hasValidAttribution(companyId: string, agentId: string): Promise<boolean> {
    const company = await CompanyModel.findById(companyId);
    if (!company) return false;

    // If locked to someone else
    if (this.isAttributionLocked(company) && company.referredBy !== agentId) {
      return false;
    }

    // If assigned to this agent (whether locked or not)
    if (company.referredBy === agentId) {
      return true;
    }

    return false;
  }
}
