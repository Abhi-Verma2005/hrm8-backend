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
  if (!req.user?.companyId) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid user session',
    });
    return;
  }

  const userCompanyId = req.user.companyId;
  
  // Only check companyId in body, not in params.id (params.id might be a resource ID like job ID)
  // For job routes, the company check is done in the service layer
  if (req.body?.companyId && req.body.companyId !== userCompanyId) {
    res.status(403).json({
      success: false,
      error: 'Access denied. You can only access your own company data.',
    });
    return;
  }

  // Only override params.id if it's explicitly a companyId param
  // Don't override for resource IDs (like job IDs)
  if (req.params.companyId && req.params.companyId !== userCompanyId) {
    res.status(403).json({
      success: false,
      error: 'Access denied. You can only access your own company data.',
    });
    return;
  }

  // Ensure companyId is set in body for create operations
  if (!req.body) {
    req.body = {};
  }
  if (req.method === 'POST' && !req.body.companyId) {
    req.body.companyId = userCompanyId;
  }

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

  (req as any).companyScope = {
    companyId: req.user.companyId,
  };

  next();
}

