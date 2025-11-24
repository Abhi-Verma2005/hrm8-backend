/**
 * Job Description Generator Service
 * Generates job descriptions using AI based on ALL available form fields
 */

export interface JobDescriptionGenerationRequest {
  // From Step 1
  title: string; // Required
  numberOfVacancies?: number;
  department?: string;
  location?: string;
  employmentType?: 'full-time' | 'part-time' | 'contract' | 'casual';
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  workArrangement?: 'on-site' | 'remote' | 'hybrid';
  tags?: string[];
  serviceType?: 'self-managed' | 'shortlisting' | 'full-service' | 'executive-search' | 'rpo';
  
  // From Step 2 (if partially filled, use as context)
  existingDescription?: string;
  existingRequirements?: string[];
  existingResponsibilities?: string[];
  
  // From Step 3 (if available)
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'annual';
  salaryDescription?: string;
  hideSalary?: boolean;
  closeDate?: string;
  visibility?: 'public' | 'private';
  stealth?: boolean;
  
  // Additional context user can provide
  additionalContext?: string;
}

export interface GeneratedJobDescription {
  description: string;
  requirements: string[];
  responsibilities: string[];
}

export class JobDescriptionGeneratorService {
  /**
   * Generate job description using OpenAI with ALL available context
   */
  static async generateWithAI(request: JobDescriptionGenerationRequest): Promise<GeneratedJobDescription> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.log('OpenAI API key not found, falling back to pattern generation');
      return this.generateWithPattern(request);
    }

    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey });

      // Build comprehensive prompt with ALL available information
      const prompt = this.buildPrompt(request);

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert HR professional and job description writer. Generate professional, compelling job descriptions that attract top talent. Use ALL provided context to create a tailored, accurate description. Always return valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2500,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const generated = JSON.parse(content);
      return {
        description: generated.description || '',
        requirements: Array.isArray(generated.requirements) ? generated.requirements : [],
        responsibilities: Array.isArray(generated.responsibilities) ? generated.responsibilities : [],
      };
    } catch (error) {
      console.error('OpenAI generation failed, falling back to pattern generation:', error);
      return this.generateWithPattern(request);
    }
  }

  /**
   * Build comprehensive prompt using ALL available form fields
   */
  private static buildPrompt(request: JobDescriptionGenerationRequest): string {
    const parts: string[] = [];
    
    parts.push(`Generate a comprehensive job description for the following position:\n\n`);
    
    // Core Information (Step 1)
    parts.push(`**Job Title:** ${request.title}`);
    if (request.department) parts.push(`**Department:** ${request.department}`);
    if (request.location) parts.push(`**Location:** ${request.location}`);
    if (request.employmentType) parts.push(`**Employment Type:** ${request.employmentType}`);
    if (request.experienceLevel) parts.push(`**Experience Level:** ${request.experienceLevel}`);
    if (request.workArrangement) parts.push(`**Work Arrangement:** ${request.workArrangement}`);
    if (request.numberOfVacancies && request.numberOfVacancies > 1) {
      parts.push(`**Number of Vacancies:** ${request.numberOfVacancies}`);
    }
    if (request.tags && request.tags.length > 0) {
      parts.push(`**Tags:** ${request.tags.join(', ')}`);
    }
    if (request.serviceType) {
      const serviceTypeNames: Record<string, string> = {
        'self-managed': 'Self-Managed',
        'shortlisting': 'Shortlisting Service',
        'full-service': 'Full Recruitment Service',
        'executive-search': 'Executive Search',
        'rpo': 'Recruitment Process Outsourcing',
      };
      parts.push(`**Service Type:** ${serviceTypeNames[request.serviceType] || request.serviceType}`);
    }
    
    // Compensation Information (Step 3, if available)
    if (request.salaryMin || request.salaryMax) {
      parts.push(`\n**Compensation:**`);
      if (!request.hideSalary) {
        if (request.salaryMin && request.salaryMax) {
          parts.push(`Salary Range: ${request.salaryMin} - ${request.salaryMax} ${request.salaryCurrency || 'USD'} ${request.salaryPeriod || 'per year'}`);
        } else if (request.salaryMin) {
          parts.push(`Minimum Salary: ${request.salaryMin} ${request.salaryCurrency || 'USD'} ${request.salaryPeriod || 'per year'}`);
        } else if (request.salaryMax) {
          parts.push(`Maximum Salary: ${request.salaryMax} ${request.salaryCurrency || 'USD'} ${request.salaryPeriod || 'per year'}`);
        }
      } else {
        parts.push(`Salary: Not disclosed`);
      }
      if (request.salaryDescription) {
        parts.push(`Salary Details: ${request.salaryDescription}`);
      }
    }
    
    // Existing Content (Step 2, if partially filled - use as context/guidance)
    if (request.existingDescription) {
      parts.push(`\n**Existing Description (use as reference/guidance):**\n${request.existingDescription.substring(0, 500)}`);
    }
    if (request.existingRequirements && request.existingRequirements.length > 0) {
      parts.push(`\n**Existing Requirements (build upon these):**\n${request.existingRequirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}`);
    }
    if (request.existingResponsibilities && request.existingResponsibilities.length > 0) {
      parts.push(`\n**Existing Responsibilities (build upon these):**\n${request.existingResponsibilities.map((r, i) => `${i + 1}. ${r}`).join('\n')}`);
    }
    
    // Additional Context
    if (request.additionalContext) {
      parts.push(`\n**Additional Context/Notes:**\n${request.additionalContext}`);
    }
    
    // Instructions
    parts.push(`\n\nPlease generate:`);
    parts.push(`1. A compelling 2-3 paragraph job description that highlights the role, team, company culture, and what makes this opportunity unique`);
    parts.push(`2. 5-8 key requirements/qualifications (as an array of strings)`);
    parts.push(`3. 5-8 key responsibilities (as an array of strings)`);
    
    parts.push(`\n**Important Guidelines:**`);
    parts.push(`- If existing description/requirements/responsibilities are provided, enhance and expand upon them`);
    parts.push(`- Make the description specific to the role, department, and experience level`);
    parts.push(`- Include information about work arrangement (remote/hybrid/on-site) naturally in the description`);
    parts.push(`- If salary information is provided, mention it appropriately (or note if not disclosed)`);
    parts.push(`- Use professional but engaging language`);
    parts.push(`- Make it appealing to candidates at the specified experience level`);
    
    parts.push(`\nReturn ONLY a JSON object with this structure:`);
    parts.push(`{`);
    parts.push(`  "description": "2-3 paragraph job description text",`);
    parts.push(`  "requirements": ["requirement 1", "requirement 2", ...],`);
    parts.push(`  "responsibilities": ["responsibility 1", "responsibility 2", ...]`);
    parts.push(`}`);
    parts.push(`\nNo markdown formatting, no code blocks, just valid JSON.`);
    
    return parts.join('\n');
  }

  /**
   * Generate job description using pattern matching (fallback)
   */
  static generateWithPattern(request: JobDescriptionGenerationRequest): GeneratedJobDescription {
    const experienceYears = {
      'entry': '1-2',
      'mid': '3-5',
      'senior': '5-8',
      'executive': '10+',
    }[request.experienceLevel || 'mid'] || '3-5';

    const workArrangementText = {
      'on-site': 'on-site',
      'remote': 'remote',
      'hybrid': 'hybrid (combination of remote and on-site)',
    }[request.workArrangement || 'on-site'] || 'on-site';

    const description = `We are seeking a talented ${request.title} to join our ${request.department || 'team'}. This is an exciting opportunity to work on cutting-edge projects and make a real impact. You'll collaborate with cross-functional teams to deliver high-quality solutions that drive our business forward.

Our ideal candidate is passionate about technology, has a strong problem-solving mindset, and thrives in a fast-paced environment. This is a ${workArrangementText} position${request.location ? ` based in ${request.location}` : ''}. We offer competitive compensation, comprehensive benefits, and opportunities for professional growth.`;

    const requirements = [
      `${experienceYears} years of relevant experience`,
      'Strong technical skills and problem-solving abilities',
      'Excellent communication and collaboration skills',
      'Bachelor\'s degree in relevant field or equivalent experience',
      'Proven track record of delivering high-quality work',
    ];

    const responsibilities = [
      'Design and implement solutions that meet business requirements',
      'Collaborate with team members and stakeholders',
      'Participate in code reviews and technical discussions',
      'Contribute to continuous improvement initiatives',
      'Mentor junior team members and share knowledge',
    ];

    return { description, requirements, responsibilities };
  }
}

