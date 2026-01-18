/**
 * Audit Helper
 * Utility functions to help log audit entries from controllers
 */

import { Request } from 'express';
import { AuditLogService, CreateAuditLogInput } from '../services/hrm8/AuditLogService';
import { Hrm8AuthenticatedRequest } from './hrm8Auth';
import { ConsultantAuthenticatedRequest } from './consultantAuth';

export type AuditableRequest = Hrm8AuthenticatedRequest | ConsultantAuthenticatedRequest | Request;

/**
 * Log an audit entry with request context
 */
export async function logAudit(
    req: AuditableRequest,
    entityType: string,
    entityId: string,
    action: string,
    options?: {
        changes?: Record<string, unknown>;
        description?: string;
    }
): Promise<void> {
    try {
        // Extract actor info from request
        let performedBy = 'system';
        let performedByEmail = 'system@hrm8.com';
        let performedByRole = 'SYSTEM';

        const hrm8Req = req as Hrm8AuthenticatedRequest;
        const consultantReq = req as ConsultantAuthenticatedRequest;

        if (hrm8Req.hrm8User) {
            performedBy = hrm8Req.hrm8User.id;
            performedByEmail = hrm8Req.hrm8User.email;
            performedByRole = hrm8Req.hrm8User.role;
        } else if (consultantReq.consultant) {
            performedBy = consultantReq.consultant.id;
            performedByEmail = consultantReq.consultant.email;
            performedByRole = consultantReq.consultant.role;
        }

        const input: CreateAuditLogInput = {
            entityType,
            entityId,
            action,
            performedBy,
            performedByEmail,
            performedByRole,
            changes: options?.changes,
            description: options?.description,
            ipAddress: (req.ip || req.headers['x-forwarded-for'] as string) || undefined,
            userAgent: req.headers['user-agent'] || undefined,
        };

        await AuditLogService.log(input);
    } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to log audit entry:', error);
    }
}

/**
 * Create a standardized description for common actions
 */
export function createAuditDescription(
    action: string,
    entityType: string,
    entityName?: string
): string {
    const name = entityName ? ` "${entityName}"` : '';

    switch (action) {
        case 'CREATE':
            return `Created ${entityType.toLowerCase()}${name}`;
        case 'UPDATE':
            return `Updated ${entityType.toLowerCase()}${name}`;
        case 'DELETE':
            return `Deleted ${entityType.toLowerCase()}${name}`;
        case 'SUSPEND':
            return `Suspended ${entityType.toLowerCase()}${name}`;
        case 'REACTIVATE':
            return `Reactivated ${entityType.toLowerCase()}${name}`;
        case 'TRANSFER':
            return `Transferred ${entityType.toLowerCase()}${name}`;
        case 'ASSIGN':
            return `Assigned ${entityType.toLowerCase()}${name}`;
        case 'UNASSIGN':
            return `Unassigned ${entityType.toLowerCase()}${name}`;
        default:
            return `${action} on ${entityType.toLowerCase()}${name}`;
    }
}
