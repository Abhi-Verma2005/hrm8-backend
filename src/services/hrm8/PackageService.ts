/**
 * Package Service
 * Handles company subscription package checking and validation
 */

import prisma from '../../lib/prisma';

export type SubscriptionTier =
  | 'ats-lite'
  | 'payg'
  | 'small'
  | 'medium'
  | 'large'
  | 'enterprise'
  | 'shortlisting'
  | 'full_service'
  | 'executive_search';

export class PackageService {
  /**
   * Check if a company has a paid subscription package
   * Free packages: 'ats-lite'
   * Paid packages: 'payg', 'small', 'medium', 'large', 'enterprise'
   */
  static async hasPaidPackage(companyId: string): Promise<boolean> {
    try {
      const subscriptionTier = await this.getSubscriptionTier(companyId);
      
      // Free package
      if (subscriptionTier === 'ats-lite') {
        return false;
      }
      
      // All other tiers are considered paid
      return true;
    } catch (error) {
      console.error('Error checking paid package:', error);
      // Default to free if error
      return false;
    }
  }

  /**
   * Get subscription tier for a company
   * Checks CompanyProfile.profileData first, then defaults to 'ats-lite'
   */
  static async getSubscriptionTier(companyId: string): Promise<SubscriptionTier> {
    try {
      // Check CompanyProfile for subscription tier
      const profile = await prisma.companyProfile.findUnique({
        where: { company_id: companyId },
        select: { profile_data: true },
      });

      if (profile?.profile_data) {
        const profileData = profile.profile_data as any;
        
        // Check if subscriptionTier is in billing section
        if (profileData.billing?.subscriptionTier) {
          return profileData.billing.subscriptionTier as SubscriptionTier;
        }
        
        // Check if subscriptionTier is at root level
        if (profileData.subscriptionTier) {
          return profileData.subscriptionTier as SubscriptionTier;
        }
      }

      // Default to free tier
      return 'ats-lite';
    } catch (error) {
      console.error('Error getting subscription tier:', error);
      return 'ats-lite';
    }
  }

  /**
   * Check if company can offload jobs to consultants
   * Only paid packages can offload to consultants
   */
  static async canOffloadToConsultants(companyId: string): Promise<boolean> {
    return this.hasPaidPackage(companyId);
  }

  /**
   * Validate that a company can assign jobs to consultants
   * Throws error if company has free package
   */
  static async validateConsultantAssignment(companyId: string): Promise<void> {
    const canOffload = await this.canOffloadToConsultants(companyId);
    
    if (!canOffload) {
      throw new Error(
        'Companies with free packages (ATS Lite) cannot assign jobs to consultants. ' +
        'Please upgrade to a paid subscription to use consultant services.'
      );
    }
  }
}
