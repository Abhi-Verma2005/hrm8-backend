/**
 * Interview Scheduling Service
 * Uses OpenAI to automatically suggest optimal interview times for candidates
 */

import OpenAI from 'openai';
import { ApplicationData } from '../../models/Application';
import { JobModel } from '../../models/Job';
import { Job } from '../../types';
import { CompanySettingsService } from '../company/CompanySettingsService';

export interface CandidateInfo {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  timezone?: string;
  availabilityNotes?: string;
}

export interface AISuggestedTimeSlot {
  candidateId: string;
  applicationId: string;
  suggestedDate: string; // ISO string
  alternativeDates: string[]; // Alternative options
  reasoning?: string;
  confidence?: number; // 0-1
}

export interface AutoScheduleRequest {
  jobId: string;
  candidateIds: string[]; // List of candidate IDs to schedule
  preferredDuration?: number; // in minutes, default 60
  preferredTimeSlots?: string[]; // e.g., ['09:00-12:00', '14:00-17:00']
  preferredDays?: string[]; // e.g., ['monday', 'tuesday', 'wednesday']
  timezone?: string; // Default to job location timezone
  startDate?: string; // Earliest date (ISO string)
  endDate?: string; // Latest date (ISO string)
  avoidTimes?: string[]; // Times to avoid
}

export interface AutoScheduleResponse {
  suggestions: AISuggestedTimeSlot[];
  generatedAt: string;
  jobInfo: {
    title: string;
    location: string;
    urgency?: string;
  };
  warnings?: string[];
  errors?: string[];
}

export class InterviewSchedulingService {
  /**
   * Get day name from date (e.g., 'monday', 'tuesday')
   */
  private static getDayName(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  /**
   * Check if a date is a working day
   */
  private static isWorkingDay(date: Date, workDays: string[]): boolean {
    const dayName = this.getDayName(date);
    return workDays.includes(dayName);
  }

  /**
   * Find the next working day from a given date
   * @internal - Reserved for edge case handling implementation
   */
  // @ts-ignore - Reserved for edge case handling implementation
  private static _findNextWorkingDay(date: Date, workDays: string[], maxDaysAhead: number = 30): Date | null {
    let currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < maxDaysAhead; i++) {
      if (this.isWorkingDay(currentDate, workDays)) {
        return currentDate;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return null;
  }

  /**
   * Check if time is within working hours
   * @internal - Reserved for edge case handling implementation
   */
  // @ts-ignore - Reserved for edge case handling implementation
  private static _isWithinWorkingHours(date: Date, startTime: string, endTime: string): boolean {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const hour = date.getHours();
    const minute = date.getMinutes();
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const currentMinutes = hour * 60 + minute;
    
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  /**
   * Check if time is during lunch break
   * @internal - Reserved for edge case handling implementation
   */
  // @ts-ignore - Reserved for edge case handling implementation
  private static _isDuringLunchBreak(date: Date, lunchStart?: string, lunchEnd?: string): boolean {
    if (!lunchStart || !lunchEnd) return false;
    
    const [lunchStartHour, lunchStartMin] = lunchStart.split(':').map(Number);
    const [lunchEndHour, lunchEndMin] = lunchEnd.split(':').map(Number);
    
    const hour = date.getHours();
    const minute = date.getMinutes();
    
    const lunchStartMinutes = lunchStartHour * 60 + lunchStartMin;
    const lunchEndMinutes = lunchEndHour * 60 + lunchEndMin;
    const currentMinutes = hour * 60 + minute;
    
    return currentMinutes >= lunchStartMinutes && currentMinutes < lunchEndMinutes;
  }

  /**
   * Check if two time ranges overlap
   * @internal - Reserved for edge case handling implementation
   */
  // @ts-ignore - Reserved for edge case handling implementation
  private static _doTimeRangesOverlap(
    start1: Date, end1: Date,
    start2: Date, end2: Date
  ): boolean {
    return start1 < end2 && start2 < end1;
  }

  /**
   * Calculate available slots in a date range
   */
  private static calculateAvailableSlots(
    startDate: Date,
    endDate: Date,
    workDays: string[],
    startTime: string,
    endTime: string,
    lunchStart: string | undefined,
    lunchEnd: string | undefined,
    interviewDuration: number, // in minutes
    bufferBetweenInterviews: number, // in minutes
    existingInterviews: any[]
  ): Array<{ date: Date; available: boolean; reason?: string }> {
    const slots: Array<{ date: Date; available: boolean; reason?: string }> = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const totalMinutes = endMinutes - startMinutes;
    
    // Account for lunch break
    let availableMinutes = totalMinutes;
    if (lunchStart && lunchEnd) {
      const [lunchStartHour, lunchStartMin] = lunchStart.split(':').map(Number);
      const [lunchEndHour, lunchEndMin] = lunchEnd.split(':').map(Number);
      const lunchStartMinutes = lunchStartHour * 60 + lunchStartMin;
      const lunchEndMinutes = lunchEndHour * 60 + lunchEndMin;
      availableMinutes -= (lunchEndMinutes - lunchStartMinutes);
    }
    
    // Calculate slots per day
    const slotDuration = interviewDuration + bufferBetweenInterviews;
    const slotsPerDay = Math.floor(availableMinutes / slotDuration);
    
    // Check each day in range
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    while (currentDate <= end) {
      if (!this.isWorkingDay(currentDate, workDays)) {
        slots.push({
          date: new Date(currentDate),
          available: false,
          reason: 'Not a working day'
        });
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
      
      // Check existing interviews on this day
      const dayInterviews = existingInterviews.filter(interview => {
        const interviewDate = new Date(interview.scheduledDate);
        return interviewDate.toDateString() === currentDate.toDateString();
      });
      
      const slotsUsed = dayInterviews.length;
      const available = slotsUsed < slotsPerDay;
      
      slots.push({
        date: new Date(currentDate),
        available,
        reason: available ? undefined : `All ${slotsPerDay} slots filled (${slotsUsed}/${slotsPerDay} used)`
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return slots;
  }

  /**
   * Validate date range and check for edge cases
   * @internal - Reserved for edge case handling implementation
   */
  // @ts-ignore - Reserved for edge case handling implementation
  private static async _validateDateRangeAndAvailability(
    request: AutoScheduleRequest,
    applications: ApplicationData[],
    existingInterviews: any[],
    companySettings: {
      timezone: string;
      workDays: string[];
      startTime: string;
      endTime: string;
      lunchStart?: string;
      lunchEnd?: string;
    } | null
  ): Promise<{ valid: boolean; warnings: string[]; errors: string[] }> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    const effectiveWorkDays = companySettings?.workDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const effectiveStartTime = companySettings?.startTime || '09:00';
    const effectiveEndTime = companySettings?.endTime || '17:00';
    const effectiveLunchStart = companySettings?.lunchStart;
    const effectiveLunchEnd = companySettings?.lunchEnd;
    const interviewDuration = request.preferredDuration || 60;
    const bufferBetweenInterviews = 30;
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    
    // Determine date range
    if (request.startDate) {
      startDate = new Date(request.startDate);
    } else {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() + 1); // Tomorrow
    }
    
    if (request.endDate) {
      endDate = new Date(request.endDate);
    } else {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30); // 30 days ahead
    }
    
    // Check if start date is in the past
    if (startDate < now) {
      warnings.push(`Start date is in the past. Adjusting to next available working day.`);
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() + 1);
    }
    
    // Check if end date is before start date
    if (endDate < startDate) {
      errors.push(`End date (${endDate.toISOString().split('T')[0]}) is before start date (${startDate.toISOString().split('T')[0]}). Please select a valid date range.`);
      return { valid: false, warnings, errors };
    }
    
    // Check if date range has any working days
    const slots = this.calculateAvailableSlots(
      startDate,
      endDate,
      effectiveWorkDays,
      effectiveStartTime,
      effectiveEndTime,
      effectiveLunchStart,
      effectiveLunchEnd,
      interviewDuration,
      bufferBetweenInterviews,
      existingInterviews
    );
    
    const workingDaysInRange = slots.filter(s => s.available || !s.reason?.includes('working day'));
    const availableWorkingDays = slots.filter(s => s.available);
    
    if (workingDaysInRange.length === 0) {
      errors.push(`No working days found in the selected date range (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}). Working days: ${effectiveWorkDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}.`);
      return { valid: false, warnings, errors };
    }
    
    // Check if all slots are filled
    const candidatesToSchedule = applications.length;
    if (availableWorkingDays.length === 0) {
      errors.push(`All available time slots in the selected date range are already filled. Please select a different date range or reschedule existing interviews.`);
      return { valid: false, warnings, errors };
    }
    
    // Check if we have enough slots for all candidates
    const totalAvailableSlots = availableWorkingDays.length;
    if (totalAvailableSlots < candidatesToSchedule) {
      warnings.push(`Only ${totalAvailableSlots} available slot(s) found for ${candidatesToSchedule} candidate(s). Some candidates may not get scheduled in this date range. Consider expanding the date range or scheduling in batches.`);
    }
    
    // Check date range span
    const daysSpan = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSpan < 7 && candidatesToSchedule > 5) {
      warnings.push(`Date range is only ${daysSpan} day(s) for ${candidatesToSchedule} candidate(s). Consider a wider date range for better scheduling flexibility.`);
    }
    
    return { valid: true, warnings, errors };
  }

  /**
   * Generate AI-suggested interview times for multiple candidates
   */
  static async generateSuggestions(
    request: AutoScheduleRequest
  ): Promise<AutoScheduleResponse> {
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      console.log('⚠️ OpenAI API key not found, using fallback scheduling');
      return this.generateFallbackSuggestions(request);
    }

    try {
      // Fetch job and application details
      const job = await JobModel.findById(request.jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Fetch applications with candidate info
      const applications = await this.fetchApplications(
        request.jobId,
        request.candidateIds
      );

      console.log(`[InterviewSchedulingService] Found ${applications.length} applications for ${request.candidateIds.length} candidate IDs`);
      console.log(`[InterviewSchedulingService] Candidate IDs requested:`, request.candidateIds);
      console.log(`[InterviewSchedulingService] Applications found:`, applications.map(app => ({
        id: app.id,
        candidateId: app.candidateId,
        candidateEmail: app.candidate?.email
      })));

      if (applications.length === 0) {
        console.warn(`[InterviewSchedulingService] No applications found for job ${request.jobId} with candidate IDs:`, request.candidateIds);
        // Return empty suggestions with helpful message
        return {
          suggestions: [],
          generatedAt: new Date().toISOString(),
          jobInfo: {
            title: job.title,
            location: job.location || 'Unknown',
          },
        };
      }

      // Fetch existing scheduled interviews to avoid conflicts
      const { VideoInterviewService } = await import('./VideoInterviewService');
      const existingInterviews = await VideoInterviewService.getJobInterviews(request.jobId);
      const scheduledInterviews = existingInterviews.filter(i => i.status === 'SCHEDULED');

      // Fetch company settings (office hours, timezone, working days) from database
      let companySettings;
      try {
        companySettings = await CompanySettingsService.getCompanySettings(job.companyId);
        console.log(`[InterviewSchedulingService] Loaded company settings for company ${job.companyId}:`, {
          timezone: companySettings.timezone,
          workDays: companySettings.workDays,
          startTime: companySettings.startTime,
          endTime: companySettings.endTime,
        });
      } catch (error) {
        console.warn('[InterviewSchedulingService] Failed to load company settings, using request values or defaults:', error);
        companySettings = null;
      }

      // Get current date/time for context
      const currentDateTime = new Date().toISOString();

      // Build prompt for OpenAI with company settings
      const prompt = this.buildSchedulingPrompt(
        request, 
        job, 
        applications, 
        scheduledInterviews, 
        currentDateTime,
        companySettings
      );

      // Call OpenAI
      const openai = new OpenAI({ apiKey: openaiApiKey });

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              `You are an expert HR scheduling assistant with deep knowledge of timezone conversions, business hours optimization, and interview scheduling best practices.

Your responsibilities:
1. Analyze candidate information, job requirements, and scheduling constraints
2. Generate optimal interview time suggestions that respect timezones, business hours, and avoid conflicts
3. Ensure all times are in proper ISO 8601 format with timezone offsets
4. Provide detailed reasoning for each suggestion
5. Return ONLY valid JSON following the exact format specified

Key expertise:
- Timezone conversion and DST handling
- Business hours optimization across different regions
- Interview scheduling best practices
- Conflict detection and avoidance
- Multi-timezone coordination
- Candidate convenience optimization

CRITICAL RULES:
- Always use ISO 8601 format with timezone (e.g., "2024-01-15T10:00:00-05:00")
- Never suggest times in the past
- Always avoid conflicts with existing scheduled interviews
- Respect business hours and work days strictly
- Provide 2-3 alternative options per candidate
- Include detailed reasoning for each suggestion`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      const suggestions = this.validateAndFormatSuggestions(
        parsed,
        applications,
        request
      );

      return {
        suggestions,
        generatedAt: new Date().toISOString(),
        jobInfo: {
          title: job.title,
          location: job.location,
        },
      };
    } catch (error) {
      console.error('❌ OpenAI scheduling generation failed:', error);
      console.log('🔄 Falling back to rule-based scheduling');
      return this.generateFallbackSuggestions(request);
    }
  }

  /**
   * Build the prompt for OpenAI
   */
  private static buildSchedulingPrompt(
    request: AutoScheduleRequest,
    job: Job,
    applications: ApplicationData[],
    existingInterviews: any[] = [],
    currentDateTime?: string,
    companySettings?: {
      timezone: string;
      workDays: string[];
      startTime: string;
      endTime: string;
      lunchStart?: string;
      lunchEnd?: string;
    } | null
  ): string {
    const {
      preferredDuration = 60,
      preferredDays,
      timezone,
      startDate,
      endDate,
    } = request;

    // Use company settings if available (prioritize DB settings), otherwise fall back to request values
    const effectiveTimezone = companySettings?.timezone || timezone || 'UTC';
    const effectiveWorkDays = companySettings?.workDays || preferredDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const effectiveStartTime = companySettings?.startTime || '09:00';
    const effectiveEndTime = companySettings?.endTime || '17:00';
    const effectiveLunchStart = companySettings?.lunchStart;
    const effectiveLunchEnd = companySettings?.lunchEnd;

    let prompt = `Generate optimal interview scheduling suggestions for the following job and candidates:\n\n`;
    prompt += `Job Title: ${job.title}\n`;
    prompt += `Job Location: ${job.location}\n`;
    prompt += `Interview Duration: ${preferredDuration} minutes\n\n`;

    // Add current date/time for context
    if (currentDateTime) {
      prompt += `Current Date/Time: ${currentDateTime}\n`;
      prompt += `IMPORTANT: Only suggest interview times AFTER this current time.\n\n`;
    }

    // Add preferred date range (if provided)
    if (startDate || endDate) {
      prompt += `\n=== PREFERRED DATE RANGE (USER REQUESTED) ===\n`;
      if (startDate) {
        prompt += `Earliest Date: ${startDate}\n`;
        prompt += `IMPORTANT: Schedule interviews ON OR AFTER this date\n`;
      } else {
        prompt += `Earliest Date: ${currentDateTime || 'NOW'} (current time - no preferred start date)\n`;
      }
      if (endDate) {
        prompt += `Latest Date: ${endDate}\n`;
        prompt += `IMPORTANT: Schedule interviews ON OR BEFORE this date\n`;
        prompt += `Schedule all interviews within this date range: ${startDate || currentDateTime} to ${endDate}\n`;
      } else {
        prompt += `Latest Date: Not specified - schedule based on existing interviews and availability\n`;
      }
      prompt += `\n`;
    } else {
      prompt += `\n=== DATE RANGE (NOT SPECIFIED - USE CONSTRAINTS) ===\n`;
      prompt += `No preferred date range provided. Schedule interviews based on:\n`;
      prompt += `- Current time: ${currentDateTime || 'NOW'}\n`;
      prompt += `- Existing scheduled interviews (avoid conflicts)\n`;
      prompt += `- Company working hours and days\n`;
      prompt += `- Candidate availability and urgency\n`;
      prompt += `- Distribute interviews across available time slots\n`;
      prompt += `\n`;
    }

    // Add company office hours and timezone configuration
    prompt += `\n=== COMPANY OFFICE HOURS CONFIGURATION ===\n`;
    prompt += `Timezone: ${effectiveTimezone}\n`;
    prompt += `Working Days: ${effectiveWorkDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}\n`;
    prompt += `Working Hours: ${effectiveStartTime} - ${effectiveEndTime}\n`;
    if (effectiveLunchStart && effectiveLunchEnd) {
      prompt += `Lunch Break: ${effectiveLunchStart} - ${effectiveLunchEnd} (DO NOT schedule during this time)\n`;
    }
    prompt += `\nCRITICAL: All interview times must be scheduled:\n`;
    prompt += `- ONLY on working days: ${effectiveWorkDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}\n`;
    prompt += `- ONLY during working hours: ${effectiveStartTime} - ${effectiveEndTime}\n`;
    prompt += `- In timezone: ${effectiveTimezone}\n`;
    if (effectiveLunchStart && effectiveLunchEnd) {
      prompt += `- NOT during lunch break: ${effectiveLunchStart} - ${effectiveLunchEnd}\n`;
    }
    prompt += `\n`;

    // Add existing scheduled interviews to avoid conflicts
    if (existingInterviews && existingInterviews.length > 0) {
      prompt += `\nEXISTING SCHEDULED INTERVIEWS (DO NOT schedule at these times):\n`;
      existingInterviews.forEach((interview, index) => {
        const interviewDate = new Date(interview.scheduledDate);
        const interviewEnd = new Date(interviewDate.getTime() + interview.duration * 60000);
        prompt += `${index + 1}. ${interviewDate.toISOString()} - ${interviewEnd.toISOString()} (${interview.duration} minutes)\n`;
      });
      prompt += `\nIMPORTANT: Do NOT schedule new interviews that overlap with these existing times.\n\n`;
    }

    prompt += `\nCandidates to schedule:\n`;
    applications.forEach((app, index) => {
      const candidate = app.candidate;
      const candidateName = `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim() || candidate?.email || 'Unknown';
      prompt += `${index + 1}. ${candidateName} (${candidate?.email || ''})\n`;
      prompt += `   Candidate ID: ${app.candidateId}\n`;
      prompt += `   Application ID: ${app.id}\n`;
      if (candidate?.city) {
        prompt += `   Location: ${candidate.city}${candidate?.country ? `, ${candidate.country}` : ''}\n`;
        // Estimate timezone from location if possible
        if (candidate.country) {
          prompt += `   Estimated Timezone: Based on location (${candidate.city}, ${candidate.country}), consider appropriate timezone for scheduling\n`;
        }
      }
      if (app.appliedDate) {
        const appliedDate = new Date(app.appliedDate);
        const daysSinceApplied = Math.floor((Date.now() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
        prompt += `   Applied: ${appliedDate.toLocaleDateString()} (${daysSinceApplied} days ago)\n`;
        prompt += `   Urgency: ${daysSinceApplied < 7 ? 'High - Applied recently' : daysSinceApplied < 14 ? 'Medium' : 'Low - Applied long ago'}\n`;
      }
    });

    prompt += `\nCRITICAL SCHEDULING INSTRUCTIONS - Follow these rules EXACTLY:\n\n`;
    prompt += `1. TIMEZONE AWARENESS:\n`;
    prompt += `   - Company timezone: ${effectiveTimezone}\n`;
    prompt += `   - ALL suggested times must be in ISO 8601 format with timezone offset\n`;
    prompt += `   - Format examples: "2024-01-15T10:00:00Z" (UTC), "2024-01-15T10:00:00-05:00" (EST), "2024-01-15T10:00:00+09:00" (JST)\n`;
    prompt += `   - All times should be in company timezone: ${effectiveTimezone}\n`;
    prompt += `   - Convert candidate locations to company timezone when suggesting times\n`;
    prompt += `   - Consider timezone differences between interviewer and candidate locations\n`;
    prompt += `   - Account for daylight saving time (DST) if applicable\n\n`;
    
    prompt += `2. TIMING CONSTRAINTS:\n`;
    if (currentDateTime) {
      prompt += `   - Current date/time: ${currentDateTime} (${effectiveTimezone})\n`;
      prompt += `   - NEVER suggest times before: ${currentDateTime}\n`;
      prompt += `   - Minimum buffer: Suggest times at least 2 hours from now\n`;
    }
    prompt += `   - Company working hours: ${effectiveStartTime} - ${effectiveEndTime} (${effectiveTimezone})\n`;
    prompt += `   - Company work days: ${effectiveWorkDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}\n`;
    prompt += `   - STRICTLY schedule ONLY during working hours: ${effectiveStartTime} - ${effectiveEndTime}\n`;
    prompt += `   - STRICTLY schedule ONLY on work days: ${effectiveWorkDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}\n`;
    if (effectiveLunchStart && effectiveLunchEnd) {
      prompt += `   - AVOID lunch break: ${effectiveLunchStart} - ${effectiveLunchEnd} (DO NOT schedule during this time)\n`;
    } else {
      prompt += `   - Avoid lunch breaks: Typically 12:00 PM - 1:00 PM\n`;
    }
    prompt += `   - Do NOT schedule before ${effectiveStartTime} or after ${effectiveEndTime}\n`;
    prompt += `   - Do NOT schedule on non-working days\n\n`;
    
    prompt += `3. CONFLICT AVOIDANCE:\n`;
    if (existingInterviews && existingInterviews.length > 0) {
      prompt += `   - ${existingInterviews.length} existing interview(s) already scheduled\n`;
      prompt += `   - Check each existing interview time range carefully\n`;
      prompt += `   - Leave at least 15-30 minutes buffer between consecutive interviews\n`;
      prompt += `   - Do NOT overlap with any existing interview time slots\n`;
    } else {
      prompt += `   - No existing interviews to avoid\n`;
    }
    prompt += `   - Space interviews throughout the day (avoid clustering)\n`;
    prompt += `   - Consider interviewer availability (spread interviews across different days)\n\n`;
    
    prompt += `4. CANDIDATE CONSIDERATIONS:\n`;
    prompt += `   - Respect candidate timezone and local business hours\n`;
    prompt += `   - Consider candidate location when suggesting times\n`;
    prompt += `   - For remote candidates: prefer times that work in both timezones\n`;
    prompt += `   - Provide 2-3 alternative time options per candidate for flexibility\n`;
    prompt += `   - Consider urgency: prioritize candidates who applied more recently\n\n`;
    
    prompt += `5. QUALITY GUIDELINES:\n`;
    prompt += `   - Each suggestion must include detailed reasoning\n`;
    prompt += `   - Confidence score should reflect certainty (0.5-1.0 range)\n`;
    prompt += `   - Alternative dates should be genuinely different (different days or significantly different times)\n`;
    prompt += `   - Consider interviewer workload (don't schedule too many on one day)\n`;
    prompt += `   - Balance scheduling efficiency with candidate convenience\n\n`;
    
    prompt += `6. OUTPUT FORMAT:\n`;
    prompt += `   - All dates MUST be in ISO 8601 format\n`;
    prompt += `   - Include timezone offset in ISO format\n`;
    prompt += `   - Times should be precise (avoid ambiguous times)\n`;
    prompt += `   - Ensure all suggested dates are in the future relative to current time\n\n`;

    prompt += `\nRETURN FORMAT (JSON):\n`;
    prompt += `{\n`;
    prompt += `  "suggestions": [\n`;
    prompt += `    {\n`;
    prompt += `      "candidateId": "exact-candidate-id-from-above-list",\n`;
    prompt += `      "applicationId": "exact-application-id-from-above-list",\n`;
    prompt += `      "suggestedDate": "2024-01-15T10:00:00-05:00",\n`;
    prompt += `      "alternativeDates": ["2024-01-15T14:00:00-05:00", "2024-01-16T10:00:00-05:00"],\n`;
    prompt += `      "reasoning": "Detailed explanation: Scheduled at 10 AM EST (during business hours), avoids lunch break at 12 PM, no conflicts with existing interviews, convenient for candidate in EST timezone",\n`;
    prompt += `      "confidence": 0.9,\n`;
    prompt += `      "timezone": "${effectiveTimezone}",\n`;
    prompt += `      "candidateTimezone": "detected-or-default-timezone"\n`;
    prompt += `    }\n`;
    prompt += `  ]\n`;
    prompt += `}\n\n`;
    
    prompt += `FINAL CHECKLIST - Before returning suggestions:\n`;
    prompt += `✓ All candidateId and applicationId values match exactly from the candidate list\n`;
    prompt += `✓ All suggestedDate values are AFTER current time (${currentDateTime || 'NOW'})\n`;
    prompt += `✓ All times are within company working hours: ${effectiveStartTime} - ${effectiveEndTime} (${effectiveTimezone})\n`;
    prompt += `✓ All times are on company work days: ${effectiveWorkDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}\n`;
    if (existingInterviews && existingInterviews.length > 0) {
      prompt += `✓ No suggestions overlap with ${existingInterviews.length} existing interview(s)\n`;
    }
    prompt += `✓ All dates include timezone information in ISO 8601 format\n`;
    prompt += `✓ At least 15-30 minutes buffer between any consecutive interviews\n`;
    prompt += `✓ Reasoning is detailed and explains timezone, timing, and conflict avoidance\n`;
    prompt += `✓ Each candidate has 2-3 alternative options with different times/days\n\n`;
    
    prompt += `CRITICAL: Double-check all dates against current time and existing interviews. Accuracy is paramount.\n`;

    return prompt;
  }

  /**
   * Fetch applications with candidate details
   */
  private static async fetchApplications(
    jobId: string,
    candidateIds: string[]
  ): Promise<ApplicationData[]> {
    const { ApplicationModel } = await import('../../models/Application');
    const allApplications = await ApplicationModel.findByJobId(jobId);
    
    console.log(`[InterviewSchedulingService] Total applications for job ${jobId}:`, allApplications.length);
    console.log(`[InterviewSchedulingService] All candidate IDs in job:`, allApplications.map(app => app.candidateId));

    const filteredApplications = allApplications.filter((app) => candidateIds.includes(app.candidateId));
    
    console.log(`[InterviewSchedulingService] Filtered applications matching candidate IDs:`, filteredApplications.length);
    
    return filteredApplications;
  }

  /**
   * Validate and format OpenAI suggestions
   */
  private static validateAndFormatSuggestions(
    parsed: any,
    applications: ApplicationData[],
    request: AutoScheduleRequest
  ): AISuggestedTimeSlot[] {
    const suggestions = parsed.suggestions || [];

    if (!Array.isArray(suggestions)) {
      throw new Error('Invalid suggestions format from OpenAI');
    }

    return suggestions
      .map((suggestion: any) => {
        // Validate required fields
        if (!suggestion.candidateId || !suggestion.suggestedDate) {
          console.warn('Invalid suggestion missing required fields:', suggestion);
          return null;
        }

        // Validate candidate exists - try matching by candidateId first
        let application = applications.find(
          (app) => app.candidateId === suggestion.candidateId
        );
        
        // If not found by ID, try matching by candidate name (fallback for OpenAI mistakes)
        if (!application) {
          const candidateName = suggestion.candidateId?.toString().trim();
          application = applications.find((app) => {
            const candidate = app.candidate;
            const fullName = `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim();
            const email = candidate?.email || '';
            return fullName === candidateName || email === candidateName;
          });
          
          if (application) {
            console.log(`[InterviewSchedulingService] Matched candidate by name instead of ID: ${candidateName} -> ${application.candidateId}`);
          }
        }
        
        if (!application) {
          console.warn(
            'Suggestion for unknown candidate:',
            suggestion.candidateId,
            'Available candidates:',
            applications.map(app => ({
              id: app.candidateId,
              name: `${app.candidate?.firstName || ''} ${app.candidate?.lastName || ''}`.trim()
            }))
          );
          return null;
        }

        // Validate and normalize date format with timezone handling
        let suggestedDateStr = suggestion.suggestedDate;
        const suggestedDate = new Date(suggestedDateStr);
        
        if (isNaN(suggestedDate.getTime())) {
          console.warn('Invalid date format:', suggestion.suggestedDate);
          return null;
        }

        // Ensure timezone is included in ISO format
        if (!suggestedDateStr.includes('Z') && !suggestedDateStr.match(/[+-]\d{2}:?\d{2}$/)) {
          // Convert to ISO with UTC timezone
          suggestedDateStr = suggestedDate.toISOString();
        }

        // Validate date is in the future
        const now = new Date();
        if (suggestedDate <= now) {
          console.warn(`Suggestion date ${suggestedDateStr} is in the past, skipping`);
          return null;
        }

        // Check date constraints
        if (request.startDate) {
          const startDate = new Date(request.startDate);
          if (suggestedDate < startDate) {
            console.warn('Suggestion before start date, skipping');
            return null;
          }
        }

        if (request.endDate) {
          const endDate = new Date(request.endDate);
          if (suggestedDate > endDate) {
            console.warn('Suggestion after end date, skipping');
            return null;
          }
        }

        // Validate and normalize alternative dates
        const alternativeDates = (suggestion.alternativeDates || [])
          .map((date: string) => {
            const d = new Date(date);
            if (isNaN(d.getTime())) {
              console.warn(`Invalid alternative date format: ${date}`);
              return null;
            }
            // Ensure future dates
            if (d <= now) {
              console.warn(`Alternative date ${date} is in the past, skipping`);
              return null;
            }
            // Normalize timezone format
            let normalizedDate = date;
            if (!date.includes('Z') && !date.match(/[+-]\d{2}:?\d{2}$/)) {
              normalizedDate = d.toISOString();
            }
            return normalizedDate;
          })
          .filter(Boolean) as string[];

        return {
          candidateId: suggestion.candidateId,
          applicationId: application.id,
          suggestedDate: suggestedDateStr,
          alternativeDates: alternativeDates || [],
          reasoning: suggestion.reasoning || 'AI-generated suggestion based on business hours, timezone considerations, and availability',
          confidence: typeof suggestion.confidence === 'number' 
            ? Math.max(0, Math.min(1, suggestion.confidence)) 
            : 0.8,
        };
      })
      .filter(Boolean) as AISuggestedTimeSlot[];
  }

  /**
   * Fallback scheduling when OpenAI is not available
   */
  private static async generateFallbackSuggestions(
    request: AutoScheduleRequest
  ): Promise<AutoScheduleResponse> {
    const applications = await this.fetchApplications(
      request.jobId,
      request.candidateIds
    );

    if (applications.length === 0) {
      console.warn(`[InterviewSchedulingService] No applications found for fallback scheduling`);
      const job = await JobModel.findById(request.jobId);
      return {
        suggestions: [],
        generatedAt: new Date().toISOString(),
        jobInfo: {
          title: job?.title || 'Unknown',
          location: job?.location || 'Unknown',
        },
      };
    }

    const startDate = request.startDate
      ? new Date(request.startDate)
      : new Date();

    // Set to next business day if start date is in the past
    if (startDate < new Date()) {
      startDate.setDate(startDate.getDate() + 1);
    }

    // Start at 10 AM
    startDate.setHours(10, 0, 0, 0);

    const suggestions: AISuggestedTimeSlot[] = applications.map(
      (app, index) => {
        // Space interviews by 1.5 hours (60 min interview + 30 min buffer)
        const interviewDate = new Date(startDate);
        interviewDate.setHours(
          startDate.getHours() + index * 1.5,
          startDate.getMinutes()
        );

        // If we go past 5 PM, move to next day
        while (interviewDate.getHours() >= 17) {
          interviewDate.setDate(interviewDate.getDate() + 1);
          interviewDate.setHours(10, 0, 0, 0);
        }

        // Generate alternatives (next day at same time, and day after)
        const alt1 = new Date(interviewDate);
        alt1.setDate(alt1.getDate() + 1);

        const alt2 = new Date(interviewDate);
        alt2.setDate(alt2.getDate() + 2);

        return {
          candidateId: app.candidateId,
          applicationId: app.id,
          suggestedDate: interviewDate.toISOString(),
          alternativeDates: [
            alt1.toISOString(),
            alt2.toISOString(),
          ],
          reasoning:
            'Scheduled during business hours with appropriate spacing between interviews',
          confidence: 0.7,
        };
      }
    );

    const job = await JobModel.findById(request.jobId);

    return {
      suggestions,
      generatedAt: new Date().toISOString(),
      jobInfo: {
        title: job?.title || 'Unknown',
        location: job?.location || 'Unknown',
      },
    };
  }
}

