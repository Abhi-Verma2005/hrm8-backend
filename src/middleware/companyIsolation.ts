/**
 * Company Isolation Middleware
 * Ensures users can only access data from their own company
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

/**
 * Middleware to verify user can only access their company's data
 * This should be used on routes that require company ID in params or body
 */
export function enforceCompanyIsolation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
    return;
  }

  const userCompanyId = req.user.companyId;

  // Check company ID in URL params
  if (req.params.companyId && req.params.companyId !== userCompanyId) {
    res.status(403).json({
      success: false,
      error: 'Access denied. You can only access your own company data.',
    });
    return;
  }

  // Check company ID in request body (if present)
  if (req.body.companyId && req.body.companyId !== userCompanyId) {
    res.status(403).json({
      success: false,
      error: 'Access denied. You can only access your own company data.',
    });
    return;
  }

  // Attach company ID to request for convenience
  req.body.companyId = userCompanyId;

  next();
}

/**
 * Middleware to automatically filter queries by company ID
 * Use this to ensure database queries are scoped to user's company
 */
export function scopeToCompany(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
    return;
  }

  // Attach company scope to request for use in controllers/services
  (req as any).companyScope = {
    companyId: req.user.companyId,
  };

  next();
}

