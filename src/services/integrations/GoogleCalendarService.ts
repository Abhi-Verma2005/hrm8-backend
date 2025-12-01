/**
 * GoogleCalendarService (skeleton)
 *
 * NOTE:
 * - This is a lightweight placeholder implementation meant to centralize
 *   Google Calendar logic. It currently returns a fake meeting link so that
 *   the rest of the system can work end-to-end.
 * - You can later replace the internals with real Google Calendar API calls
 *   using the `googleapis` package and OAuth tokens stored in the database.
 */

export interface CalendarEventInput {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees?: Array<{ email: string; name?: string }>;
  timeZone?: string;
}

export interface CalendarEventResult {
  eventId: string;
  meetingLink?: string;
  htmlLink?: string;
}

export class GoogleCalendarService {
  /**
   * Create a calendar event for a video interview.
   * Currently returns a fake Meet link and event id.
   */
  static async createVideoInterviewEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
    // In a real implementation, this is where you'd:
    // - Load OAuth tokens for the recruiter/company from DB
    // - Use googleapis to create a Calendar event with conferenceData
    // - Return the real eventId and hangoutLink

    const fakeEventId = `fake-event-${Date.now()}`;

    // Optional base URL from env for custom meeting providers
    const baseLink = process.env.GOOGLE_CALENDAR_MEETING_BASE_URL || 'https://meet.google.com';
    const fakeMeetingCode = Math.random().toString(36).substring(2, 8);
    const meetingLink = `${baseLink}/${fakeMeetingCode}`;

    console.log('[GoogleCalendarService] (stub) createVideoInterviewEvent called', {
      summary: input.summary,
      start: input.start.toISOString(),
      end: input.end.toISOString(),
      attendees: input.attendees?.map((a) => a.email),
      meetingLink,
    });

    return {
      eventId: fakeEventId,
      meetingLink,
      htmlLink: meetingLink,
    };
  }
}


