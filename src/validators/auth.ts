/**
 * Authentication Request Validators
 * Validates request data before processing
 */

import { Request, Response, NextFunction } from 'express';
import { CompanyRegistrationRequest, LoginRequest, AcceptInvitationRequest, EmployeeSignupRequest } from '../types';
import { isValidEmail } from '../utils/email';
import { isValidDomain, extractDomain } from '../utils/domain';

/**
 * Validate company registration request
 */
export function validateCompanyRegistration(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const data: CompanyRegistrationRequest = req.body;
  const errors: string[] = [];

  // Validate company name
  if (!data.companyName || data.companyName.trim().length < 2) {
    errors.push('Company name is required and must be at least 2 characters');
  }

  // Validate website
  if (!data.companyWebsite || data.companyWebsite.trim().length === 0) {
    errors.push('Company website is required');
  } else {
    try {
      const domain = extractDomain(data.companyWebsite);
      if (!isValidDomain(domain)) {
        errors.push('Invalid company website format');
      }
    } catch {
      errors.push('Invalid company website format');
    }
  }

  // Validate admin first name
  if (!data.adminFirstName || data.adminFirstName.trim().length < 2) {
    errors.push('Admin first name is required and must be at least 2 characters');
  }

  // Validate admin last name
  if (!data.adminLastName || data.adminLastName.trim().length < 2) {
    errors.push('Admin last name is required and must be at least 2 characters');
  }

  // Validate admin email
  if (!data.adminEmail || !isValidEmail(data.adminEmail)) {
    errors.push('Valid admin business email is required');
  }

  // Validate terms acceptance
  if (data.acceptTerms !== true) {
    errors.push('You must accept the Terms & Conditions and Privacy Policy');
  }

  // Validate password
  if (!data.password || data.password.length < 8) {
    errors.push('Password is required and must be at least 8 characters');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors,
    });
    return;
  }

  next();
}

/**
 * Validate login request
 */
export function validateLogin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const data: LoginRequest = req.body;
  const errors: string[] = [];

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.password || data.password.length === 0) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors,
    });
    return;
  }

  next();
}

/**
 * Validate accept invitation request
 */
export function validateAcceptInvitation(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const data: AcceptInvitationRequest = req.body;
  const errors: string[] = [];

  if (!data.token || data.token.trim().length === 0) {
    errors.push('Invitation token is required');
  }

  if (!data.password || data.password.length < 8) {
    errors.push('Password is required and must be at least 8 characters');
  }

  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors,
    });
    return;
  }

  next();
}

/**
 * Validate employee signup request
 */
export function validateEmployeeSignup(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const data: EmployeeSignupRequest = req.body;
  const errors: string[] = [];

  // Validate first name
  if (!data.firstName || data.firstName.trim().length < 2) {
    errors.push('First name is required and must be at least 2 characters');
  }

  // Validate last name
  if (!data.lastName || data.lastName.trim().length < 2) {
    errors.push('Last name is required and must be at least 2 characters');
  }

  // Validate business email
  if (!data.businessEmail || !isValidEmail(data.businessEmail)) {
    errors.push('Valid business email is required');
  }

  // Validate password
  if (!data.password || data.password.length < 8) {
    errors.push('Password is required and must be at least 8 characters');
  }

  // Validate terms acceptance
  if (data.acceptTerms !== true) {
    errors.push('You must accept the Terms & Conditions and Privacy Policy');
  }

  // Validate company domain (optional)
  if (data.companyDomain && data.companyDomain.trim().length > 0) {
    try {
      const domain = extractDomain(data.companyDomain);
      if (!isValidDomain(domain)) {
        errors.push('Invalid company domain format');
      }
    } catch {
      errors.push('Invalid company domain format');
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors,
    });
    return;
  }

  next();
}

/**
 * Validate resend verification request
 */
export function validateResendVerification(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { email } = req.body as { email?: string };
  const errors: string[] = [];

  if (!email || !isValidEmail(email)) {
    errors.push('Valid email is required');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors,
    });
    return;
  }

  next();
}

