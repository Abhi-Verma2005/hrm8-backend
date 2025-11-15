/**
 * Core Type Definitions for HRM8 Authentication System
 */

import { Request } from 'express';

// Import and re-export Prisma enums for convenience
import {
  UserRole,
  UserStatus,
  CompanyVerificationStatus,
  VerificationMethod,
  InvitationStatus,
} from '@prisma/client';

export {
  UserRole,
  UserStatus,
  CompanyVerificationStatus,
  VerificationMethod,
  InvitationStatus,
};

// ============================================================================
// Entity Interfaces
// ============================================================================

export interface Company {
  id: string;
  name: string;
  website: string;
  domain: string; // Extracted from website (e.g., "tata.com")
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

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  companyId: string;
  role: UserRole;
  status: UserStatus;
  isCompanyAdmin: boolean;
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

// ============================================================================
// Request/Response DTOs
// ============================================================================

export interface CompanyRegistrationRequest {
  companyName: string;
  companyWebsite: string;
  adminEmail: string;
  adminName: string;
  password: string;
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

