import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from backend/.env
config({ path: resolve(__dirname, '../../.env') });

import { prisma } from '../lib/prisma';
import { UniversalNotificationService } from '../services/notification/UniversalNotificationService';
import { UserNotificationPreferencesService } from '../services/user/UserNotificationPreferencesService';
import {
    UniversalNotificationType,
    NotificationRecipientType,
    UserRole,
    UserStatus
} from '@prisma/client';

async function main() {
    console.log('Starting Quiet Hours Verification...');

    // 1. Create a Test User
    const testEmail = `test.quiet.hours.${Date.now()}@example.com`;
    console.log(`Creating test user: ${testEmail}`);

    // Minimal company creation if needed, or find existing.
    const company = await prisma.company.findFirst();
    if (!company) {
        throw new Error('No company found to attach test user to.');
    }

    const user = await prisma.user.create({
        data: {
            email: testEmail,
            name: 'Quiet Hours Test User',
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
            company_id: company.id,
            password_hash: 'ignored'
        }
    });

    try {
        // 2. Set Preferences: Enforce Quiet Hours (Always On)
        // 00:00 to 23:59 covers everything.
        console.log('Setting notification preferences (Quiet Hours: ON, All Day)');
        await UserNotificationPreferencesService.updatePreferences(user.id, {
            eventPreferences: {
                new_application: { enabled: true, channels: ['in-app'] },
                system_announcement: { enabled: true, channels: ['in-app'] },
                job_posted: { enabled: true, channels: ['in-app'] }
            } as any,
            quietHours: {
                enabled: true,
                start: '00:00',
                end: '23:59'
            }
        });

        // 3. Test Non-Critical Notification (NEW_APPLICATION)
        console.log('Testing Non-Critical Notification (NEW_APPLICATION)...');
        const nonCritical = await UniversalNotificationService.createNotification({
            recipientType: NotificationRecipientType.USER,
            recipientId: user.id,
            type: UniversalNotificationType.NEW_APPLICATION,
            title: 'Test Application',
            message: 'This should be suppressed by quiet hours',
        });

        if (nonCritical) {
            console.error('FAIL: Non-critical notification was created despite quiet hours!');
        } else {
            console.log('PASS: Non-critical notification was correctly suppressed.');
        }

        // 4. Test Critical Notification (SYSTEM_ANNOUNCEMENT)
        console.log('Testing Critical Notification (SYSTEM_ANNOUNCEMENT)...');
        const critical = await UniversalNotificationService.createNotification({
            recipientType: NotificationRecipientType.USER,
            recipientId: user.id,
            type: UniversalNotificationType.SYSTEM_ANNOUNCEMENT,
            title: 'Critical Alert',
            message: 'This should bypass quiet hours',
        });

        if (critical) {
            console.log('PASS: Critical notification was correctly created.');
        } else {
            console.error('FAIL: Critical notification was suppressed!');
        }

        // 5. Test Mapped Event Type (JOB_STATUS_CHANGED -> job_posted)
        // Even if default mapping was wrong, I updated it. Let's verify it maps to job_posted (non-critical).
        console.log('Testing Mapped Notification (JOB_STATUS_CHANGED -> job_posted)...');
        const mappedEvent = await UniversalNotificationService.createNotification({
            recipientType: NotificationRecipientType.USER,
            recipientId: user.id,
            type: UniversalNotificationType.JOB_STATUS_CHANGED,
            title: 'Job Status Changed',
            message: 'This should be suppressed if mapped correctly to non-critical event',
        });

        if (mappedEvent) {
            console.error('FAIL: JOB_STATUS_CHANGED was created! Mapping might be incorrect (treated as critical?).');
        } else {
            console.log('PASS: JOB_STATUS_CHANGED was correctly suppressed.');
        }

    } catch (error) {
        console.error('Verification failed with error:', error);
    } finally {
        // Cleanup
        console.log('Cleaning up test user...');
        await prisma.user.delete({ where: { id: user.id } });
        await prisma.$disconnect();
    }
}

main();
