/**
 * Commission Request Validators
 * Validates request data for commission endpoints
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Validate commission creation request
 */
export function validateCreateCommission(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const data = req.body;
  const errors: string[] = [];

  // Validate consultantId
  if (!data.consultantId || typeof data.consultantId !== 'string' || data.consultantId.trim().length === 0) {
    errors.push('Consultant ID is required');
  }

  // Validate regionId
  if (!data.regionId || typeof data.regionId !== 'string' || data.regionId.trim().length === 0) {
    errors.push('Region ID is required');
  }

  // Validate amount
  if (data.amount === undefined || data.amount === null) {
    errors.push('Amount is required');
  } else if (typeof data.amount !== 'number' || data.amount <= 0) {
    errors.push('Amount must be a positive number');
  }

  // Validate commission type (support both 'type' and 'commissionType' for backward compatibility)
  const commissionType = data.type || data.commissionType;
  if (!commissionType) {
    errors.push('Commission type is required');
  } else if (typeof commissionType === 'string') {
    const validTypes = ['PLACEMENT', 'SUBSCRIPTION_SALE', 'RECRUITMENT_SERVICE', 'CUSTOM'];
    if (!validTypes.includes(commissionType)) {
      errors.push('Invalid commission type. Must be PLACEMENT, SUBSCRIPTION_SALE, RECRUITMENT_SERVICE, or CUSTOM');
    }
  } else {
    errors.push('Commission type must be a string');
  }

  // Validate optional fields
  if (data.rate !== undefined && data.rate !== null) {
    if (typeof data.rate !== 'number' || data.rate < 0 || data.rate > 100) {
      errors.push('Rate must be a number between 0 and 100');
    }
  }

  if (data.description !== undefined && typeof data.description !== 'string') {
    errors.push('Description must be a string');
  }

  if (data.notes !== undefined && typeof data.notes !== 'string') {
    errors.push('Notes must be a string');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors,
    });
    return;
  }

  // Normalize commission type for backward compatibility
  if (data.commissionType && !data.type) {
    req.body.type = data.commissionType;
  }

  next();
}

/**
 * Validate commission query filters
 */
export function validateCommissionFilters(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  // Validate consultantId if provided
  if (req.query.consultantId !== undefined) {
    if (typeof req.query.consultantId !== 'string' || req.query.consultantId.trim().length === 0) {
      errors.push('Consultant ID must be a non-empty string');
    }
  }

  // Validate regionId if provided
  if (req.query.regionId !== undefined) {
    if (typeof req.query.regionId !== 'string' || req.query.regionId.trim().length === 0) {
      errors.push('Region ID must be a non-empty string');
    }
  }

  // Validate jobId if provided
  if (req.query.jobId !== undefined) {
    if (typeof req.query.jobId !== 'string' || req.query.jobId.trim().length === 0) {
      errors.push('Job ID must be a non-empty string');
    }
  }

  // Validate status if provided
  if (req.query.status !== undefined) {
    const statusStr = req.query.status as string;
    const validStatuses = ['PENDING', 'CONFIRMED', 'PAID', 'CANCELLED'];
    if (!validStatuses.includes(statusStr)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }
  }

  // Validate type/commissionType if provided
  if (req.query.type !== undefined || req.query.commissionType !== undefined) {
    const typeStr = (req.query.type || req.query.commissionType) as string;
    const validTypes = ['PLACEMENT', 'SUBSCRIPTION_SALE', 'RECRUITMENT_SERVICE', 'CUSTOM'];
    if (!validTypes.includes(typeStr)) {
      errors.push(`Commission type must be one of: ${validTypes.join(', ')}`);
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
 * Validate regional commissions query
 */
export function validateRegionalCommissionsQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors: string[] = [];

  // Validate regionId (required)
  if (!req.query.regionId || typeof req.query.regionId !== 'string' || req.query.regionId.trim().length === 0) {
    errors.push('Region ID is required');
  }

  // Validate status if provided
  if (req.query.status !== undefined) {
    const statusStr = req.query.status as string;
    const validStatuses = ['PENDING', 'CONFIRMED', 'PAID', 'CANCELLED'];
    if (!validStatuses.includes(statusStr)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
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
 * Validate mark commission as paid request
 */
export function validateMarkAsPaid(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const data = req.body;
  const errors: string[] = [];

  // paymentReference/paidTo is optional, but if provided, must be a string
  const ref = data.paymentReference || data.paidTo;
  if (ref !== undefined && (typeof ref !== 'string' || ref.trim().length === 0)) {
    errors.push('Payment reference must be a non-empty string if provided');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors,
    });
    return;
  }

  // Normalize for backward compatibility
  if (data.paidTo && !data.paymentReference) {
    req.body.paymentReference = data.paidTo;
  }

  next();
}

