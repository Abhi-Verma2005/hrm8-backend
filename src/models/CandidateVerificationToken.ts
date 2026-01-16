/**
 * Candidate Verification Token Model
 * Handles verification tokens for candidate email verification
 */

import prisma from '../lib/prisma';

export interface CandidateVerificationTokenData {
    id: string;
    candidateId: string;
    email: string;
    token: string;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
}

export class CandidateVerificationTokenModel {
    /**
     * Create a new verification token
     */
    static async create(data: {
        candidateId: string;
        email: string;
        token: string;
        expiresAt: Date;
    }): Promise<CandidateVerificationTokenData> {
        const verificationToken = await prisma.candidateVerificationToken.create({
            data: {
                candidate_id: data.candidateId,
                email: data.email.toLowerCase(),
                token: data.token,
                expires_at: data.expiresAt,
            },
        });

        return {
            id: verificationToken.id,
            candidateId: verificationToken.candidate_id,
            email: verificationToken.email,
            token: verificationToken.token,
            expiresAt: verificationToken.expires_at,
            usedAt: verificationToken.used_at,
            createdAt: verificationToken.created_at,
        };
    }

    /**
     * Find verification token by token string
     */
    static async findByToken(token: string): Promise<CandidateVerificationTokenData | null> {
        const verificationToken = await prisma.candidateVerificationToken.findUnique({
            where: { token },
        });

        if (!verificationToken) {
            return null;
        }

        return {
            id: verificationToken.id,
            candidateId: verificationToken.candidate_id,
            email: verificationToken.email,
            token: verificationToken.token,
            expiresAt: verificationToken.expires_at,
            usedAt: verificationToken.used_at,
            createdAt: verificationToken.created_at,
        };
    }

    /**
     * Mark token as used
     */
    static async markAsUsed(tokenId: string): Promise<void> {
        await prisma.candidateVerificationToken.update({
            where: { id: tokenId },
            data: { used_at: new Date() },
        });
    }

    /**
     * Delete expired tokens (cleanup)
     */
    static async deleteExpiredTokens(): Promise<number> {
        const result = await prisma.candidateVerificationToken.deleteMany({
            where: {
                expires_at: {
                    lt: new Date(),
                },
            },
        });

        return result.count;
    }

    /**
     * Check if token is valid (not expired and not used)
     */
    static async isValidToken(token: string): Promise<boolean> {
        const verificationToken = await this.findByToken(token);

        if (!verificationToken) {
            return false;
        }

        if (verificationToken.usedAt) {
            return false; // Already used
        }

        if (verificationToken.expiresAt < new Date()) {
            return false; // Expired
        }

        return true;
    }
}

