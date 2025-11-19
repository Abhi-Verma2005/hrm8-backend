/**
 * Company Profile Validators
 * Ensures onboarding payloads are well-formed before hitting controllers
 */

import { Request, Response, NextFunction } from 'express';
import { CompanyProfileSectionKey } from '../types';
import { COMPANY_PROFILE_SECTIONS } from '../constants/companyProfile';

const VALID_SECTION_KEYS = new Set<CompanyProfileSectionKey>(
  COMPANY_PROFILE_SECTIONS.map((section) => section.key)
);

export function validateProfileSectionUpdate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];
  const { section, data } = req.body;

  if (!section || typeof section !== 'string' || !VALID_SECTION_KEYS.has(section as CompanyProfileSectionKey)) {
    errors.push('A valid section key is required.');
  }

  if (!data || typeof data !== 'object') {
    errors.push('Section data must be provided.');
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


