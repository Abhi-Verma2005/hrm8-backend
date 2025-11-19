/**
 * Company Profile Constants
 * Defines onboarding sections, required fields, and helper utilities
 */

import { CompanyProfileSection, CompanyProfileSectionKey } from '../types';

export interface CompanyProfileSectionMeta {
  key: CompanyProfileSectionKey;
  label: string;
  enumValue: CompanyProfileSection;
  required: boolean;
  description: string;
}

export const COMPANY_PROFILE_SECTIONS: CompanyProfileSectionMeta[] = [
  {
    key: 'basicDetails',
    label: 'Basic Company Details',
    enumValue: CompanyProfileSection.BASIC_DETAILS,
    required: true,
    description: 'Company name, size, industries, phone, website, and overview.',
  },
  {
    key: 'primaryLocation',
    label: 'Primary Location',
    enumValue: CompanyProfileSection.PRIMARY_LOCATION,
    required: true,
    description: 'Primary office location and ability to add additional sites.',
  },
  {
    key: 'personalProfile',
    label: 'Personal Profile',
    enumValue: CompanyProfileSection.PERSONAL_PROFILE,
    required: false,
    description: 'Admin position title, phone number, and preferred location.',
  },
  {
    key: 'teamMembers',
    label: 'Team Members',
    enumValue: CompanyProfileSection.TEAM_MEMBERS,
    required: false,
    description: 'Invite additional admins/recruiters and set approval levels.',
  },
  {
    key: 'billing',
    label: 'Billing Setup',
    enumValue: CompanyProfileSection.BILLING,
    required: false,
    description: 'Subscription preference, tax IDs, billing contacts, payment methods.',
  },
  {
    key: 'branding',
    label: 'Branding & Careers Page',
    enumValue: CompanyProfileSection.BRANDING,
    required: false,
    description: 'Logos, brand color, careers page preferences, and company intro.',
  },
];

export const REQUIRED_PROFILE_SECTION_KEYS: CompanyProfileSectionKey[] = COMPANY_PROFILE_SECTIONS.filter(
  (section) => section.required
).map((section) => section.key);

export const OPTIONAL_PROFILE_SECTION_KEYS: CompanyProfileSectionKey[] = COMPANY_PROFILE_SECTIONS.filter(
  (section) => !section.required
).map((section) => section.key);

export const COMPANY_PROFILE_SECTION_MAP: Record<CompanyProfileSectionKey, CompanyProfileSection> =
  COMPANY_PROFILE_SECTIONS.reduce(
    (acc, section) => ({
      ...acc,
      [section.key]: section.enumValue,
    }),
    {} as Record<CompanyProfileSectionKey, CompanyProfileSection>
  );


