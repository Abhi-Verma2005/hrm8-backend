/**
 * Company Profile Service
 * Handles onboarding profile lifecycle and validation
 */

import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import {
  CompanyProfile,
  CompanyProfileBillingData,
  CompanyProfileBrandingData,
  CompanyProfileData,
  CompanyProfileLocation,
  CompanyProfilePersonalInfo,
  CompanyProfileTeamMemberInvite,
  CompanyProfileSection,
  CompanyProfileSectionKey,
  CompanyProfileStatus,
  UpdateCompanyProfileRequest,
} from '../../types';
import { CompanyProfileModel } from '../../models/CompanyProfile';
import {
  COMPANY_PROFILE_SECTION_MAP,
  COMPANY_PROFILE_SECTIONS,
  OPTIONAL_PROFILE_SECTION_KEYS,
  REQUIRED_PROFILE_SECTION_KEYS,
} from '../../constants/companyProfile';

const REQUIRED_SECTION_ENUMS = COMPANY_PROFILE_SECTIONS.filter((section) => section.required).map(
  (section) => section.enumValue
);

type LocationPayload = {
  primary: Partial<CompanyProfileLocation>;
  additional?: Array<Partial<CompanyProfileLocation>>;
};

function ensureLocationId(location: Partial<CompanyProfileLocation>): CompanyProfileLocation {
  return {
    id: location.id || randomUUID(),
    name: location.name?.trim() || '',
    streetAddress: location.streetAddress?.trim() || '',
    city: location.city?.trim() || '',
    stateOrRegion: location.stateOrRegion?.trim() || '',
    postalCode: location.postalCode?.trim() || '',
    country: location.country?.trim() || '',
    isPrimary: location.isPrimary ?? false,
  };
}

export class CompanyProfileService {
  /**
   * Ensure profile exists for company
   */
  static async initializeProfile(companyId: string): Promise<CompanyProfile> {
    return CompanyProfileModel.getOrCreate(companyId);
  }

  /**
   * Fetch a company profile
   */
  static async getProfile(companyId: string): Promise<CompanyProfile> {
    return CompanyProfileModel.getOrCreate(companyId);
  }

  /**
   * Update a specific section of the profile
   */
  static async updateSection(
    companyId: string,
    payload: UpdateCompanyProfileRequest
  ): Promise<CompanyProfile> {
    const profile = await CompanyProfileModel.getOrCreate(companyId);
    const normalizedData = profile.profileData || {};
    const sectionEnum = COMPANY_PROFILE_SECTION_MAP[payload.section];
    if (!sectionEnum) {
      throw new Error(`Unknown section ${payload.section}`);
    }

    const updatedData = this.applySectionUpdate(
      normalizedData,
      payload.section,
      payload.data
    );

    const completedSections = this.calculateCompletedSections(
      profile.completedSections,
      payload.section,
      updatedData,
      payload.markComplete
    );

    const status = this.resolveStatus(completedSections);
    const completionPercentage =
      status === CompanyProfileStatus.COMPLETED
        ? 100
        : this.calculateCompletionPercentage(completedSections);

    return CompanyProfileModel.updateByCompanyId(companyId, {
      profileData: updatedData as Prisma.JsonObject,
      completedSections,
      status,
      completionPercentage,
    });
  }

  /**
   * Mark profile as complete if all sections satisfied
   */
  static async completeProfile(companyId: string): Promise<CompanyProfile> {
    const profile = await CompanyProfileModel.getOrCreate(companyId);
    const completedSections = new Set<CompanyProfileSection>(profile.completedSections);

    for (const section of COMPANY_PROFILE_SECTIONS) {
      const key = section.key;
      const hasData = this.sectionHasRequiredData(profile.profileData || {}, key);
      if (hasData) {
        completedSections.add(section.enumValue);
      } else if (section.required) {
        throw new Error(`Section ${section.label} is required before completion.`);
      }
    }

    const status = this.resolveStatus(Array.from(completedSections));
    const completionPercentage =
      status === CompanyProfileStatus.COMPLETED
        ? 100
        : this.calculateCompletionPercentage(Array.from(completedSections));

    return CompanyProfileModel.updateByCompanyId(profile.companyId, {
      completedSections: Array.from(completedSections),
      status,
      completionPercentage,
    });
  }

  /**
   * Provide progress data for API consumers
   */
  static async getProgress(companyId: string) {
    const profile = await CompanyProfileModel.getOrCreate(companyId);

    return {
      profile,
      requiredSections: REQUIRED_PROFILE_SECTION_KEYS,
      optionalSections: OPTIONAL_PROFILE_SECTION_KEYS,
    };
  }

  /**
   * Lightweight summary for auth flows
   */
  static async getProfileSummary(companyId: string) {
    const profile = await CompanyProfileModel.getOrCreate(companyId);

    return {
      status: profile.status,
      completionPercentage: profile.completionPercentage,
      completedSections: profile.completedSections,
      requiredSections: REQUIRED_PROFILE_SECTION_KEYS,
      optionalSections: OPTIONAL_PROFILE_SECTION_KEYS,
    };
  }

  private static applySectionUpdate(
    existingData: CompanyProfileData,
    section: CompanyProfileSectionKey,
    data: Record<string, unknown>
  ): CompanyProfileData {
    switch (section) {
      case 'basicDetails':
        return {
          ...existingData,
          basicDetails: this.validateBasicDetails({
            ...(existingData.basicDetails || {}),
            ...data,
          }),
        };
      case 'primaryLocation': {
        const normalized = this.validateLocationSection(data);
        return {
          ...existingData,
          primaryLocation: normalized.primary,
          additionalLocations: normalized.additional,
        };
      }
      case 'personalProfile':
        return {
          ...existingData,
          personalProfile: this.validatePersonalProfile({
            ...(existingData.personalProfile || {}),
            ...data,
          }),
        };
      case 'teamMembers':
        return {
          ...existingData,
          teamMembers: this.validateTeamMembers(data),
        };
      case 'billing':
        return {
          ...existingData,
          billing: this.validateBillingSection({
            ...(existingData.billing || {}),
            ...data,
          }),
        };
      case 'branding':
        return {
          ...existingData,
          branding: this.validateBrandingSection({
            ...(existingData.branding || {}),
            ...data,
          }),
        };
      default:
        return existingData;
    }
  }

  private static validateBasicDetails(
    data: Partial<CompanyProfileData['basicDetails']>
  ): CompanyProfileData['basicDetails'] {
    if (!data) {
      throw new Error('Basic details payload is required.');
    }

    if (!data.companyName || data.companyName.trim().length < 2) {
      throw new Error('Company name is required.');
    }

    if (!data.companySize) {
      throw new Error('Company size is required.');
    }

    if (!Array.isArray(data.industries) || data.industries.length === 0) {
      throw new Error('At least one industry is required.');
    }

    if (!data.phone || !data.phone.number || !data.phone.countryCode) {
      throw new Error('Company phone number (with country code) is required.');
    }

    if (data.industries.length > 3) {
      throw new Error('You can select up to 3 industries.');
    }

    return {
      companyName: data.companyName.trim(),
      companySize: data.companySize,
      industries: data.industries.map((industry) => industry.trim()),
      phone: data.phone,
      websiteUrl: data.websiteUrl?.trim(),
      yearFounded: data.yearFounded,
      overview: data.overview?.trim(),
      logoUrl: data.logoUrl,
      iconUrl: data.iconUrl,
    };
  }

  private static validateLocationSection(payload: Record<string, unknown>): {
    primary: CompanyProfileLocation;
    additional: CompanyProfileLocation[];
  } {
    const data = payload as LocationPayload;
    if (!data.primary) {
      throw new Error('Primary location is required.');
    }

    const primary = ensureLocationId({ ...data.primary, isPrimary: true });
    this.assertLocation(primary, true);

    const additional =
      data.additional?.map((loc) => {
        const next = ensureLocationId({ ...loc, isPrimary: false });
        this.assertLocation(next);
        return next;
      }) || [];

    return { primary, additional };
  }

  private static assertLocation(location: CompanyProfileLocation, isPrimary = false) {
    const missing: string[] = [];
    if (!location.name) missing.push('Location name');
    if (!location.streetAddress) missing.push('Street address');
    if (!location.city) missing.push('City');
    if (!location.stateOrRegion) missing.push('State/Region');
    if (!location.postalCode) missing.push('Zip/Postcode');
    if (!location.country) missing.push('Country');

    if (missing.length > 0) {
      throw new Error(
        `${isPrimary ? 'Primary location' : 'Location'} is missing fields: ${missing.join(', ')}`
      );
    }
  }

  private static validatePersonalProfile(
    data: Partial<CompanyProfilePersonalInfo>
  ): CompanyProfilePersonalInfo {
    if (data.phone && (!data.phone.number || !data.phone.countryCode)) {
      throw new Error('Personal profile phone must include country code and number.');
    }
    return {
      positionTitle: data.positionTitle?.trim(),
      phone: data.phone,
      location: data.location?.trim(),
    };
  }

  private static validateTeamMembers(
    data: Record<string, unknown>
  ): CompanyProfileData['teamMembers'] {
    const invites = Array.isArray((data as any).invites) ? (data as any).invites : [];
    const sanitizedInvites: CompanyProfileTeamMemberInvite[] = invites.map((invite: any) => {
      if (!invite.email) {
        throw new Error('Invite email is required.');
      }
      return {
        email: String(invite.email).toLowerCase().trim(),
        role: invite.role || 'member',
        authorizationLevel: invite.authorizationLevel,
        approvalLevel: invite.approvalLevel,
        status: invite.status || 'pending',
      };
    });

    const defaultAdminId =
      typeof (data as any).defaultAdminId === 'string'
        ? ((data as any).defaultAdminId as string)
        : undefined;

    return {
      invites: sanitizedInvites,
      defaultAdminId,
    };
  }

  private static validateBillingSection(
    data: Partial<CompanyProfileBillingData>
  ): CompanyProfileBillingData {
    if (data.paymentPreference && !['payg', 'subscription'].includes(data.paymentPreference)) {
      throw new Error('Payment preference must be PAYG or Subscription.');
    }

    if (data.accountsEmail && !data.accountsEmail.includes('@')) {
      throw new Error('Accounts email must be a valid email address.');
    }

    return {
      paymentPreference: data.paymentPreference,
      subscriptionPlan: data.subscriptionPlan,
      registeredBusinessName: data.registeredBusinessName?.trim(),
      taxId: data.taxId?.trim(),
      registeredCountry: data.registeredCountry?.trim(),
      isCharity: data.isCharity,
      supportingDocuments: data.supportingDocuments,
      paymentMethod: data.paymentMethod,
      billingAddress: data.billingAddress,
      accountsEmail: data.accountsEmail?.trim(),
    };
  }

  private static validateBrandingSection(
    data: Partial<CompanyProfileBrandingData>
  ): CompanyProfileBrandingData {
    if (data.subdomain && !/^[a-z0-9-]+$/i.test(data.subdomain)) {
      throw new Error('Subdomain can include only letters, numbers, and hyphens.');
    }

    return {
      careersPageEnabled: data.careersPageEnabled,
      subdomain: data.subdomain?.toLowerCase(),
      brandColor: data.brandColor,
      companyIntroduction: data.companyIntroduction?.trim(),
      logoUrl: data.logoUrl,
      iconUrl: data.iconUrl,
    };
  }

  private static sectionHasRequiredData(
    profileData: CompanyProfileData,
    section: CompanyProfileSectionKey
  ): boolean {
    switch (section) {
      case 'basicDetails':
        return Boolean(
          profileData.basicDetails &&
            profileData.basicDetails.companyName &&
            profileData.basicDetails.companySize &&
            profileData.basicDetails.industries?.length &&
            profileData.basicDetails.phone
        );
      case 'primaryLocation':
        return Boolean(
          profileData.primaryLocation &&
            profileData.primaryLocation.streetAddress &&
            profileData.primaryLocation.city &&
            profileData.primaryLocation.country
        );
      default:
        return Boolean((profileData as any)[section]);
    }
  }

  private static calculateCompletedSections(
    currentSections: CompanyProfileSection[],
    sectionKey: CompanyProfileSectionKey,
    profileData: CompanyProfileData,
    markComplete?: boolean
  ): CompanyProfileSection[] {
    const nextSections = new Set<CompanyProfileSection>(currentSections);
    const enumValue = COMPANY_PROFILE_SECTION_MAP[sectionKey];

    if (markComplete || this.sectionHasRequiredData(profileData, sectionKey)) {
      nextSections.add(enumValue);
    } else {
      nextSections.delete(enumValue);
    }

    return Array.from(nextSections);
  }

  private static resolveStatus(completedSections: CompanyProfileSection[]): CompanyProfileStatus {
    if (completedSections.length === 0) {
      return CompanyProfileStatus.NOT_STARTED;
    }

    const completedSet = new Set(completedSections);
    const hasAllRequired = REQUIRED_SECTION_ENUMS.every((section) => completedSet.has(section));

    return hasAllRequired ? CompanyProfileStatus.COMPLETED : CompanyProfileStatus.IN_PROGRESS;
  }

  private static calculateCompletionPercentage(sections: CompanyProfileSection[]): number {
    if (COMPANY_PROFILE_SECTIONS.length === 0) {
      return 0;
    }
    return Math.round((sections.length / COMPANY_PROFILE_SECTIONS.length) * 100);
  }
}

