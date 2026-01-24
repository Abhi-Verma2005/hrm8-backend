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

    // amount is in cents if provided (from Stripe), UPGRADE_PRICE_MAP is in dollars
    const paymentAmountInDollars = amount ? amount / 100 : UPGRADE_PRICE_MAP[tier].amount;

    const billing = {
      ...(profileData.billing || {}),
      subscriptionTier: tier as SubscriptionTier,
      subscriptionStatus: 'active',
      subscriptionStartDate: new Date().toISOString(),
      lastPaymentAmount: paymentAmountInDollars,
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
        paymentAmountInDollars,
        `Sales commission for ${UPGRADE_PRICE_MAP[tier].label} subscription`
      );
    } catch (commissionError) {
      console.error('Error creating sales commission for upgrade:', commissionError);
    }

    // Send Admin Email Notification
    try {
      const { emailService } = await import('../email/EmailService');
      const { prisma } = await import('../../lib/prisma');

      // Find company admin
      const admin = await prisma.user.findFirst({
        where: {
          company_id: companyId,
          role: 'ADMIN'
        }
      });

      if (admin) {
        await emailService.sendNotificationEmail(
          admin.email,
          `Subscription Upgrade Successful: ${UPGRADE_PRICE_MAP[tier].label}`,
          `Your subscription has been successfully upgraded to ${UPGRADE_PRICE_MAP[tier].label}. Thank you for your business!`,
          // actionUrl could go here if we had a billing page route to point to
        );
      }
    } catch (emailError) {
      console.error('Failed to send subscription email:', emailError);
    }

    // Send In-App Notification
    try {
      const { UniversalNotificationService } = await import('../notification/UniversalNotificationService');
      const { NotificationRecipientType } = await import('@prisma/client');
      const { prisma } = await import('../../lib/prisma');

      // Notify all company admins
      // RECRUITER is not a valid UserRole (it's likely an application-level permission concept or future role), 
      // so limiting to ADMIN for now to avoid Prisma validation errors.
      const admins = await prisma.user.findMany({
        where: {
          company_id: companyId,
          role: 'ADMIN'
        }
      });

      for (const admin of admins) {
        await UniversalNotificationService.createNotification({
          recipientType: NotificationRecipientType.USER,
          recipientId: admin.id,
          type: 'SUBSCRIPTION_PURCHASED' as any,
          title: 'Subscription Upgraded',
          message: `Your company subscription has been upgraded to ${UPGRADE_PRICE_MAP[tier].label}.`,
          companyId,
          // actionUrl: '/settings/billing' // Assuming a billing page exists
        });
      }
    } catch (notifyError) {
      console.error('Failed to send subscription in-app notification:', notifyError);
    }

    // --- SUPER ADMIN NOTIFICATIONS ---
    try {
      const { emailService } = await import('../email/EmailService');
      const { UniversalNotificationService } = await import('../notification/UniversalNotificationService');
      const { NotificationRecipientType } = await import('@prisma/client');
      const { prisma } = await import('../../lib/prisma');

      // Find all SUPER_ADMINS (System wide)
      const superAdmins = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' }
      });

      const companyName = profileData.basicDetails?.companyName || 'A company';

      for (const superAdmin of superAdmins) {
        // Send Email to Super Admin
        try {
          await emailService.sendNotificationEmail(
            superAdmin.email,
            `New Substitution Upgrade: ${UPGRADE_PRICE_MAP[tier].label}`,
            `Company "${companyName}" (ID: ${companyId}) has upgraded their subscription to ${UPGRADE_PRICE_MAP[tier].label}. Payment: $${paymentAmountInDollars} (${(currency || 'usd').toUpperCase()}).`,
            // actionUrl: `/admin/companies/${companyId}` // Future: Admin dashboard link
          );
        } catch (emailErr) {
          console.error(`Failed to email super admin ${superAdmin.email}:`, emailErr);
        }

        // Send In-App Notification to Super Admin
        try {
          await UniversalNotificationService.createNotification({
            recipientType: NotificationRecipientType.USER,
            recipientId: superAdmin.id,
            type: 'SYSTEM_ANNOUNCEMENT' as any, // Using generic type as specific one might not be handled for super admins
            title: 'Revenue Alert: New Upgrade',
            message: `${companyName} upgraded to ${UPGRADE_PRICE_MAP[tier].label}.`,
            companyId,
            data: {
              event: 'subscription_upgrade',
              companyId,
              amount: paymentAmountInDollars,
              tier
            }
          });
        } catch (notifyErr) {
          console.error(`Failed to notify super admin ${superAdmin.id}:`, notifyErr);
        }
      }

    } catch (superAdminError) {
      console.error('Error processing super admin notifications:', superAdminError);
    }
  }
}











