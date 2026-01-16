/**
 * Notification Broadcast Service
 * Handles real-time WebSocket broadcasting of notifications
 */

import { UniversalNotification, NotificationRecipientType } from '@prisma/client';

// Type for the WebSocket broadcast function (will be injected from websocket.ts)
type BroadcastFunction = (
    message: any,
    options: {
        type: 'room' | 'global' | 'users';
        targetConnectionKeys?: string[];
        excludeConnectionKey?: string;
    }
) => void;

// Type for the connections map (will be injected from websocket.ts)
type ConnectionsMap = Map<string, {
    ws: any;
    userEmail: string;
    userName: string;
    userId: string;
    userType: 'USER' | 'CANDIDATE' | 'CONSULTANT' | 'HRM8';
    connectionKey: string;
    authenticated: boolean;
}>;

let broadcastFn: BroadcastFunction | null = null;
let connectionsMap: ConnectionsMap | null = null;

/**
 * Initialize the broadcast service with WebSocket dependencies
 * This should be called from websocket.ts after initialization
 */
export function initNotificationBroadcast(
    broadcast: BroadcastFunction,
    connections: ConnectionsMap
): void {
    broadcastFn = broadcast;
    connectionsMap = connections;
    console.log('📢 NotificationBroadcastService initialized');
}

/**
 * Build connection key for a user (must match websocket.ts pattern)
 */
function buildConnectionKey(
    recipientType: NotificationRecipientType,
    recipientId: string
): string {
    const userTypeMap: Record<NotificationRecipientType, string> = {
        USER: 'USER',
        CANDIDATE: 'CANDIDATE',
        CONSULTANT: 'CONSULTANT',
        HRM8_USER: 'HRM8',
    };
    return `${userTypeMap[recipientType]}:${recipientId}`;
}

/**
 * Broadcast a notification to a specific user
 */
export function broadcastNotificationToUser(
    notification: UniversalNotification
): boolean {
    if (!broadcastFn || !connectionsMap) {
        console.warn('⚠️ NotificationBroadcastService not initialized');
        return false;
    }

    const connectionKey = buildConnectionKey(
        notification.recipient_type,
        notification.recipient_id
    );

    // Check if user is connected
    if (!connectionsMap.has(connectionKey)) {
        console.log(`📭 User ${connectionKey} not connected, skipping real-time broadcast`);
        return false;
    }

    const message = {
        type: 'notification',
        payload: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            actionUrl: notification.action_url,
            createdAt: notification.created_at.toISOString(),
            read: notification.read,
        },
    };

    broadcastFn(message, {
        type: 'users',
        targetConnectionKeys: [connectionKey],
    });

    console.log(`📤 Notification broadcast to ${connectionKey}`);
    return true;
}

/**
 * Broadcast notifications to multiple users
 */
export function broadcastNotificationsToUsers(
    notifications: UniversalNotification[]
): number {
    if (!broadcastFn || !connectionsMap) {
        console.warn('⚠️ NotificationBroadcastService not initialized');
        return 0;
    }

    let successCount = 0;

    for (const notification of notifications) {
        if (broadcastNotificationToUser(notification)) {
            successCount++;
        }
    }

    return successCount;
}

/**
 * Broadcast unread count update to a user
 */
export function broadcastUnreadCount(
    recipientType: NotificationRecipientType,
    recipientId: string,
    unreadCount: number
): boolean {
    if (!broadcastFn || !connectionsMap) {
        console.warn('⚠️ NotificationBroadcastService not initialized');
        return false;
    }

    const connectionKey = buildConnectionKey(recipientType, recipientId);

    if (!connectionsMap.has(connectionKey)) {
        return false;
    }

    const message = {
        type: 'notifications_count',
        payload: { unreadCount },
    };

    broadcastFn(message, {
        type: 'users',
        targetConnectionKeys: [connectionKey],
    });

    return true;
}

/**
 * Find all connected users in a company
 */
export function getConnectedCompanyUsers(_companyId: string): string[] {
    if (!connectionsMap) return [];

    const connectedKeys: string[] = [];

    // Note: This requires additional context about which users belong to which company
    // For now, this is a placeholder - actual implementation would need company user lookup
    for (const [key, connection] of connectionsMap) {
        if (connection.userType === 'USER') {
            // Would need to check if user.companyId matches
            connectedKeys.push(key);
        }
    }

    return connectedKeys;
}

/**
 * Find all connected regional admins for specific regions
 */
export function getConnectedRegionalAdmins(_regionIds: string[]): string[] {
    if (!connectionsMap) return [];

    const connectedKeys: string[] = [];

    // Note: This requires additional context about which HRM8 users manage which regions
    // For now, this is a placeholder
    for (const [key, connection] of connectionsMap) {
        if (connection.userType === 'HRM8') {
            connectedKeys.push(key);
        }
    }

    return connectedKeys;
}
