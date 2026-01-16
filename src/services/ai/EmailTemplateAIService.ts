/**
 * Email Template AI Service
 * Uses OpenAI to generate email templates based on context
 */

import OpenAI from 'openai';
import { EmailTemplateType } from '@prisma/client';
import { JobModel } from '../../models/Job';
import { JobRoundModel } from '../../models/JobRound';
import { ConfigService } from '../../services/config/ConfigService';

export interface GenerateEmailTemplateRequest {
  jobRoundId?: string;
  templateType: EmailTemplateType;
  jobId?: string;
  companyId: string;
  tone?: 'professional' | 'friendly' | 'casual' | 'formal';
  additionalContext?: string;
}

export interface GeneratedEmailTemplate {
  subject: string;
  body: string;
  suggestedVariables: string[];
}

export class EmailTemplateAIService {
  /**
   * Generate email template using OpenAI
   */
  static async generateTemplate(
    request: GenerateEmailTemplateRequest
  ): Promise<GeneratedEmailTemplate> {
    const config = await ConfigService.getOpenAIConfig();
    const apiKey = config.apiKey;

    if (!apiKey) {
      console.log('OpenAI API key not found, falling back to template generation');
      return this.generateWithPattern(request);
    }

    try {
      const openai = new OpenAI({ apiKey });

      // Build context
      const context = await this.buildContext(request);

      // Build prompt
      const prompt = this.buildPrompt(request, context);

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert HR professional and email communication specialist. Generate professional, effective email templates for recruitment and candidate communication. Always use merge field syntax {{variableName}} for dynamic content. Return only valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const generated = JSON.parse(content);
      return {
        subject: generated.subject || '',
        body: generated.body || '',
        suggestedVariables: Array.isArray(generated.suggestedVariables)
          ? generated.suggestedVariables
          : [],
      };
    } catch (error) {
      console.error('OpenAI template generation failed, falling back to pattern generation:', error);
      return this.generateWithPattern(request);
    }
  }

  /**
   * Enhance existing template using AI
   */
  static async enhanceTemplate(
    existingTemplate: { subject: string; body: string },
    instructions: string
  ): Promise<GeneratedEmailTemplate> {
    const config = await ConfigService.getOpenAIConfig();
    const apiKey = config.apiKey;

    if (!apiKey) {
      return existingTemplate as GeneratedEmailTemplate;
    }

    try {
      const openai = new OpenAI({ apiKey });

      const prompt = `You are an expert email communication specialist. Improve the following email template based on the instructions provided.

Current Subject: ${existingTemplate.subject}

Current Body:
${existingTemplate.body}

Instructions: ${instructions}

Please provide an improved version while maintaining the merge field syntax ({{variableName}}). Return JSON with "subject" and "body" fields.`;

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert email communication specialist. Improve email templates while maintaining merge field syntax. Return only valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const generated = JSON.parse(content);
      return {
        subject: generated.subject || existingTemplate.subject,
        body: generated.body || existingTemplate.body,
        suggestedVariables: [],
      };
    } catch (error) {
      console.error('OpenAI template enhancement failed:', error);
      return existingTemplate as GeneratedEmailTemplate;
    }
  }

  /**
   * Build context from job, round, and company data
   */
  private static async buildContext(request: GenerateEmailTemplateRequest): Promise<string> {
    const contextParts: string[] = [];

    // Get company info
    const { CompanyModel } = await import('../../models/Company');
    const company = await CompanyModel.findById(request.companyId);
    if (company) {
      contextParts.push(`Company: ${company.name}`);
      contextParts.push(`Website: ${company.website}`);
    }

    // Get job info
    if (request.jobId) {
      const job = await JobModel.findById(request.jobId);
      if (job) {
        contextParts.push(`Job Title: ${job.title}`);
        contextParts.push(`Location: ${job.location}`);
        contextParts.push(`Department: ${job.department || 'N/A'}`);
        if (job.description) {
          contextParts.push(`Job Description: ${job.description.substring(0, 500)}...`);
        }
      }
    }

    // Get round info
    if (request.jobRoundId) {
      const round = await JobRoundModel.findById(request.jobRoundId);
      if (round) {
        contextParts.push(`Round Name: ${round.name}`);
        contextParts.push(`Round Type: ${round.type}`);
      }
    }

    return contextParts.join('\n');
  }

  /**
   * Build prompt for OpenAI
   */
  private static buildPrompt(
    request: GenerateEmailTemplateRequest,
    context: string
  ): string {
    const tone = request.tone || 'professional';
    const templateTypeDescription = this.getTemplateTypeDescription(request.templateType);

    return `Generate an email template for: ${templateTypeDescription}

Context:
${context}

Requirements:
- Tone: ${tone}
- Use merge field syntax {{variableName}} for dynamic content (e.g., {{candidateName}}, {{jobTitle}}, {{companyName}})
- Subject line should be clear and concise
- Body should be professional, warm, and appropriate for the context
${request.additionalContext ? `- Additional context: ${request.additionalContext}` : ''}

Common merge fields to consider:
- {{candidateName}} - Full name of candidate
- {{candidateFirstName}} - First name only
- {{jobTitle}} - Position title
- {{companyName}} - Company name
- {{jobLocation}} - Job location
- {{applicationDate}} - When they applied
- {{currentStage}} - Current pipeline stage
- {{recruiterName}} - Recruiter's name
- {{recruiterEmail}} - Recruiter's email
- {{roundName}} - Round name (if applicable)

Return JSON with:
- "subject": The email subject line
- "body": The email body (HTML format, can include basic formatting)
- "suggestedVariables": Array of merge field keys used in the template

Example format:
{
  "subject": "Application Received - {{jobTitle}} at {{companyName}}",
  "body": "<p>Dear {{candidateName}},</p><p>Thank you for your interest...</p>",
  "suggestedVariables": ["candidateName", "jobTitle", "companyName"]
}`;
  }

  /**
   * Get description for template type
   */
  private static getTemplateTypeDescription(type: EmailTemplateType): string {
    const descriptions: Record<EmailTemplateType, string> = {
      APPLICATION_CONFIRMATION: 'Application Confirmation - thanking candidate for applying',
      INTERVIEW_INVITATION: 'Interview Invitation - inviting candidate for interview',
      REJECTION: 'Rejection - politely declining candidate',
      OFFER_EXTENDED: 'Offer Extended - extending job offer to candidate',
      OFFER_ACCEPTED: 'Offer Accepted - confirming offer acceptance',
      STAGE_CHANGE: 'Stage Change - notifying candidate of pipeline progress',
      REMINDER: 'Reminder - reminding candidate about next steps',
      FOLLOW_UP: 'Follow-up - following up with candidate',
      CUSTOM: 'Custom - general purpose email',
    };
    return descriptions[type] || type;
  }

  /**
   * Generate template using pattern matching (fallback)
   */
  private static generateWithPattern(
    request: GenerateEmailTemplateRequest
  ): GeneratedEmailTemplate {
    const templateTypeDescription = this.getTemplateTypeDescription(request.templateType);
    const tone = request.tone || 'professional';

    const greeting = tone === 'casual'
      ? 'Hi {{candidateFirstName}},'
      : tone === 'friendly'
        ? 'Hello {{candidateName}},'
        : 'Dear {{candidateName}},';

    const closing = tone === 'casual'
      ? 'Best,\n{{recruiterName}}'
      : tone === 'friendly'
        ? 'Best regards,\n{{recruiterName}}\n{{companyName}}'
        : 'Best regards,\n{{recruiterName}}\n{{companyName}} Recruiting Team';

    let subject = '';
    let body = '';

    switch (request.templateType) {
      case 'APPLICATION_CONFIRMATION':
        subject = 'Application Received - {{jobTitle}} at {{companyName}}';
        body = `${greeting}

Thank you for your interest in the {{jobTitle}} position at {{companyName}}. We have received your application and our team is currently reviewing all submissions.

You can expect to hear back from us within the next few days regarding the next steps.

${closing}`;
        break;
      case 'INTERVIEW_INVITATION':
        subject = 'Interview Invitation - {{jobTitle}} at {{companyName}}';
        body = `${greeting}

We are pleased to invite you for an interview for the {{jobTitle}} position at {{companyName}}.

Your application, submitted on {{applicationDate}}, has impressed our team and we would like to learn more about your experience and qualifications.

Please reply to this email with your availability for the coming week.

${closing}`;
        break;
      case 'REJECTION':
        subject = 'Update on Your Application - {{jobTitle}}';
        body = `${greeting}

Thank you for your interest in the {{jobTitle}} position at {{companyName}} and for taking the time to apply.

After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.

We appreciate your interest in {{companyName}} and wish you the best in your job search.

${closing}`;
        break;
      default:
        subject = `${templateTypeDescription} - {{jobTitle}}`;
        body = `${greeting}

This is regarding your application for the {{jobTitle}} position at {{companyName}}.

${closing}`;
    }

    // Extract suggested variables from body and subject
    const mergeFieldRegex = /\{\{(\w+)\}\}/g;
    const suggestedVariables = new Set<string>();
    let match;
    while ((match = mergeFieldRegex.exec(subject)) !== null) {
      suggestedVariables.add(match[1]);
    }
    while ((match = mergeFieldRegex.exec(body)) !== null) {
      suggestedVariables.add(match[1]);
    }

    return {
      subject,
      body: body.replace(/\n/g, '<br>'),
      suggestedVariables: Array.from(suggestedVariables),
    };
  }
}

