/**
 * Region Isolation Middleware
 * Ensures users can only access data from their assigned regions
 */

import { Response, NextFunction } from 'express';
import { Hrm8AuthenticatedRequest } from './hrm8Auth';
import { HRM8UserModel } from '../models/HRM8User';
import { RegionModel } from '../models/Region';

/**
 * Verify user has access to a specific region
 */
export async function requireRegionAccess(
  req: Hrm8AuthenticatedRequest,
  res: Response,
  next: NextFunction,
  regionId: string
): Promise<void> {
  try {
    if (!req.hrm8User) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const hrm8User = await HRM8UserModel.findById(req.hrm8User.id);
    if (!hrm8User) {
      res.status(401).json({
        success: false,
        error: 'HRM8 user not found',
      });
      return;
    }

    // Global Admin has access to all regions
    if (hrm8User.role === 'GLOBAL_ADMIN') {
      next();
      return;
    }

    // Regional Licensee can only access assigned regions
    if (hrm8User.role === 'REGIONAL_LICENSEE') {
      if (!hrm8User.licenseeId) {
        res.status(403).json({
          success: false,
          error: 'No licensee assignment found',
        });
        return;
      }

      // Check if region belongs to this licensee
      const region = await RegionModel.findById(regionId);
      if (!region || region.licenseeId !== hrm8User.licenseeId) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this region',
        });
        return;
      }

      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: 'Access denied',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Region access check failed',
    });
  }
}

/**
 * Middleware to filter queries by region (for Regional Licensees)
 */
export async function enforceRegionIsolation(
  req: Hrm8AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.hrm8User) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const hrm8User = await HRM8UserModel.findById(req.hrm8User.id);
    if (!hrm8User) {
      res.status(401).json({
        success: false,
        error: 'HRM8 user not found',
      });
      return;
    }

    // Global Admin has access to all regions (no filtering)
    if (hrm8User.role === 'GLOBAL_ADMIN') {
      next();
      return;
    }

    // Regional Licensee - filter by assigned regions
    if (hrm8User.role === 'REGIONAL_LICENSEE') {
      if (!hrm8User.licenseeId) {
        res.status(403).json({
          success: false,
          error: 'No licensee assignment found',
        });
        return;
      }

      // Get all regions for this licensee
      const regions = await RegionModel.findAll({ licenseeId: hrm8User.licenseeId });
      const regionIds = regions.map(r => r.id);

      // Attach region filter to request
      (req as any).allowedRegionIds = regionIds;
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: 'Access denied',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Region isolation check failed',
    });
  }
}

/**
 * Require Global Admin access
 */
export function requireGlobalAdmin(
  req: Hrm8AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.hrm8User || req.hrm8User.role !== 'GLOBAL_ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Global Admin access required',
    });
    return;
  }

  next();
}



