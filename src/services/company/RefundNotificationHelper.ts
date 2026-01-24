import prisma from '../../lib/prisma';
import { HRM8User, NotificationRecipientType } from '@prisma/client';
import { UniversalNotificationService } from '../notification/UniversalNotificationService';
import { emailService } from '../email/EmailService';

export class RefundNotificationHelper {
    /**
     * Notify relevant admins of a new refund request
     */
    static async notifyAdminsOfNewRefund(refundId: string, companyId: string, amount: number, companyName: string) {
        try {
            const regionalAdmins = await this.getRegionalAdmins(companyId);
            const globalAdmins = await this.getGlobalAdmins();

            const allAdmins = [...regionalAdmins, ...globalAdmins];
            const uniqueAdminIds = Array.from(new Set(allAdmins.map(a => a.id)));

            const actionUrl = '/hrm8/refund-requests';

            for (const adminId of uniqueAdminIds) {
                await UniversalNotificationService.createNotification({
                    recipientType: NotificationRecipientType.HRM8_USER,
                    recipientId: adminId,
                    type: 'SYSTEM_ANNOUNCEMENT',
                    title: 'New Refund Request',
                    message: `New refund request from ${companyName} for $${amount.toFixed(2)}.`,
                    companyId,
                    actionUrl,
                    force: true,
                });
            }

            // Email notifications
            for (const admin of allAdmins) {
                await emailService.sendNotificationEmail(
                    admin.email,
                    `Action Required: New Refund Request - ${companyName}`,
                    `A new refund request has been submitted by ${companyName} for the amount of $${amount.toFixed(2)}.\n\nReason ID: ${refundId}\n\nPlease review this request in the admin dashboard.`,
                    actionUrl
                );
            }
        } catch (error) {
            console.error('Failed to notify admins of new refund:', error);
        }
    }

    /**
     * Notify company of refund status change (Approved/Rejected)
     */
    static async notifyCompanyOfRefundStatus(_refundId: string, companyId: string, amount: number, status: 'APPROVED' | 'REJECTED', notes?: string) {
        try {
            const companyAdmins = await prisma.user.findMany({
                where: { company_id: companyId, role: 'ADMIN' },
            });

            const title = status === 'APPROVED' ? 'Refund Approved - Ready to Withdraw' : 'Refund Request Rejected';
            const message = status === 'APPROVED'
                ? `Your refund request for $${amount.toFixed(2)} has been approved. You can now withdraw the funds to your wallet from the dashboard.`
                : `Your refund request for $${amount.toFixed(2)} has been rejected. Reason: ${notes || 'No reason provided.'}`;

            const actionUrl = '/settings/billing'; // Link to refund requests tab or wallet

            for (const admin of companyAdmins) {
                await UniversalNotificationService.createNotification({
                    recipientType: NotificationRecipientType.USER,
                    recipientId: admin.id,
                    type: 'REFUND_STATUS_CHANGED',
                    title,
                    message,
                    companyId,
                    actionUrl
                });

                await emailService.sendNotificationEmail(
                    admin.email,
                    title,
                    message,
                    actionUrl
                );
            }
        } catch (error) {
            console.error('Failed to notify company of refund status:', error);
        }
    }

    /**
     * Helper to lookup regional admins for a company
     */
    private static async getRegionalAdmins(companyId: string): Promise<HRM8User[]> {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                region: {
                    select: { licensee_id: true }
                }
            }
        });

        if (!company?.region?.licensee_id) return [];

        return await prisma.hRM8User.findMany({
            where: {
                licensee_id: company.region.licensee_id,
                role: 'REGIONAL_LICENSEE',
                status: 'ACTIVE'
            }
        });
    }

    /**
     * Helper to lookup global admins
     */
    private static async getGlobalAdmins(): Promise<HRM8User[]> {
        return await prisma.hRM8User.findMany({
            where: { role: 'GLOBAL_ADMIN', status: 'ACTIVE' }
        });
    }
}
