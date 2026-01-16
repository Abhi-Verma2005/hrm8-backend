
import { prisma } from '../lib/prisma';
import { UniversalNotificationService } from '../services/notification/UniversalNotificationService';
import { initNotificationBroadcast } from '../services/notification/NotificationBroadcastService';
import { NotificationRecipientType, UniversalNotificationType } from '@prisma/client';

async function testNotifications() {
    console.log('🧪 Starting Notification E2E Test...');

    // 1. Mock the Broadcast Service
    const mockBroadcast = (message: any, options: any) => {
        console.log('📡 [MOCK BROADCAST] Sent message:', JSON.stringify(message, null, 2));
        console.log('📡 [MOCK BROADCAST] Options:', JSON.stringify(options, null, 2));
    };

    const mockConnections = new Map();

    try {
        // 2. We need a real user to test target targeting
        console.log('🔍 Checking for a test user in DB...');
        let user = await prisma.user.findFirst();

        if (!user) {
            console.log('⚠️ No users found in DB. Test cannot proceed.');
            return;
        }

        const targetId = user.id;
        const targetType = NotificationRecipientType.USER;

        // 3. Simulate a connected user
        const connectionKey = `USER:${targetId}`;
        mockConnections.set(connectionKey, {
            userType: 'USER',
            userId: targetId,
            authenticated: true,
            userEmail: user.email,
            userName: user.name
        });

        initNotificationBroadcast(mockBroadcast as any, mockConnections);
        console.log(`🔌 Simulated connection for user: ${connectionKey}`);

        // 4. Create a notification
        console.log(`📣 Creating notification for ${targetType}:${targetId}...`);
        const notification = await UniversalNotificationService.createNotification({
            recipientType: targetType,
            recipientId: targetId,
            type: UniversalNotificationType.SYSTEM_ANNOUNCEMENT,
            title: 'Real-time Test Notification',
            message: 'This notification should be broadcasted instantly!',
            data: {
                testRunId: Date.now(),
                isRealTime: true
            },
            actionUrl: '/dashboard/test'
        });

        console.log('✅ Notification created in DB:', notification.id);

        // 5. Verify unread count broadcast
        console.log('🔢 Testing unread count broadcast...');
        const unreadCount = await UniversalNotificationService.getUnreadCount(targetType, targetId);
        console.log(`📊 Unread count for user: ${unreadCount}`);

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
        console.log('🏁 Test completed.');
    }
}

testNotifications();
