/**
 * Assess Registration Controller
 * Handles HRM8-Assess company and user registration
 * Creates companies in "assessment-only" mode with upgrade path to full HRM8
 */

import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { hashPassword } from '../../utils/password';
import { extractDomain } from '../../utils/domain';
import { AssessRegistrationRequest } from '../../validators/assessRegistration';
import { generateToken } from '../../utils/token';
import { generateSessionId, getSessionExpiration, getSessionCookieOptions } from '../../utils/session';

export class AssessRegistrationController {
    /**
     * Register a new company and admin for HRM8-Assess
     * POST /api/assess/register
     */
    static async register(req: Request, res: Response): Promise<void> {
        try {
            const data: AssessRegistrationRequest = req.body;
            const companyDomain = (req as any).companyDomain || extractDomain(data.companyWebsite);

            // Check if company with this domain already exists
            const existingCompany = await prisma.company.findUnique({
                where: { domain: companyDomain },
            });

            if (existingCompany) {
                res.status(409).json({
                    success: false,
                    error: 'A company with this domain already exists',
                    details: {
                        domain: companyDomain,
                        suggestion: 'If this is your company, please contact support or use the login page.',
                    },
                });
                return;
            }

            // Check if user email already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: data.email.toLowerCase() },
            });

            if (existingUser) {
                res.status(409).json({
                    success: false,
                    error: 'An account with this email already exists',
                    details: {
                        suggestion: 'Please use the login page or reset your password.',
                    },
                });
                return;
            }

            // Hash password
            const passwordHash = await hashPassword(data.password);

            // Create company and user in a transaction
            const result = await prisma.$transaction(async (tx) => {
                // Create company
                const company = await tx.company.create({
                    data: {
                        name: data.companyName.trim(),
                        website: data.companyWebsite.trim(),
                        domain: companyDomain,
                        country_or_region: data.country,
                        accepted_terms: data.acceptTerms,
                        verification_status: 'PENDING',
                        verification_method: 'VERIFICATION_EMAIL',
                    },
                });

                // Create company profile with additional details stored in profile_data JSON
                await tx.companyProfile.create({
                    data: {
                        company_id: company.id,
                        status: 'NOT_STARTED',
                        profile_data: {
                            industry: data.industry,
                            size: data.companySize || '1-10',
                            billingEmail: data.billingEmail || data.email.toLowerCase(),
                            source: 'hrm8-assess',
                        },
                    },
                });

                // Create admin user
                const adminName = `${data.firstName.trim()} ${data.lastName.trim()}`;
                const user = await tx.user.create({
                    data: {
                        email: data.email.toLowerCase(),
                        name: adminName,
                        password_hash: passwordHash,
                        company_id: company.id,
                        role: 'ADMIN',
                        status: 'PENDING_VERIFICATION',
                    },
                });

                // Generate verification token
                const verificationToken = generateToken(32);
                await tx.verificationToken.create({
                    data: {
                        token: verificationToken,
                        company_id: company.id,
                        email: data.email.toLowerCase(),
                        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                    },
                });

                return { company, user, verificationToken };
            });

            // TODO: Send verification email
            // await EmailService.sendVerificationEmail(data.email, result.verificationToken);

            // Create session for user (auto-login)
            const sessionId = generateSessionId();
            const sessionExpiration = getSessionExpiration();

            await prisma.session.create({
                data: {
                    session_id: sessionId,
                    user_id: result.user.id,
                    company_id: result.company.id,
                    user_role: 'ADMIN',
                    email: data.email.toLowerCase(),
                    expires_at: sessionExpiration,
                },
            });

            // Set session cookie
            res.cookie('session', sessionId, getSessionCookieOptions());

            res.status(201).json({
                success: true,
                data: {
                    companyId: result.company.id,
                    userId: result.user.id,
                    email: data.email.toLowerCase(),
                    verificationRequired: true,
                    message: 'Registration successful! Please check your email to verify your account.',
                },
            });
        } catch (error) {
            console.error('[AssessRegistrationController.register] Error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Registration failed. Please try again.',
            });
        }
    }

    /**
     * Get current assess user info
     * GET /api/assess/me
     */
    static async getCurrentUser(req: Request, res: Response): Promise<void> {
        try {
            const sessionId = req.cookies?.session;

            if (!sessionId) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const session = await prisma.session.findUnique({
                where: { id: sessionId },
                include: {
                    user: {
                        include: {
                            company: {
                                include: {
                                    profile: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!session || session.expires_at < new Date()) {
                res.status(401).json({ success: false, error: 'Session expired' });
                return;
            }

            const user = session.user;

            res.json({
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    status: user.status,
                    company: {
                        id: user.company.id,
                        name: user.company.name,
                        domain: user.company.domain,
                        verificationStatus: user.company.verification_status,
                        industry: user.company.profile?.industry,
                        size: user.company.profile?.size,
                    },
                },
            });
        } catch (error) {
            console.error('[AssessRegistrationController.getCurrentUser] Error:', error);
            res.status(500).json({ success: false, error: 'Failed to get user info' });
        }
    }

    /**
     * Logout from assess
     * POST /api/assess/logout
     */
    static async logout(req: Request, res: Response): Promise<void> {
        try {
            const sessionId = req.cookies?.session;

            if (sessionId) {
                await prisma.session.deleteMany({
                    where: { id: sessionId },
                });
            }

            res.clearCookie('session');
            res.json({ success: true, message: 'Logged out successfully' });
        } catch (error) {
            console.error('[AssessRegistrationController.logout] Error:', error);
            res.json({ success: true, message: 'Logged out' });
        }
    }
}
