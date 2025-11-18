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

  // Validate admin email
  if (!data.adminEmail || !isValidEmail(data.adminEmail)) {
    errors.push('Valid admin email is required');
  }

  // Validate admin name
  if (!data.adminName || data.adminName.trim().length < 2) {
    errors.push('Admin name is required and must be at least 2 characters');
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

  // Validate email
  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }

  // Validate name
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters');
  }

  // Validate password
  if (!data.password || data.password.length < 8) {
    errors.push('Password is required and must be at least 8 characters');
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

