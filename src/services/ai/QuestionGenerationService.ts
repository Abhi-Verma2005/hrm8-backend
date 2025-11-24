/**
 * Question Generation Service
 * Uses AI to generate application form questions based on job description and user notes
 */

import OpenAI from 'openai';

export interface QuestionGenerationRequest {
  jobTitle: string;
  jobDescription: string;
  requirements: string[];
  responsibilities: string[];
  userNotes?: string;
  questionCount?: number;
}

export interface GeneratedQuestion {
  type: 'short_text' | 'long_text' | 'multiple_choice' | 'checkbox' | 'dropdown' | 'file_upload';
  label: string;
  description?: string;
  required: boolean;
  options?: Array<{ id: string; label: string; value: string }>;
  category?: string; // e.g., 'motivation', 'experience', 'skills', 'culture_fit'
}

export class QuestionGenerationService {
  /**
   * Generate questions using OpenAI API
   */
  static async generateWithAI(request: QuestionGenerationRequest): Promise<GeneratedQuestion[]> {
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      console.log('⚠️ OpenAI API key not found, falling back to pattern matching');
      return this.generateWithPatternMatching(request);
    }

    try {
      const openai = new OpenAI({ apiKey: openaiApiKey });

      const prompt = this.buildPrompt(request);

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert HR recruiter who creates effective application form questions. Generate relevant, professional questions that help assess candidates for job positions. Return only valid JSON array of question objects.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      const questions = parsed.questions || parsed;

      // Validate and format questions
      return this.validateAndFormatQuestions(questions, request.questionCount || 8);
    } catch (error) {
      console.error('❌ OpenAI question generation failed:', error);
      console.log('🔄 Falling back to pattern matching');
      return this.generateWithPatternMatching(request);
    }
  }

  /**
   * Build the prompt for OpenAI
   */
  private static buildPrompt(request: QuestionGenerationRequest): string {
    const { jobTitle, jobDescription, requirements, responsibilities, userNotes, questionCount = 8 } = request;

    let prompt = `Generate ${questionCount} application form questions for the following job posting:\n\n`;
    prompt += `Job Title: ${jobTitle}\n\n`;
    prompt += `Job Description:\n${jobDescription}\n\n`;

    if (requirements.length > 0) {
      prompt += `Requirements:\n${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n`;
    }

    if (responsibilities.length > 0) {
      prompt += `Responsibilities:\n${responsibilities.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n`;
    }

    if (userNotes && userNotes.trim()) {
      prompt += `Additional Instructions:\n${userNotes}\n\n`;
    }

    prompt += `Generate questions that assess:
- Role-specific skills and experience
- Cultural fit and motivation
- Problem-solving approach
- Relevant work experience
- Communication and collaboration abilities

Return a JSON object with this structure:
{
  "questions": [
    {
      "type": "short_text" | "long_text" | "multiple_choice" | "checkbox" | "dropdown" | "file_upload",
      "label": "Question text",
      "description": "Optional helpful context",
      "required": true | false,
      "options": [{"id": "opt1", "label": "Option 1", "value": "option_1"}], // Only for multiple_choice, checkbox, dropdown
      "category": "motivation" | "experience" | "skills" | "culture_fit" | "problem_solving"
    }
  ]
}

Important:
- Use appropriate question types: short_text (short answer), long_text (long answer), multiple_choice (single select), checkbox (multi-select), dropdown (dropdown selection), or file_upload (for certifications/licenses)
- Use multiple_choice/dropdown for questions with specific answer options
- Include 2-5 options for multiple_choice, checkbox, and dropdown types
- Make questions specific to this role
- Vary question types for better data collection
- Include at least 2-3 questions that assess motivation and cultural fit`;

    return prompt;
  }

  /**
   * Validate and format questions from AI response
   */
  private static validateAndFormatQuestions(questions: any[], maxCount: number): GeneratedQuestion[] {
    const validTypes = [
      'short_text', 'long_text', 'multiple_choice', 'checkbox', 'dropdown', 'file_upload'
    ];

    const needsOptions = ['multiple_choice', 'checkbox', 'dropdown'];

    return questions
      .slice(0, maxCount)
      .map((q, index) => {
        // Validate type
        const type = validTypes.includes(q.type) ? q.type : 'short_text';

        // Ensure options exist for types that need them
        let options = q.options;
        if (needsOptions.includes(type)) {
          if (!options || !Array.isArray(options) || options.length < 2) {
            // Generate default options if missing
            options = [
              { id: `opt1`, label: 'Option 1', value: 'option_1' },
              { id: `opt2`, label: 'Option 2', value: 'option_2' },
            ];
          }
        } else {
          options = undefined;
        }

        return {
          type: type as GeneratedQuestion['type'],
          label: q.label || `Question ${index + 1}`,
          description: q.description || undefined,
          required: typeof q.required === 'boolean' ? q.required : true,
          options: options?.map((opt: any, optIndex: number) => ({
            id: opt.id || `opt-${index}-${optIndex}`,
            label: opt.label || opt,
            value: opt.value || opt.label?.toLowerCase().replace(/\s+/g, '_') || `option_${optIndex + 1}`,
          })),
          category: q.category || undefined,
        };
      })
      .filter((q) => q.label && q.label.trim().length > 0);
  }

  /**
   * Generate questions using pattern matching (fallback)
   */
  static generateWithPatternMatching(request: QuestionGenerationRequest): GeneratedQuestion[] {
    const { jobTitle, jobDescription, requirements, userNotes, questionCount = 8 } = request;

    const questions: GeneratedQuestion[] = [];

    // 1. Motivation question
    questions.push({
      type: 'long_text',
      label: `Why are you interested in the ${jobTitle} position?`,
      description: 'Please share what motivates you about this role and our company.',
      required: true,
      category: 'motivation',
    });

    // 2. Relevant experience
    questions.push({
      type: 'long_text',
      label: 'Describe your most relevant experience for this role.',
      description: 'Highlight specific projects, achievements, or responsibilities that align with this position.',
      required: true,
      category: 'experience',
    });

    // 3. Skills assessment (if requirements exist)
    if (requirements.length > 0) {
      const topRequirement = requirements[0];
      questions.push({
        type: 'long_text',
        label: `How do your skills and experience align with the requirement: "${topRequirement}"?`,
        required: true,
        category: 'skills',
      });
    }

    // 4. Problem-solving
    questions.push({
      type: 'long_text',
      label: 'Describe a challenging problem you solved in a previous role. What was your approach?',
      description: 'This helps us understand your problem-solving methodology.',
      required: false,
      category: 'problem_solving',
    });

    // 5. Teamwork/Collaboration
    questions.push({
      type: 'long_text',
      label: 'Tell us about a time you worked effectively in a team. What was your contribution?',
      required: false,
      category: 'culture_fit',
    });

    // 6. Years of experience (if mentioned in description)
    const experienceMatch = jobDescription.match(/(\d+)\+?\s*years?\s*(?:of\s*)?experience/i);
    if (experienceMatch) {
      questions.push({
        type: 'short_text',
        label: 'How many years of relevant experience do you have?',
        required: true,
        category: 'experience',
      });
    }

    // 7. Availability/Start date
    questions.push({
      type: 'short_text',
      label: 'What is your earliest available start date?',
      required: false,
      category: 'logistics',
    });

    // 8. Salary expectations (if not mentioned in job)
    if (!jobDescription.toLowerCase().includes('salary') && !jobDescription.toLowerCase().includes('compensation')) {
      questions.push({
        type: 'short_text',
        label: 'What are your salary expectations?',
        description: 'Please provide a range or specific amount.',
        required: false,
        category: 'logistics',
      });
    }

    // 9. Location/Remote work preference
    if (jobDescription.toLowerCase().includes('remote') || jobDescription.toLowerCase().includes('hybrid')) {
      questions.push({
        type: 'multiple_choice',
        label: 'Are you comfortable with the work arrangement (remote/hybrid/on-site) for this role?',
        required: true,
        category: 'logistics',
        options: [
          { id: 'yes', label: 'Yes', value: 'yes' },
          { id: 'no', label: 'No', value: 'no' },
        ],
      });
    }

    // 10. Portfolio/Work samples (for technical roles)
    if (jobDescription.toLowerCase().match(/(portfolio|github|code|project|sample)/i)) {
      questions.push({
        type: 'short_text',
        label: 'Please share a link to your portfolio, GitHub profile, or relevant work samples.',
        required: false,
        category: 'skills',
      });
    }

    // Apply user notes if provided
    if (userNotes && userNotes.trim()) {
      const notesLower = userNotes.toLowerCase();
      
      // Check for specific question requests
      if (notesLower.includes('problem') || notesLower.includes('challenge')) {
        questions.push({
          type: 'long_text',
          label: 'Describe a challenging situation you handled and the outcome.',
          required: true,
          category: 'problem_solving',
        });
      }

      if (notesLower.includes('culture') || notesLower.includes('fit') || notesLower.includes('values')) {
        questions.push({
          type: 'long_text',
          label: 'What values and work culture are important to you?',
          required: false,
          category: 'culture_fit',
        });
      }

      if (notesLower.includes('leadership') || notesLower.includes('manage')) {
        questions.push({
          type: 'long_text',
          label: 'Describe your leadership style and experience managing teams or projects.',
          required: false,
          category: 'experience',
        });
      }
    }

    // Return requested number of questions
    return questions.slice(0, questionCount);
  }
}

