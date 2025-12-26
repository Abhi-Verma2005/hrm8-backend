import { EmailTemplateModel, EmailTemplateData } from '../../models/EmailTemplate';
import { EmailTemplateType } from '@prisma/client';
import { emailService } from './EmailService';

export interface CreateEmailTemplateRequest {
  companyId: string;
  jobId?: string | null;
  jobRoundId?: string | null;
  name: string;
  type: EmailTemplateType;
  subject: string;
  body: string;
  variables?: string[];
  isActive?: boolean;
  isDefault?: boolean;
  isAiGenerated?: boolean;
  createdBy: string;
}

export interface UpdateEmailTemplateRequest {
  name?: string;
  subject?: string;
  body?: string;
  variables?: string[];
  isActive?: boolean;
  isDefault?: boolean;
}

export interface TemplatePreviewRequest {
  templateId: string;
  sampleData?: Record<string, any>;
}

export class EmailTemplateService {
  /**
   * Create a new email template
   */
  static async createTemplate(
    data: CreateEmailTemplateRequest
  ): Promise<EmailTemplateData> {
    return await EmailTemplateModel.create(data);
  }

  /**
   * Get template by ID
   */
  static async getTemplateById(id: string): Promise<EmailTemplateData | null> {
    return await EmailTemplateModel.findById(id);
  }

  /**
   * Get templates by company
   */
  static async getTemplatesByCompany(companyId: string): Promise<EmailTemplateData[]> {
    return await EmailTemplateModel.findByCompanyId(companyId);
  }

  /**
   * Get templates by job
   */
  static async getTemplatesByJob(jobId: string): Promise<EmailTemplateData[]> {
    return await EmailTemplateModel.findByJobId(jobId);
  }

  /**
   * Get templates by job round
   */
  static async getTemplatesByJobRound(jobRoundId: string): Promise<EmailTemplateData[]> {
    return await EmailTemplateModel.findByJobRoundId(jobRoundId);
  }

  /**
   * Get templates by type
   */
  static async getTemplatesByType(
    companyId: string,
    type: EmailTemplateType
  ): Promise<EmailTemplateData[]> {
    return await EmailTemplateModel.findByType(companyId, type);
  }

  /**
   * Update template
   */
  static async updateTemplate(
    id: string,
    data: UpdateEmailTemplateRequest
  ): Promise<EmailTemplateData | null> {
    return await EmailTemplateModel.update(id, data);
  }

  /**
   * Delete template
   */
  static async deleteTemplate(id: string): Promise<boolean> {
    return await EmailTemplateModel.delete(id);
  }

  /**
   * Set template as default
   */
  static async setAsDefault(
    companyId: string,
    type: EmailTemplateType,
    templateId: string
  ): Promise<boolean> {
    return await EmailTemplateModel.setAsDefault(companyId, type, templateId);
  }

  /**
   * Validate template syntax (check for merge field errors)
   */
  static validateTemplate(template: { subject: string; body: string }): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const mergeFieldRegex = /\{\{(\w+)\}\}/g;

    // Check subject
    const subjectMatches = template.subject.match(mergeFieldRegex) || [];
    const subjectFields = subjectMatches.map(m => m.replace(/\{\{|\}\}/g, ''));

    // Check body
    const bodyMatches = template.body.match(mergeFieldRegex) || [];
    const bodyFields = bodyMatches.map(m => m.replace(/\{\{|\}\}/g, ''));

    // Validate merge field syntax (basic validation - no unmatched braces)
    const allFields = [...subjectFields, ...bodyFields];
    const allText = template.subject + template.body;
    
    // Check for unmatched braces
    const openBraces = (allText.match(/\{\{/g) || []).length;
    const closeBraces = (allText.match(/\}\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Unmatched merge field braces detected');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Preview template with sample data
   */
  static async previewTemplate(data: TemplatePreviewRequest): Promise<{
    subject: string;
    body: string;
  }> {
    const template = await EmailTemplateModel.findById(data.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Use provided sample data or generate default sample data
    const sampleVariables = data.sampleData || {
      candidateName: 'John Doe',
      candidateFirstName: 'John',
      candidateLastName: 'Doe',
      candidateEmail: 'john.doe@example.com',
      candidatePhone: '+1 555-0123',
      jobTitle: 'Senior Software Engineer',
      companyName: 'Acme Corporation',
      jobLocation: 'San Francisco, CA',
      jobDepartment: 'Engineering',
      applicationDate: new Date().toLocaleDateString(),
      currentStage: 'Phone Screen',
      applicationStatus: 'SCREENING',
      recruiterName: 'Jane Smith',
      recruiterEmail: 'jane.smith@acme.com',
      roundName: 'Technical Interview',
      roundType: 'INTERVIEW',
    };

    const subject = emailService.renderTemplate(template.subject, sampleVariables);
    const body = emailService.renderTemplate(template.body, sampleVariables);

    return { subject, body };
  }

  /**
   * Get available merge field variables
   */
  static getAvailableVariables(): Array<{
    key: string;
    label: string;
    description: string;
    example: string;
    category: string;
  }> {
    return [
      // Candidate fields
      { key: 'candidateName', label: 'Candidate Name', description: 'Full name of the candidate', example: 'John Doe', category: 'Candidate' },
      { key: 'candidateFirstName', label: 'First Name', description: 'First name only', example: 'John', category: 'Candidate' },
      { key: 'candidateLastName', label: 'Last Name', description: 'Last name only', example: 'Doe', category: 'Candidate' },
      { key: 'candidateEmail', label: 'Email', description: 'Candidate email address', example: 'john@example.com', category: 'Candidate' },
      { key: 'candidatePhone', label: 'Phone', description: 'Candidate phone number', example: '+1 555-0123', category: 'Candidate' },
      
      // Application fields
      { key: 'applicationDate', label: 'Application Date', description: 'When they applied', example: 'January 1, 2025', category: 'Application' },
      { key: 'currentStage', label: 'Current Stage', description: 'Current pipeline stage', example: 'Technical Interview', category: 'Application' },
      { key: 'applicationStatus', label: 'Application Status', description: 'Current status', example: 'SCREENING', category: 'Application' },
      { key: 'score', label: 'Score', description: 'Application score', example: '85', category: 'Application' },
      { key: 'rank', label: 'Rank', description: 'Application rank', example: '1', category: 'Application' },
      
      // Job fields
      { key: 'jobTitle', label: 'Job Title', description: 'Position title', example: 'Senior Software Engineer', category: 'Job' },
      { key: 'companyName', label: 'Company Name', description: 'Your company name', example: 'Acme Corp', category: 'Job' },
      { key: 'jobLocation', label: 'Job Location', description: 'Job location', example: 'San Francisco, CA', category: 'Job' },
      { key: 'jobDepartment', label: 'Job Department', description: 'Job department', example: 'Engineering', category: 'Job' },
      
      // Round fields
      { key: 'roundName', label: 'Round Name', description: 'Round name', example: 'Technical Interview', category: 'Round' },
      { key: 'roundType', label: 'Round Type', description: 'Round type', example: 'INTERVIEW', category: 'Round' },
      
      // Recruiter fields
      { key: 'recruiterName', label: 'Recruiter Name', description: 'Your name', example: 'Jane Smith', category: 'Recruiter' },
      { key: 'recruiterEmail', label: 'Recruiter Email', description: 'Your email', example: 'jane@acme.com', category: 'Recruiter' },
    ];
  }
}

