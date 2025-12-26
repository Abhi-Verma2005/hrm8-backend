/**
 * Google Calendar Service
 * Creates calendar events with Google Meet links for video interviews
 *
 * Supports two modes:
 * 1. Service Account (GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_KEY) - Simple, no OAuth needed
 * 2. OAuth tokens (stored in database) - For user-specific calendars
 * 3. Fallback mode - Generates meeting links without calendar events
 */

export interface CalendarEventInput {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees?: Array<{ email: string; name?: string }>;
  timeZone?: string;
  location?: string;
}

export interface CalendarEventResult {
  eventId: string;
  meetingLink?: string;
  htmlLink?: string;
  calendarId?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  meetingLink?: string;
  htmlLink?: string;
  attendees?: string[];
}

export class GoogleCalendarService {
  /**
   * Create a calendar event for a video interview with Google Meet link
   */
  static async createVideoInterviewEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
    try {
      // Try to use real Google Calendar API if configured
      if (this.isGoogleCalendarConfigured()) {
        return await this.createRealCalendarEvent(input);
      }
    } catch (error) {
      console.error('[GoogleCalendarService] Failed to create real calendar event, using fallback:', error);
    }

    // Fallback: Generate meeting link without calendar event
    return this.createFallbackMeetingLink(input);
  }

  /**
   * Check if Google Calendar is properly configured
   */
  private static isGoogleCalendarConfigured(): boolean {
    // Check for service account credentials
    const hasServiceAccount = !!(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    );
    
    // Check for OAuth client credentials (future implementation)
    const hasOAuthClient = !!(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    );

    return hasServiceAccount || hasOAuthClient;
  }

  /**
   * Create a real Google Calendar event using googleapis
   */
  private static async createRealCalendarEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
    try {
      // Dynamically import googleapis (may not be installed)
      // If googleapis is not installed, this will throw and fallback will be used
      let google: any;
      try {
        // @ts-ignore - googleapis may not be installed, we handle this gracefully
        const googleapis = await import('googleapis');
        google = googleapis.google;
      } catch (importError) {
        console.warn('[GoogleCalendarService] googleapis package not installed, using fallback mode');
        throw new Error('googleapis package not installed');
      }
      
      let auth: any;
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

      // Try service account authentication first
      if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        let serviceAccountKey: any;

        try {
          // Try parsing as JSON string first
          serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        } catch {
          // If not JSON, treat as file path or base64 encoded JSON
          serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
        }

        auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: serviceAccountEmail,
            private_key: typeof serviceAccountKey === 'object' 
              ? serviceAccountKey.private_key 
              : serviceAccountKey,
          },
          scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
        });
      } else {
        // OAuth implementation would go here
        throw new Error('OAuth not yet implemented. Use service account or fallback mode.');
      }

      const calendar = google.calendar({ version: 'v3', auth });

      // Create calendar event with Google Meet conference
      const event = {
        summary: input.summary,
        description: input.description || '',
        start: {
          dateTime: input.start.toISOString(),
          timeZone: input.timeZone || 'UTC',
        },
        end: {
          dateTime: input.end.toISOString(),
          timeZone: input.timeZone || 'UTC',
        },
        attendees: input.attendees?.map(a => ({ email: a.email })),
        location: input.location,
        conferenceData: {
          createRequest: {
            requestId: `interview-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 15 }, // 15 minutes before
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId,
        conferenceDataVersion: 1,
        sendUpdates: input.attendees && input.attendees.length > 0 ? 'all' : 'none',
        requestBody: event,
      });

      const createdEvent = response.data;

      return {
        eventId: createdEvent.id || '',
        meetingLink: createdEvent.hangoutLink || createdEvent.conferenceData?.entryPoints?.[0]?.uri,
        htmlLink: createdEvent.htmlLink || undefined,
        calendarId,
      };
    } catch (error) {
      console.error('[GoogleCalendarService] Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * Fallback: Generate a meeting link without creating calendar event
   */
  private static createFallbackMeetingLink(input: CalendarEventInput): CalendarEventResult {
    const fakeEventId = `fallback-event-${Date.now()}`;
    
    // Generate a Google Meet link
    // Format: https://meet.google.com/xxx-xxxx-xxx
    const baseLink = process.env.GOOGLE_CALENDAR_MEETING_BASE_URL || 'https://meet.google.com';
    
    // Generate a random meeting code (3 letters, dash, 4 letters, dash, 3 letters)
    const generateMeetingCode = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyz';
      const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      return `${part1}-${part2}-${part3}`;
    };
    
    const meetingCode = generateMeetingCode();
    const meetingLink = `${baseLink}/${meetingCode}`;

    console.log('[GoogleCalendarService] (fallback) Generated meeting link', {
      summary: input.summary,
      start: input.start.toISOString(),
      end: input.end.toISOString(),
      meetingLink,
    });

    return {
      eventId: fakeEventId,
      meetingLink,
      htmlLink: meetingLink,
    };
  }

  /**
   * Get calendar events for a job (between start and end dates)
   * Note: Currently returns empty array as calendar events are queried from VideoInterview records
   * This method is reserved for future direct Google Calendar API integration
   */
  static async getJobCalendarEvents(
    _jobId: string,
    _startDate: Date,
    _endDate: Date
  ): Promise<CalendarEvent[]> {
    try {
      if (!this.isGoogleCalendarConfigured()) {
        console.log('[GoogleCalendarService] Calendar not configured, returning empty events');
        return [];
      }

      // This would query calendar events that match the job
      // For now, return empty array - will be implemented when we store eventIds
      // Calendar events are currently retrieved via VideoInterview records instead
      return [];
    } catch (error) {
      console.error('[GoogleCalendarService] Error fetching calendar events:', error);
      return [];
    }
  }

  /**
   * Update a calendar event
   */
  static async updateCalendarEvent(
    eventId: string,
    updates: Partial<CalendarEventInput>
  ): Promise<CalendarEventResult> {
    try {
      if (!this.isGoogleCalendarConfigured()) {
        throw new Error('Google Calendar not configured');
      }

      // Dynamically import googleapis (may not be installed)
      let google: any;
      try {
        // @ts-ignore - googleapis may not be installed, we handle this gracefully
        const googleapis = await import('googleapis');
        google = googleapis.google;
      } catch (importError) {
        console.warn('[GoogleCalendarService] googleapis package not installed, cannot update calendar event');
        throw new Error('googleapis package not installed');
      }
      
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      // Set up auth (same as create)
      let auth: any;
      if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        let serviceAccountKey: any;
        try {
          serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        } catch {
          serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
        }

        auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: serviceAccountEmail,
            private_key: typeof serviceAccountKey === 'object' 
              ? serviceAccountKey.private_key 
              : serviceAccountKey,
          },
          scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
        });
      }

      const calendar = google.calendar({ version: 'v3', auth });

      const updateData: any = {};
      if (updates.start) updateData.start = { dateTime: updates.start.toISOString(), timeZone: updates.timeZone || 'UTC' };
      if (updates.end) updateData.end = { dateTime: updates.end.toISOString(), timeZone: updates.timeZone || 'UTC' };
      if (updates.summary) updateData.summary = updates.summary;
      if (updates.description) updateData.description = updates.description;
      if (updates.attendees) updateData.attendees = updates.attendees.map(a => ({ email: a.email }));

      const response = await calendar.events.patch({
        calendarId,
        eventId,
        requestBody: updateData,
      });

      return {
        eventId: response.data.id || eventId,
        meetingLink: response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri,
        htmlLink: response.data.htmlLink || undefined,
        calendarId,
      };
    } catch (error) {
      console.error('[GoogleCalendarService] Error updating calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  static async deleteCalendarEvent(eventId: string): Promise<void> {
    try {
      if (!this.isGoogleCalendarConfigured()) {
        console.log('[GoogleCalendarService] Calendar not configured, skipping deletion');
        return;
      }

      // Dynamically import googleapis (may not be installed)
      let google: any;
      try {
        // @ts-ignore - googleapis may not be installed, we handle this gracefully
        const googleapis = await import('googleapis');
        google = googleapis.google;
      } catch (importError) {
        console.warn('[GoogleCalendarService] googleapis package not installed, cannot delete calendar event');
        throw new Error('googleapis package not installed');
      }
      
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      // Set up auth (same as create)
      let auth: any;
      if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        let serviceAccountKey: any;
        try {
          serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        } catch {
          serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
        }

        auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: serviceAccountEmail,
            private_key: typeof serviceAccountKey === 'object' 
              ? serviceAccountKey.private_key 
              : serviceAccountKey,
          },
          scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
        });
      }

      const calendar = google.calendar({ version: 'v3', auth });

      await calendar.events.delete({
        calendarId,
        eventId,
      });

      console.log('[GoogleCalendarService] Deleted calendar event:', eventId);
    } catch (error) {
      console.error('[GoogleCalendarService] Error deleting calendar event:', error);
      throw error;
    }
  }
}


