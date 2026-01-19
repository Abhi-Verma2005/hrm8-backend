/**
 * Resume Parser Service
 * Uses AI to extract structured candidate data from parsed documents
 * Implements ATS-friendly parsing patterns
 */

import { ParsedDocument } from '../document/DocumentParserService';
import { ConfigService } from '../../services/config/ConfigService';

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

export interface ParsedEducation {
    institution: string;
    degree: string;
    field: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    grade?: string;
    description?: string;
}

export interface ParsedCertification {
    name: string;
    issuingOrg: string;
    issueDate?: string;
    expiryDate?: string;
    credentialId?: string;
    credentialUrl?: string;
    doesNotExpire?: boolean;
}

export interface ParsedTraining {
    courseName: string;
    provider: string;
    completedDate?: string;
    duration?: string;
    description?: string;
    certificateUrl?: string;
}

export interface ParsedResumeData {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    summary?: string;
    workExperience: ParsedWorkExperience[];
    skills: ParsedSkill[];
    education: ParsedEducation[];
    certifications: ParsedCertification[];
    training: ParsedTraining[];
}

export class ResumeParserService {
    /**
     * Extract resume data using OpenAI with ATS-friendly parsing
     */
    static async parseResume(document: ParsedDocument): Promise<ParsedResumeData> {
        const config = await ConfigService.getOpenAIConfig();
        const apiKey = config.apiKey;

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
1. Look for standard section headers: "Experience", "Work History", "Employment", "Education", "Skills", "Summary", "Objective", "Certifications", "Licenses", "Training", "Courses"
2. Extract dates in YYYY-MM format when possible
3. Identify company names, job titles, and locations
4. Extract skills from dedicated skills sections and from job descriptions
5. Parse contact information from the top of the resume
6. Handle both chronological and hybrid resume formats
7. Extract education details including institution, degree, field of study, and dates
8. Identify certifications and licenses with issuing organizations and expiry dates
9. Extract training courses and professional development activities

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
  - institution: string (university/college name)
  - degree: string (e.g., "Bachelor of Science", "Master of Arts")
  - field: string (field of study, e.g., "Computer Science")
  - startDate: string (YYYY-MM format, optional)
  - endDate: string (YYYY-MM format or "Present" for current)
  - current: boolean (true if currently studying)
  - grade: string (GPA or grade, optional)
  - description: string (honors, achievements, optional)
- certifications: Array of objects with:
  - name: string (certification name)
  - issuingOrg: string (issuing organization)
  - issueDate: string (YYYY-MM format, optional)
  - expiryDate: string (YYYY-MM format, optional)
  - credentialId: string (credential ID, optional)
  - credentialUrl: string (verification URL, optional)
  - doesNotExpire: boolean (true if no expiry date)
- training: Array of objects with:
  - courseName: string (course/training name)
  - provider: string (training provider/platform)
  - completedDate: string (YYYY-MM format, optional)
  - duration: string (e.g., "40 hours", "3 months", optional)
  - description: string (course description, optional)
  - certificateUrl: string (certificate URL, optional)

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
            certifications: [],
            training: [],
        };
    }

    /**
     * Normalize parsed data to ensure consistency
     */
    private static normalizeParsedData(data: any): ParsedResumeData {
        // Helper to convert YYYY-MM to ISO date
        const toIsoDate = (dateStr?: string) => {
            if (!dateStr) return undefined;
            if (dateStr.toLowerCase() === 'present') return undefined;
            // If already full date, return as is
            if (dateStr.includes('T')) return dateStr;
            // If YYYY-MM, append day and time
            if (/^\d{4}-\d{2}$/.test(dateStr)) return `${dateStr}-01T00:00:00Z`;
            // If YYYY, append month, day and time
            if (/^\d{4}$/.test(dateStr)) return `${dateStr}-01-01T00:00:00Z`;
            return undefined;
        };

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
                    startDate: toIsoDate(exp.startDate) || new Date().toISOString(),
                    endDate: toIsoDate(exp.endDate),
                    current: exp.current || exp.endDate?.toLowerCase() === 'present' || !exp.endDate,
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
            education: Array.isArray(data.education)
                ? data.education.map((edu: any) => ({
                    institution: edu.institution || 'Unknown Institution',
                    degree: edu.degree || 'Unknown Degree',
                    field: edu.field || 'Unknown Field',
                    startDate: toIsoDate(edu.startDate),
                    endDate: toIsoDate(edu.endDate),
                    current: edu.current || false,
                    grade: edu.grade,
                    description: edu.description,
                }))
                : [],
            certifications: Array.isArray(data.certifications)
                ? data.certifications.map((cert: any) => ({
                    name: cert.name || 'Unknown Certification',
                    issuingOrg: cert.issuingOrg || cert.issuingOrganization || 'Unknown Organization',
                    issueDate: toIsoDate(cert.issueDate),
                    expiryDate: toIsoDate(cert.expiryDate),
                    credentialId: cert.credentialId,
                    credentialUrl: cert.credentialUrl,
                    doesNotExpire: cert.doesNotExpire || !cert.expiryDate,
                }))
                : [],
            training: Array.isArray(data.training)
                ? data.training.map((train: any) => ({
                    courseName: train.courseName || train.name || 'Unknown Course',
                    provider: train.provider || 'Unknown Provider',
                    completedDate: toIsoDate(train.completedDate),
                    duration: train.duration,
                    description: train.description,
                    certificateUrl: train.certificateUrl,
                }))
                : [],
        };
    }
}
