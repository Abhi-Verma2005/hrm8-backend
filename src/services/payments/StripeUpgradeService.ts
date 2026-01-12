import { Prisma } from '@prisma/client';
import { CompanyProfileModel } from '../../models/CompanyProfile';
import type { SubscriptionTier } from '../hrm8/PackageService';

export const UPGRADE_PRICE_MAP = {
  shortlisting: { amount: 1990, currency: 'usd', label: 'Shortlisting' },
  full_service: { amount: 5990, currency: 'usd', label: 'Full Service' },
  executive_search: { amount: 9990, currency: 'usd', label: 'Executive Search' },
} as const;

export type UpgradeTier = keyof typeof UPGRADE_PRICE_MAP;

type RecordUpgradeInput = {
  companyId: string;
  tier: UpgradeTier;
  amount?: number | null;
  currency?: string | null;
  stripeSessionId?: string;
};

export class StripeUpgradeService {
  static isValidTier(tier: string | undefined | null): tier is UpgradeTier {
    return Boolean(tier && Object.prototype.hasOwnProperty.call(UPGRADE_PRICE_MAP, tier));
  }

  static getPrice(tier: UpgradeTier) {
    return UPGRADE_PRICE_MAP[tier];
  }

  static async recordSuccessfulUpgrade({
    companyId,
    tier,
    amount,
    currency,
    stripeSessionId,
  }: RecordUpgradeInput) {
    const profile = await CompanyProfileModel.getOrCreate(companyId);
    const profileData = profile.profileData || {};

    const billing = {
      ...(profileData.billing || {}),
      subscriptionTier: tier as SubscriptionTier,
      subscriptionStatus: 'active',
      subscriptionStartDate: new Date().toISOString(),
      lastPaymentAmount: amount ?? UPGRADE_PRICE_MAP[tier].amount,
      lastPaymentCurrency: (currency || UPGRADE_PRICE_MAP[tier].currency).toLowerCase(),
      lastStripeSessionId: stripeSessionId,
    };

    const updatedProfileData = {
      ...profileData,
      billing,
    };

    await CompanyProfileModel.updateByCompanyId(companyId, {
      profile_data: updatedProfileData as unknown as Prisma.JsonObject,
    });

    // Create sales commission and lock attribution
    try {
      const { CommissionService } = await import('../hrm8/CommissionService');
      await CommissionService.processSalesCommission(
        companyId,
        amount ?? UPGRADE_PRICE_MAP[tier].amount,
        `Sales commission for ${UPGRADE_PRICE_MAP[tier].label} subscription`
      );
    } catch (commissionError) {
      console.error('Error creating sales commission for upgrade:', commissionError);
    }
  }
}











