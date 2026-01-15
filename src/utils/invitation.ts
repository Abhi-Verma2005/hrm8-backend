import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'invitation-secret-fallback-change-me';
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateInvitationToken(consultantId: string): string {
    const timestamp = Date.now().toString();
    const payload = Buffer.from(JSON.stringify({ consultantId, timestamp })).toString('base64');
    const signature = crypto
        .createHmac('sha256', SECRET)
        .update(payload)
        .digest('hex');
    return `${payload}.${signature}`;
}

export function verifyInvitationToken(token: string): { consultantId: string } | null {
    try {
        const [payload, signature] = token.split('.');
        if (!payload || !signature) return null;

        const expectedSignature = crypto
            .createHmac('sha256', SECRET)
            .update(payload)
            .digest('hex');

        if (signature !== expectedSignature) return null;

        const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
        const { consultantId, timestamp } = data;

        if (!consultantId || !timestamp) return null;

        // Check expiry
        if (Date.now() - parseInt(timestamp) > EXPIRY_MS) {
            return null; // Expired
        }

        return { consultantId };
    } catch (error) {
        return null;
    }
}
