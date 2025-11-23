/**
 * Core Type Definitions for HRM8 Authentication System
 */

import { Request } from 'express';

// Import and re-export Prisma enums for convenience
import {
  UserRole,
  UserStatus,
  CompanyVerificationStatus,
  CompanyProfileStatus,
  CompanyProfileSection,
  VerificationMethod,
  InvitationStatus,
  SignupRequestStatus,
  JobStatus,
  HiringMode,
  WorkArrangement,
  EmploymentType,
} from '@prisma/client';

export {
  UserRole,
  UserStatus,
  CompanyVerificationStatus,
  CompanyProfileStatus,
  CompanyProfileSection,
  VerificationMethod,
  InvitationStatus,
  SignupRequestStatus,
  JobStatus,
  HiringMode,
  WorkArrangement,
  EmploymentType,
};

// ============================================================================
// Entity Interfaces
// ============================================================================

export interface Company {
  id: string;
  name: string;
  website: string;
  domain: string; // Extracted from website (e.g., "tata.com")
  countryOrRegion: string;
  acceptedTerms: boolean;
  verificationStatus: CompanyVerificationStatus;
  verificationMethod?: VerificationMethod;
  verificationData?: {
    verifiedAt?: Date;
    verifiedBy?: string;
    gstNumber?: string;
    registrationNumber?: string;
    linkedInUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyProfilePhone {
  countryCode: string;
  number: string;
  type?: 'mobile' | 'work' | 'office' | 'fax' | 'other';
}

export interface CompanyProfileLocation {
  id: string;
  name: string;
  streetAddress: string;
  city: string;
  stateOrRegion: string;
  postalCode: string;
  country: string;
  isPrimary?: boolean;
}

export interface CompanyProfileBasicDetails {
  companyName: string;
  companySize: string;
  industries: string[];
  phone: CompanyProfilePhone;
  websiteUrl?: string;
  yearFounded?: number;
  overview?: string;
  logoUrl?: string;
  iconUrl?: string;
}

export interface CompanyProfilePersonalInfo {
  positionTitle?: string;
  phone?: CompanyProfilePhone;
  location?: string;
}

export interface CompanyProfileTeamMemberInvite {
  email: string;
  role: string;
  authorizationLevel?: string;
  approvalLevel?: string;
  status?: 'pending' | 'accepted' | 'declined';
}

export interface CompanyProfileBillingData {
  paymentPreference?: 'payg' | 'subscription';
  subscriptionPlan?: string;
  registeredBusinessName?: string;
  taxId?: string;
  registeredCountry?: string;
  isCharity?: boolean;
  supportingDocuments?: Array<{ id: string; name: string; url: string }>;
  paymentMethod?: {
    type: 'card' | 'invoice' | 'bank';
    last4?: string;
    brand?: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    stateOrRegion: string;
    postalCode: string;
    country: string;
  };
  accountsEmail?: string;
}

export interface CompanyProfileBrandingData {
  careersPageEnabled?: boolean;
  subdomain?: string;
  brandColor?: string;
  companyIntroduction?: string;
  logoUrl?: string;
  iconUrl?: string;
}

export type CompanyProfileSectionKey =
  | 'basicDetails'
  | 'primaryLocation'
  | 'personalProfile'
  | 'teamMembers'
  | 'billing'
  | 'branding';

export interface CompanyProfileData {
  basicDetails?: CompanyProfileBasicDetails;
  primaryLocation?: CompanyProfileLocation;
  additionalLocations?: CompanyProfileLocation[];
  personalProfile?: CompanyProfilePersonalInfo;
  teamMembers?: {
    invites: CompanyProfileTeamMemberInvite[];
    defaultAdminId?: string;
  };
  billing?: CompanyProfileBillingData;
  branding?: CompanyProfileBrandingData;
}

export interface CompanyProfile {
  id: string;
  companyId: string;
  status: CompanyProfileStatus;
  completionPercentage: number;
  completedSections: CompanyProfileSection[];
  profileData?: CompanyProfileData;
  lastReminderAt?: Date;
  skipUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  companyId: string;
  role: UserRole;
  status: UserStatus;
  assignedBy?: string; // User ID who assigned this role
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface Invitation {
  id: string;
  companyId: string;
  invitedBy: string; // User ID of the person who sent the invite
  email: string;
  token: string;
  status: InvitationStatus;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

export interface SignupRequest {
  id: string;
  companyId: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  acceptedTerms: boolean;
  passwordHash: string;
  status: SignupRequestStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Request/Response DTOs
// ============================================================================

export interface CompanyRegistrationRequest {
  companyName: string;
  companyWebsite: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  password: string;
  countryOrRegion: string;
  acceptTerms: boolean;
}

export interface UpdateCompanyProfileRequest {
  section: CompanyProfileSectionKey;
  data: Record<string, unknown>;
  markComplete?: boolean;
}

export interface CompanyProfileProgressResponse {
  profile: CompanyProfile;
  requiredSections: CompanyProfileSectionKey[];
  optionalSections: CompanyProfileSectionKey[];
}

export interface CompanyRegistrationResponse {
  companyId: string;
  adminUserId: string;
  verificationRequired: boolean;
  verificationMethod: VerificationMethod;
  message: string;
}

export interface EmployeeInvitationRequest {
  emails: string[];
}

export interface EmployeeInvitationResponse {
  sent: string[];
  failed: Array<{ email: string; reason: string }>;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    companyId: string;
    companyName: string;
  };
  token: string; // JWT token (to be implemented)
}

export interface CompanyVerificationRequest {
  companyId: string;
  method: VerificationMethod;
  data?: {
    gstNumber?: string;
    registrationNumber?: string;
    linkedInUrl?: string;
  };
}

export interface EmployeeSignupRequest {
  firstName: string;
  lastName: string;
  businessEmail: string;
  password: string;
  acceptTerms: boolean;
  companyDomain?: string; // Optional: if provided, will try to find company by domain
}

export interface ApproveSignupRequest {
  requestId: string;
}

export interface RejectSignupRequest {
  requestId: string;
  reason?: string;
}

// ============================================================================
// Context Types (for middleware)
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    companyId: string;
    role: UserRole;
  };
}

export interface CompanyContext {
  companyId: string;
  userId: string;
  userRole: UserRole;
}

export interface HiringTeamMember {
  id: string;
  userId?: string;
  email: string;
  name: string;
  role: 'hiring_manager' | 'recruiter' | 'interviewer' | 'coordinator';
  permissions: {
    canViewApplications: boolean;
    canShortlist: boolean;
    canScheduleInterviews: boolean;
    canMakeOffers: boolean;
  };
  status: 'active' | 'pending_invite';
  invitedAt?: string;
  addedBy?: string;
}

export interface Job {
  id: string;
  companyId: string;
  createdBy: string;
  jobCode?: string;
  title: string;
  description: string;
  jobSummary?: string;
  status: JobStatus;
  hiringMode: HiringMode;
  location: string;
  department?: string;
  workArrangement: WorkArrangement;
  employmentType: EmploymentType;
  numberOfVacancies: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  salaryDescription?: string;
  category?: string;
  promotionalTags: string[];
  featured: boolean;
  stealth: boolean;
  visibility: string;
  requirements: string[];
  responsibilities: string[];
  termsAccepted: boolean;
  termsAcceptedAt?: Date;
  termsAcceptedBy?: string;
  postingDate?: Date;
  expiryDate?: Date;
  closeDate?: Date;
  hiringTeam?: HiringTeamMember[];
  applicationForm?: any; // JSON field for application form configuration
  videoInterviewingEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

