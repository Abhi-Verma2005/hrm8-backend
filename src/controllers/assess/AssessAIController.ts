/**
 * Assess AI Controller
 * Provides AI-powered assessment recommendations using OpenAI
 */

import { Request, Response } from 'express';
import OpenAI from 'openai';

// Question types for assessments
export const QUESTION_TYPES = [
    { id: 'multiple-choice', name: 'Multiple Choice', description: 'Select one correct answer from options' },
    { id: 'multiple-select', name: 'Multiple Select', description: 'Select all that apply from options' },
    { id: 'short-answer', name: 'Short Answer', description: 'Brief text response (1-2 sentences)' },
    { id: 'long-answer', name: 'Long Answer', description: 'Detailed written response' },
    { id: 'code-challenge', name: 'Code Challenge', description: 'Write and test code to solve a problem' },
];

// Assessment packs
export const ASSESSMENT_PACKS = [
    {
        id: 'pack-basic',
        name: 'Basic Pack',
        description: '1 assessment for quick screening',
        assessmentCount: 1,
        price: 39,
        features: ['Quick turnaround', 'Basic insights', 'Pass/Fail scoring'],
    },
    {
        id: 'pack-standard',
        name: 'Standard Pack',
        description: '2 assessments for better insights',
        assessmentCount: 2,
        price: 69,
        popular: true,
        features: ['Detailed analysis', 'Comparative scoring', 'Skill breakdown'],
    },
    {
        id: 'pack-comprehensive',
        name: 'Comprehensive Pack',
        description: '3 assessments for complete evaluation',
        assessmentCount: 3,
        price: 99,
        features: ['Full evaluation', 'In-depth reports', 'Hiring recommendations', 'Candidate ranking'],
    },
];

interface RecommendationRequest {
    title: string;
    department?: string;
    experienceLevel?: string;
    requirements?: string[];
    responsibilities?: string[];
    description?: string;
}

export class AssessAIController {
    /**
     * Get AI-powered assessment recommendations
     * POST /api/assess/recommendations
     */
    static async getRecommendations(req: Request, res: Response): Promise<void> {
        try {
            const data: RecommendationRequest = req.body;

            if (!data.title) {
                res.status(400).json({
                    success: false,
                    error: 'Job title is required',
                });
                return;
            }

            // Build context from the job details
            const context = AssessAIController.buildContext(data);

            // Try to get AI recommendations, fallback to rule-based
            let recommendations;
            try {
                recommendations = await AssessAIController.getAIRecommendations(context, data);
            } catch (aiError) {
                console.log('[AssessAIController] AI unavailable, using rule-based recommendations');
                recommendations = AssessAIController.getRuleBasedRecommendations(data);
            }

            res.json({
                success: true,
                data: {
                    packs: ASSESSMENT_PACKS,
                    recommendedPackId: recommendations.recommendedPackId,
                    assessmentTypes: recommendations.assessmentTypes,
                    questionTypes: recommendations.questionTypes,
                    reasoning: recommendations.reasoning,
                },
            });
        } catch (error) {
            console.error('[AssessAIController.getRecommendations] Error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate recommendations',
            });
        }
    }

    /**
     * Build context string from job data
     */
    private static buildContext(data: RecommendationRequest): string {
        const parts = [`Job Title: ${data.title}`];

        if (data.department) parts.push(`Department: ${data.department}`);
        if (data.experienceLevel) parts.push(`Experience Level: ${data.experienceLevel}`);
        if (data.requirements?.length) parts.push(`Requirements: ${data.requirements.join(', ')}`);
        if (data.responsibilities?.length) parts.push(`Responsibilities: ${data.responsibilities.join(', ')}`);
        if (data.description) parts.push(`Description: ${data.description}`);

        return parts.join('\n');
    }

    /**
     * Get AI-powered recommendations using OpenAI
     */
    private static async getAIRecommendations(
        context: string,
        data: RecommendationRequest
    ): Promise<{
        recommendedPackId: string;
        assessmentTypes: string[];
        questionTypes: Array<{ id: string; name: string; recommended: boolean; reason?: string }>;
        reasoning: string;
    }> {
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            throw new Error('OpenAI not configured');
        }

        const openai = new OpenAI({ apiKey: openaiKey });

        const prompt = `Based on the following job details, recommend assessment strategies:

${context}

Please provide:
1. Which assessment pack (basic=1 assessment, standard=2 assessments, comprehensive=3 assessments) is most suitable
2. What types of assessments would be most relevant (e.g., cognitive ability, personality, technical skills, etc.)
3. Which question types would be most effective: Multiple Choice, Multiple Select, Short Answer, Long Answer, Code Challenge
4. Brief reasoning for your recommendations

Respond in JSON format:
{
  "packLevel": "basic" | "standard" | "comprehensive",
  "assessmentTypes": ["type1", "type2"],
  "questionTypes": [{"type": "Multiple Choice", "recommended": true, "reason": "..."}],
  "reasoning": "..."
}`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an HR assessment expert. Provide concise, practical recommendations for candidate assessment strategies.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 500,
        });

        const content = response.choices[0]?.message?.content || '';

        try {
            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    recommendedPackId: `pack-${parsed.packLevel || 'standard'}`,
                    assessmentTypes: parsed.assessmentTypes || ['Cognitive Ability', 'Job-Specific Skills'],
                    questionTypes: QUESTION_TYPES.map(qt => ({
                        ...qt,
                        recommended: parsed.questionTypes?.some((pqt: any) =>
                            pqt.type?.toLowerCase().includes(qt.name.toLowerCase()) && pqt.recommended
                        ) || false,
                        reason: parsed.questionTypes?.find((pqt: any) =>
                            pqt.type?.toLowerCase().includes(qt.name.toLowerCase())
                        )?.reason,
                    })),
                    reasoning: parsed.reasoning || 'AI-generated recommendation based on job requirements.',
                };
            }
        } catch (parseError) {
            console.error('[AssessAIController] Failed to parse AI response:', parseError);
        }

        // Fallback if parsing fails
        return AssessAIController.getRuleBasedRecommendations(data);
    }

    /**
     * Rule-based fallback recommendations
     */
    private static getRuleBasedRecommendations(data: RecommendationRequest): {
        recommendedPackId: string;
        assessmentTypes: string[];
        questionTypes: Array<{ id: string; name: string; description: string; recommended: boolean; reason?: string }>;
        reasoning: string;
    } {
        const titleLower = data.title.toLowerCase();
        const isTechnical = ['developer', 'engineer', 'programmer', 'software', 'data', 'devops', 'architect']
            .some(k => titleLower.includes(k));
        const isLeadership = ['manager', 'lead', 'director', 'head', 'vp', 'chief', 'executive']
            .some(k => titleLower.includes(k));
        const isSales = ['sales', 'account', 'business development', 'bdr', 'sdr']
            .some(k => titleLower.includes(k));
        const isSenior = data.experienceLevel?.toLowerCase().includes('senior') ||
            data.experienceLevel?.toLowerCase().includes('manager') ||
            data.experienceLevel?.toLowerCase().includes('executive');

        // Determine pack
        let recommendedPackId = 'pack-standard';
        if (isSenior || isLeadership) {
            recommendedPackId = 'pack-comprehensive';
        } else if (data.experienceLevel?.toLowerCase().includes('entry')) {
            recommendedPackId = 'pack-basic';
        }

        // Determine assessment types
        const assessmentTypes: string[] = ['Cognitive Ability'];
        if (isTechnical) assessmentTypes.push('Technical Skills', 'Problem Solving');
        if (isLeadership) assessmentTypes.push('Leadership Assessment', 'Emotional Intelligence');
        if (isSales) assessmentTypes.push('Sales Aptitude', 'Communication Skills');
        assessmentTypes.push('Workplace Personality');

        // Determine question types
        const questionTypes = QUESTION_TYPES.map(qt => ({
            ...qt,
            recommended: false as boolean,
            reason: undefined as string | undefined,
        }));

        // Multiple Choice - always recommended
        const mcIndex = questionTypes.findIndex(qt => qt.id === 'multiple-choice');
        if (mcIndex >= 0) {
            questionTypes[mcIndex].recommended = true;
            questionTypes[mcIndex].reason = 'Quick to administer and evaluate, good for knowledge testing';
        }

        // Code Challenge for technical roles
        if (isTechnical) {
            const ccIndex = questionTypes.findIndex(qt => qt.id === 'code-challenge');
            if (ccIndex >= 0) {
                questionTypes[ccIndex].recommended = true;
                questionTypes[ccIndex].reason = 'Essential for evaluating technical skills and problem-solving';
            }
        }

        // Long Answer for leadership/senior roles
        if (isLeadership || isSenior) {
            const laIndex = questionTypes.findIndex(qt => qt.id === 'long-answer');
            if (laIndex >= 0) {
                questionTypes[laIndex].recommended = true;
                questionTypes[laIndex].reason = 'Evaluates communication skills and strategic thinking';
            }
        }

        // Multiple Select for complex evaluation
        if (recommendedPackId === 'pack-comprehensive') {
            const msIndex = questionTypes.findIndex(qt => qt.id === 'multiple-select');
            if (msIndex >= 0) {
                questionTypes[msIndex].recommended = true;
                questionTypes[msIndex].reason = 'Tests nuanced understanding of complex topics';
            }
        }

        const reasoning = isTechnical
            ? `For ${data.title}, we recommend technical skill assessments with coding challenges to evaluate problem-solving abilities.`
            : isLeadership
                ? `For ${data.title}, we recommend comprehensive assessments focusing on leadership qualities and strategic thinking.`
                : isSales
                    ? `For ${data.title}, we recommend assessments focusing on communication and sales aptitude.`
                    : `For ${data.title}, we recommend a balanced assessment approach covering cognitive ability and role-specific skills.`;

        return {
            recommendedPackId,
            assessmentTypes,
            questionTypes,
            reasoning,
        };
    }
}
