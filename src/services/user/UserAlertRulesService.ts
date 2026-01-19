/**
 * User Alert Rules Service
 * Handles custom alert rules for HR Admin users
 */

import { prisma } from '../../lib/prisma';
import { randomUUID } from 'crypto';
import { NotificationEventType, NotificationChannel } from './UserNotificationPreferencesService';

export interface AlertCondition {
    field: string;
    operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
    value: string | number;
}

export interface AlertActions {
    channels: NotificationChannel[];
    recipients: string[]; // email addresses
    priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface AlertRule {
    id: string;
    userId: string;
    name: string;
    description?: string;
    enabled: boolean;
    eventType: NotificationEventType;
    conditions: AlertCondition[];
    actions: AlertActions;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}

export interface CreateAlertRuleInput {
    name: string;
    description?: string;
    enabled?: boolean;
    eventType: NotificationEventType;
    conditions: AlertCondition[];
    actions: AlertActions;
}

export class UserAlertRulesService {
    /**
     * Get all alert rules for a user
     */
    static async getAlertRules(userId: string): Promise<AlertRule[]> {
        const rules = await prisma.userAlertRule.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
        });

        return rules.map(this.mapToAlertRule);
    }

    /**
     * Get a single alert rule
     */
    static async getAlertRule(ruleId: string, userId: string): Promise<AlertRule | null> {
        const rule = await prisma.userAlertRule.findFirst({
            where: { id: ruleId, user_id: userId },
        });

        return rule ? this.mapToAlertRule(rule) : null;
    }

    /**
     * Create a new alert rule
     */
    static async createAlertRule(userId: string, input: CreateAlertRuleInput): Promise<AlertRule> {
        const rule = await prisma.userAlertRule.create({
            data: {
                id: randomUUID(),
                user_id: userId,
                name: input.name,
                description: input.description || null,
                enabled: input.enabled ?? true,
                event_type: input.eventType,
                conditions: input.conditions as any,
                actions: input.actions as any,
                created_by: userId,
            },
        });

        return this.mapToAlertRule(rule);
    }

    /**
     * Update an alert rule
     */
    static async updateAlertRule(
        ruleId: string,
        userId: string,
        updates: Partial<CreateAlertRuleInput>
    ): Promise<AlertRule | null> {
        // Verify ownership
        const existing = await prisma.userAlertRule.findFirst({
            where: { id: ruleId, user_id: userId },
        });

        if (!existing) {
            return null;
        }

        const rule = await prisma.userAlertRule.update({
            where: { id: ruleId },
            data: {
                ...(updates.name && { name: updates.name }),
                ...(updates.description !== undefined && { description: updates.description }),
                ...(updates.enabled !== undefined && { enabled: updates.enabled }),
                ...(updates.eventType && { event_type: updates.eventType }),
                ...(updates.conditions && { conditions: updates.conditions as any }),
                ...(updates.actions && { actions: updates.actions as any }),
            },
        });

        return this.mapToAlertRule(rule);
    }

    /**
     * Delete an alert rule
     */
    static async deleteAlertRule(ruleId: string, userId: string): Promise<boolean> {
        const existing = await prisma.userAlertRule.findFirst({
            where: { id: ruleId, user_id: userId },
        });

        if (!existing) {
            return false;
        }

        await prisma.userAlertRule.delete({
            where: { id: ruleId },
        });

        return true;
    }

    /**
     * Get enabled rules for a specific event type
     */
    static async getEnabledRulesForEvent(
        userId: string,
        eventType: NotificationEventType
    ): Promise<AlertRule[]> {
        const rules = await prisma.userAlertRule.findMany({
            where: {
                user_id: userId,
                event_type: eventType,
                enabled: true,
            },
        });

        return rules.map(this.mapToAlertRule);
    }

    /**
     * Evaluate conditions against event data
     */
    static evaluateConditions(conditions: AlertCondition[], eventData: Record<string, any>): boolean {
        if (conditions.length === 0) {
            return true; // No conditions = always match
        }

        return conditions.every(condition => {
            const fieldValue = eventData[condition.field];
            if (fieldValue === undefined) {
                return false;
            }

            switch (condition.operator) {
                case 'equals':
                    return fieldValue === condition.value;
                case 'greater_than':
                    return typeof fieldValue === 'number' && fieldValue > Number(condition.value);
                case 'less_than':
                    return typeof fieldValue === 'number' && fieldValue < Number(condition.value);
                case 'contains':
                    return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
                default:
                    return false;
            }
        });
    }

    private static mapToAlertRule(rule: any): AlertRule {
        return {
            id: rule.id,
            userId: rule.user_id,
            name: rule.name,
            description: rule.description || undefined,
            enabled: rule.enabled,
            eventType: rule.event_type as NotificationEventType,
            conditions: rule.conditions as AlertCondition[],
            actions: rule.actions as AlertActions,
            createdAt: rule.created_at,
            updatedAt: rule.updated_at,
            createdBy: rule.created_by,
        };
    }
}
