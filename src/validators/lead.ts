/**
 * Lead Validation Schemas
 * Zod schemas for validating lead-related requests
 */

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Schema for creating a new lead
 */
export const createLeadSchema = z.object({
    companyName: z.string()
        .min(2, 'Company name must be at least 2 characters')
        .max(255, 'Company name must not exceed 255 characters')
        .trim(),

    email: z.string()
        .email('Invalid email format')
        .toLowerCase()
        .trim(),

    country: z.string()
        .min(2, 'Country is required')
        .trim(),

    website: z.string()
        .url('Invalid website URL')
        .optional()
        .or(z.literal('')),

    phone: z.string()
        .optional()
        .or(z.literal('')),

    leadSource: z.string()
        .optional(),

    budget: z.string()
        .optional(),

    timeline: z.string()
        .optional(),

    message: z.string()
        .optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

/**
 * Middleware to validate lead creation request
 */
export function validateCreateLead(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    try {
        const validatedData = createLeadSchema.parse(req.body);
        req.body = validatedData; // Replace with validated data
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errors = error.issues.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));

            res.status(400).json({
                success: false,
                error: 'Validation failed',
                errors,
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: 'Validation error',
        });
    }
}

/**
 * Schema for converting a lead to a company
 */
export const convertLeadSchema = z.object({
    adminFirstName: z.string()
        .min(2, 'First name must be at least 2 characters')
        .trim(),

    adminLastName: z.string()
        .min(2, 'Last name must be at least 2 characters')
        .trim(),

    password: z.string()
        .min(8, 'Password must be at least 8 characters'),

    acceptTerms: z.boolean()
        .refine(val => val === true, 'You must accept the terms and conditions'),
});

export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;

/**
 * Middleware to validate lead conversion request
 */
export function validateConvertLead(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    try {
        const validatedData = convertLeadSchema.parse(req.body);
        req.body = validatedData;
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errors = error.issues.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));

            res.status(400).json({
                success: false,
                error: 'Validation failed',
                errors,
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: 'Validation error',
        });
    }
}
