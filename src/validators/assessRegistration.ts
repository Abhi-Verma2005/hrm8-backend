/**
 * Assess Registration Validator
 * Validates hrm8-assess registration requests with domain email validation
 */

import { Request, Response, NextFunction } from 'express';
import { isValidEmail } from '../utils/email';
import { extractDomain, isValidDomain } from '../utils/domain';

export interface AssessRegistrationRequest {
    // Company fields
    companyName: string;
    companyWebsite: string;
    country: string;
    industry: string;
    companySize?: string;
    billingEmail?: string;

    // User fields
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    mobile?: string;
    mobileCountryCode?: string;
    jobTitle?: string;

    // Terms
    acceptTerms: boolean;
}

/**
 * Validate assess registration request
 * Ensures email domain matches company website domain
 */
export function validateAssessRegistration(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const data: AssessRegistrationRequest = req.body;
    const errors: string[] = [];

    // Validate company name
    if (!data.companyName || data.companyName.trim().length < 2) {
        errors.push('Company name is required and must be at least 2 characters');
    }

    // Validate and extract company website domain
    let companyDomain: string | null = null;
    if (!data.companyWebsite || data.companyWebsite.trim().length === 0) {
        errors.push('Company website is required');
    } else {
        try {
            companyDomain = extractDomain(data.companyWebsite);
            if (!isValidDomain(companyDomain)) {
                errors.push('Invalid company website format');
            }
        } catch {
            errors.push('Invalid company website URL');
        }
    }

    // Validate country
    if (!data.country || data.country.trim().length === 0) {
        errors.push('Country is required');
    }

    // Validate industry
    if (!data.industry || data.industry.trim().length === 0) {
        errors.push('Industry is required');
    }

    // Validate user first name
    if (!data.firstName || data.firstName.trim().length < 2) {
        errors.push('First name is required and must be at least 2 characters');
    }

    // Validate user last name
    if (!data.lastName || data.lastName.trim().length < 2) {
        errors.push('Last name is required and must be at least 2 characters');
    }

    // Validate user email format
    if (!data.email || !isValidEmail(data.email)) {
        errors.push('Valid business email is required');
    }

    // CRITICAL: Validate email domain matches company domain
    if (companyDomain && data.email && isValidEmail(data.email)) {
        const emailDomain = data.email.split('@')[1]?.toLowerCase();
        const normalizedCompanyDomain = companyDomain.toLowerCase();

        if (emailDomain !== normalizedCompanyDomain) {
            errors.push(
                `Email must use your company domain. Expected: yourname@${normalizedCompanyDomain}`
            );
        }
    }

    // Validate password
    if (!data.password || data.password.length < 8) {
        errors.push('Password is required and must be at least 8 characters');
    }

    // Validate terms acceptance
    if (data.acceptTerms !== true) {
        errors.push('You must accept the Terms & Conditions and Privacy Policy');
    }

    if (errors.length > 0) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            errors,
        });
        return;
    }

    // Attach extracted domain for use in controller
    (req as any).companyDomain = companyDomain;

    next();
}
