/**
 * Company Duplicate Detection Service
 * Finds potential duplicate companies based on name, domain, and other attributes
 */

import prisma from '../../lib/prisma';

interface DuplicateResult {
    companyId: string;
    companyName: string;
    domain?: string | null;
    matchScore: number;
    matchReasons: string[];
    createdAt: Date;
}

interface DuplicateCheckResult {
    hasPotentialDuplicates: boolean;
    duplicates: DuplicateResult[];
}

export class DuplicateDetectionService {
    /**
     * Check for potential duplicates before creating a new company
     */
    static async checkForDuplicates(data: {
        name: string;
        domain?: string;
        email?: string;
        phone?: string;
    }): Promise<DuplicateCheckResult> {
        const duplicates: DuplicateResult[] = [];

        // Normalize inputs
        const normalizedName = this.normalizeName(data.name);
        const normalizedDomain = data.domain ? this.normalizeDomain(data.domain) : undefined;

        // Check by exact domain match (highest confidence)
        if (normalizedDomain) {
            const domainMatches = await prisma.company.findMany({
                where: {
                    domain: {
                        equals: normalizedDomain,
                        mode: 'insensitive',
                    },
                },
                select: {
                    id: true,
                    name: true,
                    domain: true,
                    created_at: true,
                },
                take: 5,
            });

            for (const match of domainMatches) {
                duplicates.push({
                    companyId: match.id,
                    companyName: match.name,
                    domain: match.domain,
                    matchScore: 95,
                    matchReasons: ['Exact domain match'],
                    createdAt: match.created_at,
                });
            }
        }

        // Check by similar name (fuzzy match)
        const nameVariations = this.getNameVariations(normalizedName);

        for (const variation of nameVariations) {
            const nameMatches = await prisma.company.findMany({
                where: {
                    name: {
                        contains: variation,
                        mode: 'insensitive',
                    },
                    id: {
                        notIn: duplicates.map(d => d.companyId),
                    },
                },
                select: {
                    id: true,
                    name: true,
                    domain: true,
                    created_at: true,
                },
                take: 5,
            });

            for (const match of nameMatches) {
                const score = this.calculateNameSimilarity(normalizedName, this.normalizeName(match.name));
                if (score >= 70) {
                    duplicates.push({
                        companyId: match.id,
                        companyName: match.name,
                        domain: match.domain,
                        matchScore: score,
                        matchReasons: [`Similar name (${score}% match)`],
                        createdAt: match.created_at,
                    });
                }
            }
        }

        // Check by email domain if provided
        if (data.email) {
            const emailDomain = data.email.split('@')[1];
            if (emailDomain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(emailDomain.toLowerCase())) {
                const emailDomainMatches = await prisma.company.findMany({
                    where: {
                        OR: [
                            { domain: { contains: emailDomain, mode: 'insensitive' } },
                            { email: { contains: emailDomain, mode: 'insensitive' } },
                        ],
                        id: {
                            notIn: duplicates.map(d => d.companyId),
                        },
                    },
                    select: {
                        id: true,
                        name: true,
                        domain: true,
                        created_at: true,
                    },
                    take: 3,
                });

                for (const match of emailDomainMatches) {
                    duplicates.push({
                        companyId: match.id,
                        companyName: match.name,
                        domain: match.domain,
                        matchScore: 75,
                        matchReasons: ['Email domain match'],
                        createdAt: match.created_at,
                    });
                }
            }
        }

        // Sort by match score (highest first)
        duplicates.sort((a, b) => b.matchScore - a.matchScore);

        return {
            hasPotentialDuplicates: duplicates.length > 0,
            duplicates: duplicates.slice(0, 5), // Return top 5 matches
        };
    }

    /**
     * Normalize company name for comparison
     */
    private static normalizeName(name: string): string {
        return name
            .toLowerCase()
            .replace(/\s+(inc\.?|llc\.?|ltd\.?|corp\.?|co\.?|corporation|company|limited)$/i, '')
            .replace(/[^a-z0-9]/g, '')
            .trim();
    }

    /**
     * Normalize domain for comparison
     */
    private static normalizeDomain(domain: string): string {
        return domain
            .toLowerCase()
            .replace(/^(https?:\/\/)?(www\.)?/, '')
            .replace(/\/$/, '')
            .split('/')[0]
            .trim();
    }

    /**
     * Get variations of company name for fuzzy matching
     */
    private static getNameVariations(normalizedName: string): string[] {
        const variations = [normalizedName];

        // Add first word (often the primary identifier)
        if (normalizedName.length > 3) {
            variations.push(normalizedName.substring(0, Math.min(normalizedName.length, 8)));
        }

        return variations;
    }

    /**
     * Calculate similarity between two normalized names
     */
    private static calculateNameSimilarity(name1: string, name2: string): number {
        if (name1 === name2) return 100;

        // Simple Levenshtein-based similarity
        const longer = name1.length > name2.length ? name1 : name2;
        const shorter = name1.length > name2.length ? name2 : name1;

        if (longer.length === 0) return 100;

        // Check if one contains the other
        if (longer.includes(shorter)) {
            return Math.round((shorter.length / longer.length) * 100);
        }

        // Character-based similarity
        let matches = 0;
        for (let i = 0; i < shorter.length; i++) {
            if (longer.includes(shorter[i])) matches++;
        }

        return Math.round((matches / longer.length) * 100);
    }

    /**
     * Find all potential duplicates in the database (for admin review)
     */
    static async findAllDuplicateClusters(): Promise<Array<{
        clusterId: string;
        companies: Array<{ id: string; name: string; domain: string | null; createdAt: Date }>;
        similarity: number;
    }>> {
        // Get all companies with domains
        const companies = await prisma.company.findMany({
            where: {
                domain: { not: null },
            },
            select: {
                id: true,
                name: true,
                domain: true,
                created_at: true,
            },
            orderBy: { created_at: 'asc' },
        });

        const clusters: Map<string, typeof companies> = new Map();

        // Group by domain
        for (const company of companies) {
            if (company.domain) {
                const normalizedDomain = this.normalizeDomain(company.domain);
                if (!clusters.has(normalizedDomain)) {
                    clusters.set(normalizedDomain, []);
                }
                clusters.get(normalizedDomain)!.push(company);
            }
        }

        // Filter to only clusters with duplicates
        const duplicateClusters = Array.from(clusters.entries())
            .filter(([_, comps]) => comps.length > 1)
            .map(([domain, comps]) => ({
                clusterId: domain,
                companies: comps.map(c => ({
                    id: c.id,
                    name: c.name,
                    domain: c.domain,
                    createdAt: c.created_at,
                })),
                similarity: 100,
            }));

        return duplicateClusters;
    }
}
