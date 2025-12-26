/**
 * Candidate Scoring Service
 * Uses OpenAI to comprehensively score candidates against job requirements
 */

import OpenAI from 'openai';
import { JobModel } from '../../models/Job';
import { ApplicationModel } from '../../models/Application';
import { DocumentParserService } from '../document/DocumentParserService';

export interface CandidateScoringRequest {
  applicationId: string;
  jobId: string;
}

export interface CandidateScoringResult {
  scores: {
    skills: number;
    experience: number;
    education: number;
    interview: number;
    culture: number;
    overall: number;
  };
  strengths: string[];
  concerns: string[];
  recommendation: 'strong_hire' | 'hire' | 'maybe' | 'no_hire' | 'strong_no_hire';
  justification: string;
  improvementAreas: string[];
  detailedAnalysis: {
    skillsAnalysis: string;
    experienceAnalysis: string;
    educationAnalysis: string;
    culturalFitAnalysis: string;
    overallAssessment: string;
  };
  // Enhanced AI Insights
  summary: string;
  behavioralTraits: string[];
  communicationStyle: string;
  careerTrajectory: string;
  flightRisk: {
    level: 'Low' | 'Medium' | 'High';
    reason: string;
  };
  salaryBenchmark: {
    position: 'Below' | 'Within' | 'Above';
    marketRange: string;
  };
  culturalFit: {
    score: number;
    analysis: string;
    valuesMatched: string[];
  };
  analyzedAt: string;
}

export class CandidateScoringService {
  /**
   * Score a single candidate comprehensively using OpenAI
   */
  static async scoreCandidate(request: CandidateScoringRequest): Promise<CandidateScoringResult> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    try {
      // Fetch application with all relations
      const application = await ApplicationModel.findById(request.applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Job is already included in application from findById, but fetch separately to ensure we have all fields
      const job = await JobModel.findById(request.jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Candidate is already included in application from findById
      if (!application.candidate) {
        throw new Error('Candidate data not found in application');
      }
      const candidate = application.candidate;

      // Extract resume text if available
      let resumeText: string | undefined;
      if (application.resumeUrl) {
        // Skip mock URLs - these are placeholders and can't be fetched
        if (application.resumeUrl.startsWith('mock://') || application.resumeUrl.startsWith('mock:')) {
          console.log(`ℹ️ Skipping mock resume URL: ${application.resumeUrl}`);
        } else if (!application.resumeUrl.startsWith('http://') && !application.resumeUrl.startsWith('https://') && !application.resumeUrl.startsWith('data:')) {
          console.log(`ℹ️ Skipping invalid resume URL scheme: ${application.resumeUrl}`);
        } else {
          try {
            // Fetch resume file
            const response = await fetch(application.resumeUrl);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const contentType = response.headers.get('content-type') || 'application/pdf';
              
              // Determine file type
              let mimetype = contentType;
              if (application.resumeUrl.toLowerCase().endsWith('.pdf')) {
                mimetype = 'application/pdf';
              } else if (application.resumeUrl.toLowerCase().endsWith('.docx') || application.resumeUrl.toLowerCase().endsWith('.doc')) {
                mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
              } else if (application.resumeUrl.toLowerCase().endsWith('.txt')) {
                mimetype = 'text/plain';
              }

              // Parse document based on type
              let parsed;
              if (mimetype === 'application/pdf') {
                parsed = await DocumentParserService.parsePDF(buffer);
              } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimetype === 'application/msword') {
                parsed = await DocumentParserService.parseDOCX(buffer);
              } else if (mimetype === 'text/plain') {
                parsed = await DocumentParserService.parseTXT(buffer);
              } else {
                // Try PDF as fallback
                parsed = await DocumentParserService.parsePDF(buffer);
              }
              resumeText = parsed.text;
              console.log(`✅ Extracted ${resumeText.length} characters from resume`);
            }
          } catch (error) {
            console.warn('⚠️ Failed to extract resume text:', error);
            // Continue without resume text
          }
        }
      }

      // Build job details string
      const jobDetails = this.buildJobDetailsString(job);

      // Build candidate details string
      const candidateDetails = this.buildCandidateDetailsString(
        application,
        candidate,
        resumeText
      );

      // Initialize OpenAI
      const openai = new OpenAI({ apiKey });

      const systemPrompt = `You are an expert HR recruiter and talent acquisition specialist with deep expertise in candidate evaluation. Your role is to provide comprehensive, objective, and data-driven analysis of candidates.

Analyze candidates based on:
1. **Skills Match**: Technical and soft skills alignment with job requirements
2. **Experience Relevance**: Depth and relevance of work experience
3. **Education Background**: Educational qualifications and certifications
4. **Interview Performance**: If interview feedback is available
5. **Cultural Fit**: Alignment with company values and team dynamics
6. **Behavioral Profile**: Psychological traits, communication style, and potential team dynamics
7. **Retention Risk**: Likelihood of the candidate staying long-term based on history
8. **Market Value**: Estimated compensation alignment

Provide detailed analysis with specific examples and evidence from the candidate's profile.`;

      const userPrompt = `Analyze this candidate for the following position:

${jobDetails}

---

**CANDIDATE PROFILE:**

${candidateDetails}

---

**ANALYSIS REQUIREMENTS:**

Provide a comprehensive analysis including:

1. **Individual Scores (0-100 scale)** for:
   - Skills Match
   - Experience Relevance
   - Education Background
   - Interview Performance (if available, otherwise use 0)
   - Cultural Fit
   - Overall Weighted Score

2. **Strengths** (3-5 specific points with evidence)

3. **Concerns/Gaps** (3-5 specific points with evidence)

4. **Hiring Recommendation** (strong_hire, hire, maybe, no_hire, strong_no_hire)

5. **Detailed Justification** (2-3 paragraphs explaining the recommendation)

6. **Improvement Areas** (specific areas the candidate could improve)

7. **Detailed Analysis Sections**:
   - Skills Analysis: Detailed breakdown of skills match
   - Experience Analysis: Detailed assessment of work experience
   - Education Analysis: Assessment of educational background
   - Cultural Fit Analysis: Assessment of cultural alignment
   - Overall Assessment: Comprehensive summary

8. **Enhanced Insights**:
   - **Executive Summary**: A concise 2-3 sentence bio of the candidate.
   - **Behavioral Traits**: List 3-5 key personality traits (e.g., "Leadership", "Analytical").
   - **Communication Style**: Describe how they communicate (e.g., "Direct", "Collaborative").
   - **Career Trajectory**: Describe their growth pattern (e.g., "Fast-tracked", "Stable").
   - **Flight Risk**: Assess risk (Low/Medium/High) and provide a reason based on tenure history.
   - **Salary Benchmark**: Estimate if they are Below/Within/Above market rate for this role.
   - **Cultural Fit Detail**: Score (0-100) and list specific company values they match.

Be specific, objective, and provide actionable insights.`;

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'provide_comprehensive_candidate_score',
              description: 'Provide comprehensive candidate scoring and detailed analysis',
              parameters: {
                type: 'object',
                properties: {
                  scores: {
                    type: 'object',
                    properties: {
                      skills: { type: 'number', minimum: 0, maximum: 100 },
                      experience: { type: 'number', minimum: 0, maximum: 100 },
                      education: { type: 'number', minimum: 0, maximum: 100 },
                      interview: { type: 'number', minimum: 0, maximum: 100 },
                      culture: { type: 'number', minimum: 0, maximum: 100 },
                      overall: { type: 'number', minimum: 0, maximum: 100 },
                    },
                    required: ['skills', 'experience', 'education', 'interview', 'culture', 'overall'],
                  },
                  strengths: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 3,
                    maxItems: 5,
                  },
                  concerns: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 3,
                    maxItems: 5,
                  },
                  recommendation: {
                    type: 'string',
                    enum: ['strong_hire', 'hire', 'maybe', 'no_hire', 'strong_no_hire'],
                  },
                  justification: { type: 'string' },
                  improvementAreas: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  detailedAnalysis: {
                    type: 'object',
                    properties: {
                      skillsAnalysis: { type: 'string' },
                      experienceAnalysis: { type: 'string' },
                      educationAnalysis: { type: 'string' },
                      culturalFitAnalysis: { type: 'string' },
                      overallAssessment: { type: 'string' },
                    },
                    required: ['skillsAnalysis', 'experienceAnalysis', 'educationAnalysis', 'culturalFitAnalysis', 'overallAssessment'],
                  },
                  summary: { type: 'string' },
                  behavioralTraits: { 
                    type: 'array',
                    items: { type: 'string' }
                  },
                  communicationStyle: { type: 'string' },
                  careerTrajectory: { type: 'string' },
                  flightRisk: {
                    type: 'object',
                    properties: {
                      level: { type: 'string', enum: ['Low', 'Medium', 'High'] },
                      reason: { type: 'string' }
                    },
                    required: ['level', 'reason']
                  },
                  salaryBenchmark: {
                    type: 'object',
                    properties: {
                      position: { type: 'string', enum: ['Below', 'Within', 'Above'] },
                      marketRange: { type: 'string' }
                    },
                    required: ['position', 'marketRange']
                  },
                  culturalFit: {
                    type: 'object',
                    properties: {
                      score: { type: 'number', minimum: 0, maximum: 100 },
                      analysis: { type: 'string' },
                      valuesMatched: { 
                        type: 'array',
                        items: { type: 'string' }
                      }
                    },
                    required: ['score', 'analysis', 'valuesMatched']
                  }
                },
                required: ['scores', 'strengths', 'concerns', 'recommendation', 'justification', 'improvementAreas', 'detailedAnalysis', 'summary', 'behavioralTraits', 'communicationStyle', 'careerTrajectory', 'flightRisk', 'salaryBenchmark', 'culturalFit'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'provide_comprehensive_candidate_score' } },
        temperature: 0.7,
        max_tokens: 4000,
      });

      const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        throw new Error('No tool call in OpenAI response');
      }

      // Type guard to check if it's a function tool call
      if (toolCall.type !== 'function') {
        throw new Error('Tool call is not a function call');
      }

      // Cast to the function tool call type to access the function property
      // The OpenAI SDK uses a union type, so we need to assert the specific type
      const functionCall = toolCall as {
        type: 'function';
        id: string;
        function: {
          name: string;
          arguments: string;
        };
      };
      
      if (!functionCall.function?.arguments) {
        throw new Error('Function call missing arguments');
      }

      const result = JSON.parse(functionCall.function.arguments);

      return {
        ...result,
        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Candidate scoring error:', error);
      throw error;
    }
  }

  /**
   * Build comprehensive job details string
   */
  private static buildJobDetailsString(job: any): string {
    const parts: string[] = [];

    parts.push(`**Job Title:** ${job.title}`);
    if (job.department) parts.push(`**Department:** ${job.department}`);
    if (job.location) parts.push(`**Location:** ${job.location}`);
    if (job.workArrangement) parts.push(`**Work Arrangement:** ${job.workArrangement}`);
    if (job.employmentType) parts.push(`**Employment Type:** ${job.employmentType}`);
    if (job.experienceLevel) parts.push(`**Experience Level:** ${job.experienceLevel}`);
    if (job.numberOfVacancies) parts.push(`**Number of Vacancies:** ${job.numberOfVacancies}`);

    if (job.salaryMin || job.salaryMax) {
      const salary = [];
      if (job.salaryMin) salary.push(`${job.salaryCurrency || 'USD'} ${job.salaryMin}`);
      if (job.salaryMax) salary.push(`${job.salaryCurrency || 'USD'} ${job.salaryMax}`);
      parts.push(`**Salary Range:** ${salary.join(' - ')} ${job.salaryPeriod || 'annual'}`);
    }
    if (job.salaryDescription) parts.push(`**Salary Description:** ${job.salaryDescription}`);

    if (job.description) parts.push(`\n**Job Description:**\n${job.description}`);
    if (job.requirements && job.requirements.length > 0) {
      parts.push(`\n**Requirements:**\n${job.requirements.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}`);
    }
    if (job.responsibilities && job.responsibilities.length > 0) {
      parts.push(`\n**Responsibilities:**\n${job.responsibilities.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}`);
    }
    if (job.promotionalTags && job.promotionalTags.length > 0) {
      parts.push(`\n**Tags:** ${job.promotionalTags.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Build comprehensive candidate details string
   */
  private static buildCandidateDetailsString(
    application: any,
    candidate: any,
    resumeText?: string
  ): string {
    const parts: string[] = [];

    const candidateName = candidate.firstName && candidate.lastName
      ? `${candidate.firstName} ${candidate.lastName}`
      : candidate.firstName || candidate.email?.split('@')[0] || 'Unknown Candidate';

    parts.push(`**Candidate Name:** ${candidateName}`);
    if (candidate.email) parts.push(`**Email:** ${candidate.email}`);
    if (candidate.phone) parts.push(`**Phone:** ${candidate.phone}`);
    if (application.linkedInUrl) parts.push(`**LinkedIn:** ${application.linkedInUrl}`);
    if (application.portfolioUrl) parts.push(`**Portfolio:** ${application.portfolioUrl}`);

    if (resumeText) {
      parts.push(`\n**Resume/Profile:**\n${resumeText.substring(0, 5000)}`);
    }

    // Extract from questionnaire data
    if (application.questionnaireData) {
      const qData = application.questionnaireData as any;
      if (qData.experience) {
        parts.push(`\n**Experience:**\n${qData.experience}`);
      }
      if (qData.skills && Array.isArray(qData.skills) && qData.skills.length > 0) {
        parts.push(`\n**Skills:**\n${qData.skills.join(', ')}`);
      }
      if (qData.education) {
        parts.push(`\n**Education:**\n${qData.education}`);
      }
    }

    // Extract from custom answers
    if (application.customAnswers) {
      const answers = application.customAnswers as any[];
      if (Array.isArray(answers) && answers.length > 0) {
        const answersText = answers
          .map((a: any) => `Q: ${a.question || 'Question'}\nA: ${a.answer || 'No answer'}`)
          .join('\n\n');
        parts.push(`\n**Custom Application Answers:**\n${answersText}`);
      }
    }

    if (application.recruiterNotes) {
      parts.push(`\n**Recruiter Notes/Interview Feedback:**\n${application.recruiterNotes}`);
    }

    if (application.appliedDate) {
      parts.push(`\n**Applied Date:** ${new Date(application.appliedDate).toLocaleDateString()}`);
    }

    return parts.join('\n');
  }

  /**
   * Bulk score multiple candidates
   */
  static async bulkScoreCandidates(
    applicationIds: string[],
    jobId: string,
    onProgress?: (completed: number, total: number, current: string) => void
  ): Promise<Map<string, { result: CandidateScoringResult; score: number }>> {
    const results = new Map<string, { result: CandidateScoringResult; score: number }>();
    const total = applicationIds.length;

    console.log(`🚀 Starting bulk scoring for ${total} candidates, jobId: ${jobId}`);

    for (let i = 0; i < applicationIds.length; i++) {
      const applicationId = applicationIds[i];
      
      try {
        // Get application to get candidate name for progress
        const application = await ApplicationModel.findById(applicationId);
        if (!application) {
          console.warn(`⚠️ Application ${applicationId} not found, skipping`);
          continue;
        }

        const candidateName = application.candidate?.firstName && application.candidate?.lastName
          ? `${application.candidate.firstName} ${application.candidate.lastName}`
          : application.candidate?.email?.split('@')[0] || 'Unknown';

        console.log(`📋 Scoring candidate ${i + 1}/${total}: ${candidateName}`);

        if (onProgress) {
          onProgress(i, total, candidateName);
        }

        const result = await this.scoreCandidate({ applicationId, jobId });
        results.set(applicationId, {
          result,
          score: result.scores.overall,
        });
        
        console.log(`✅ Scored ${candidateName}: ${result.scores.overall}/100`);
      } catch (error) {
        console.error(`❌ Failed to score application ${applicationId}:`, error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Continue with next candidate
      }
    }

    if (onProgress) {
      onProgress(total, total, 'Complete');
    }

    console.log(`✅ Bulk scoring complete: ${results.size}/${total} successful`);

    return results;
  }
}

