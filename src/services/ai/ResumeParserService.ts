/**
 * Resume Parser Service
 * Uses AI to extract structured candidate data from parsed documents
 * Implements ATS-friendly parsing patterns
 */

import { ParsedDocument } from '../document/DocumentParserService';

export interface ParsedWorkExperience {
    company: string;
    role: string;
    startDate: string; // ISO date string or "YYYY-MM"
    endDate?: string; // ISO date string or "YYYY-MM" or "Present"
    current: boolean;
    description?: string;
    location?: string;
}

export interface ParsedSkill {
    name: string;
    level?: 'beginner' | 'intermediate' | 'expert';
}

export interface ParsedResumeData {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    summary?: string;
    workExperience: ParsedWorkExperience[];
    skills: ParsedSkill[];
    education?: any[]; // Simplified for now
}

export class ResumeParserService {
    /**
     * Extract resume data using OpenAI with ATS-friendly parsing
     */
    static async parseResume(document: ParsedDocument): Promise<ParsedResumeData> {
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            console.warn('OpenAI API key not found, using fallback pattern matching');
            return this.fallbackParse(document);
        }

        try {
            // Dynamic import to avoid requiring openai package if not needed
            const { default: OpenAI } = await import('openai');
            const openai = new OpenAI({ apiKey });

            const text = document.text.substring(0, 12000); // Limit to avoid token limits

            const prompt = `You are an expert ATS (Applicant Tracking System) resume parser. Extract structured data from this resume following ATS best practices.

IMPORTANT PARSING RULES:
1. Look for standard section headers: "Experience", "Work History", "Employment", "Education", "Skills", "Summary", "Objective"
2. Extract dates in YYYY-MM format when possible
3. Identify company names, job titles, and locations
4. Extract skills from dedicated skills sections and from job descriptions
5. Parse contact information from the top of the resume
6. Handle both chronological and hybrid resume formats

Return a JSON object with:
- firstName: string (first name only)
- lastName: string (last name only)
- email: string (email address)
- phone: string (phone number)
- summary: string (professional summary or objective)
- workExperience: Array of objects with:
  - company: string (company name)
  - role: string (job title/position)
  - startDate: string (YYYY-MM format, e.g., "2020-01")
  - endDate: string (YYYY-MM format or "Present" for current positions)
  - current: boolean (true if currently employed here)
  - description: string (key responsibilities and achievements, bullet points as newline-separated text)
  - location: string (city, state/country)
- skills: Array of objects with:
  - name: string (skill name)
  - level: string (beginner, intermediate, expert) - infer from context like "proficient", "expert", "familiar with", or default to intermediate
- education: Array of objects with:
  - institution: string
  - degree: string
  - field: string
  - graduationDate: string (YYYY-MM format)

Resume text:
${text}

Return ONLY valid JSON, no markdown formatting, no code blocks.`;

            const completion = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert ATS resume parser. Extract structured data accurately and return only valid JSON.',
                    },
                    { role: 'user', content: prompt },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1, // Lower temperature for more consistent parsing
                max_tokens: 3000,
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from OpenAI');
            }

            const extracted = JSON.parse(content);
            return this.normalizeParsedData(extracted);
        } catch (error) {
            console.error('OpenAI resume parsing failed:', error);
            console.log('Falling back to pattern matching');
            return this.fallbackParse(document);
        }
    }

    /**
     * Fallback pattern-based parsing when AI is unavailable
     */
    private static fallbackParse(document: ParsedDocument): ParsedResumeData {
        const text = document.text;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Basic email and phone extraction
        const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
        const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

        // Try to extract name from first few lines
        const nameMatch = lines[0]?.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/);

        return {
            firstName: nameMatch?.[1],
            lastName: nameMatch?.[2],
            email: emailMatch?.[0],
            phone: phoneMatch?.[0],
            workExperience: [],
            skills: [],
            education: [],
        };
    }

    /**
     * Normalize parsed data to ensure consistency
     */
    private static normalizeParsedData(data: any): ParsedResumeData {
        return {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            summary: data.summary,
            workExperience: Array.isArray(data.workExperience)
                ? data.workExperience.map((exp: any) => ({
                    company: exp.company || 'Unknown Company',
                    role: exp.role || 'Unknown Role',
                    startDate: exp.startDate || new Date().toISOString().substring(0, 7),
                    endDate: exp.endDate,
                    current: exp.current || exp.endDate === 'Present' || false,
                    description: exp.description,
                    location: exp.location,
                }))
                : [],
            skills: Array.isArray(data.skills)
                ? data.skills.map((skill: any) => ({
                    name: typeof skill === 'string' ? skill : skill.name,
                    level: skill.level || 'intermediate',
                }))
                : [],
            education: Array.isArray(data.education) ? data.education : [],
        };
    }
}
