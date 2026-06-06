import { google } from 'googleapis';
import { db } from '@/lib/db';
import { DEFAULT_USER_ID } from '@/lib/task-utils';

// ═══════════════════════════════════════════════════════════════════════════════
// Google API Service — Server-side helper for Gmail & Calendar
// ═══════════════════════════════════════════════════════════════════════════════
// Manages token retrieval from Prisma, auto-refreshes expired tokens,
// and provides base functions for Gmail inbox scanning and Calendar events.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  subject: string;
  date: string;
  labels: string[];
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
}

export interface OAuthStatus {
  connected: boolean;
  provider: string;
  scopes: string[];
  expiryDate: Date | null;
  lastUpdated: Date | null;
}

// ─── OAuth2 Client Factory ──────────────────────────────────────────────────────

function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:1111/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// ─── Token Retrieval & Auto-Refresh ─────────────────────────────────────────────

/**
 * Get a valid OAuth2 client with fresh credentials.
 * Automatically refreshes the access token if it has expired.
 */
export async function getAuthenticatedClient(): Promise<{
  oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  tokens: { accessToken: string; refreshToken: string; expiryDate: Date | null; scopes: string };
}> {
  // Fetch stored tokens from Prisma
  const oauthConfig = await db.oAuthConfig.findUnique({
    where: { userId: DEFAULT_USER_ID },
  });

  if (!oauthConfig) {
    throw new Error('NOT_CONNECTED: Google account not linked. Visit /api/auth/google/login to connect.');
  }

  const oauth2Client = createOAuth2Client();

  // Set credentials on the client
  oauth2Client.setCredentials({
    access_token: oauthConfig.accessToken,
    refresh_token: oauthConfig.refreshToken,
    expiry_date: oauthConfig.expiryDate ? oauthConfig.expiryDate.getTime() : null,
    scope: oauthConfig.scopes,
  });

  // ─── Check if token is expired and auto-refresh ──────────────────────────────
  const isExpired = oauthConfig.expiryDate
    ? new Date() >= oauthConfig.expiryDate
    : true; // If no expiry date, assume expired

  if (isExpired) {
    try {
      console.log('[GoogleApi] Access token expired, refreshing...');
      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update the tokens in Prisma
      if (credentials.access_token) {
        await db.oAuthConfig.update({
          where: { userId: DEFAULT_USER_ID },
          data: {
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token || oauthConfig.refreshToken, // Keep old refresh if not returned
            expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
            scopes: credentials.scope || oauthConfig.scopes,
          },
        });

        // Update the client with new credentials
        oauth2Client.setCredentials(credentials);
        console.log('[GoogleApi] Token refreshed successfully');
      }
    } catch (refreshError) {
      console.error('[GoogleApi] Failed to refresh token:', refreshError);
      throw new Error('TOKEN_REFRESH_FAILED: Could not refresh Google access token. Re-authentication may be required.');
    }
  }

  return {
    oauth2Client,
    tokens: {
      accessToken: oauthConfig.accessToken,
      refreshToken: oauthConfig.refreshToken,
      expiryDate: oauthConfig.expiryDate,
      scopes: oauthConfig.scopes,
    },
  };
}

// ─── OAuth Status Check ─────────────────────────────────────────────────────────

/**
 * Check if Google OAuth is connected and tokens are valid.
 */
export async function getOAuthStatus(): Promise<OAuthStatus> {
  const oauthConfig = await db.oAuthConfig.findUnique({
    where: { userId: DEFAULT_USER_ID },
  });

  if (!oauthConfig) {
    return {
      connected: false,
      provider: 'google',
      scopes: [],
      expiryDate: null,
      lastUpdated: null,
    };
  }

  return {
    connected: true,
    provider: oauthConfig.provider,
    scopes: oauthConfig.scopes ? oauthConfig.scopes.split(' ').filter(Boolean) : [],
    expiryDate: oauthConfig.expiryDate,
    lastUpdated: oauthConfig.updatedAt,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Gmail Service — Scan inbox for actionable emails
// ═══════════════════════════════════════════════════════════════════════════════

export const GmailService = {
  /**
   * Scan the user's Gmail inbox using a search query.
   * Returns up to `maxResults` messages with parsed headers.
   *
   * @param query - Gmail search query (e.g., "is:unread newer_than:1d")
   * @param maxResults - Maximum number of messages to return (default: 3)
   */
  async scanInbox(query: string = 'is:unread newer_than:1d', maxResults: number = 3): Promise<GmailMessage[]> {
    const { oauth2Client } = await getAuthenticatedClient();
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // ─── Step 1: List messages matching the query ──────────────────────────────
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    const messages = listResponse.data.messages || [];
    if (messages.length === 0) {
      return [];
    }

    // ─── Step 2: Fetch full message details for each ───────────────────────────
    const detailedMessages: GmailMessage[] = [];

    for (const msg of messages) {
      if (!msg.id) continue;

      const messageDetail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });

      const headers = messageDetail.data.payload?.headers || [];
      const from = headers.find((h) => h.name === 'From')?.value || 'Unknown';
      const subject = headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
      const date = headers.find((h) => h.name === 'Date')?.value || '';

      detailedMessages.push({
        id: msg.id,
        threadId: msg.threadId || '',
        snippet: messageDetail.data.snippet || '',
        from,
        subject,
        date,
        labels: messageDetail.data.labelIds || [],
      });
    }

    return detailedMessages;
  },

  /**
   * Get a specific email by ID with full body content.
   */
  async getMessage(messageId: string): Promise<{
    id: string;
    from: string;
    subject: string;
    date: string;
    body: string;
    snippet: string;
  }> {
    const { oauth2Client } = await getAuthenticatedClient();
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const messageDetail = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const headers = messageDetail.data.payload?.headers || [];
    const from = headers.find((h) => h.name === 'From')?.value || 'Unknown';
    const subject = headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
    const date = headers.find((h) => h.name === 'Date')?.value || '';

    // Extract body text
    let body = '';
    const payload = messageDetail.data.payload;
    if (payload?.body?.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else if (payload?.parts) {
      const textPart = payload.parts.find(
        (p) => p.mimeType === 'text/plain' && p.body?.data
      );
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    return {
      id: messageId,
      from,
      subject,
      date,
      body,
      snippet: messageDetail.data.snippet || '',
    };
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Calendar Service — Get today's events
// ═══════════════════════════════════════════════════════════════════════════════

export const CalendarService = {
  /**
   * Get today's calendar events.
   * Returns events from 00:00 to 23:59:59 of the current day.
   */
  async getTodayEvents(): Promise<CalendarEvent[]> {
    const { oauth2Client } = await getAuthenticatedClient();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // ─── Define today's time range ─────────────────────────────────────────────
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 20,
    });

    const events = response.data.items || [];

    return events.map((event) => ({
      id: event.id || '',
      summary: event.summary || '(No title)',
      description: event.description || undefined,
      start: {
        dateTime: event.start?.dateTime || undefined,
        date: event.start?.date || undefined,
      },
      end: {
        dateTime: event.end?.dateTime || undefined,
        date: event.end?.date || undefined,
      },
      location: event.location || undefined,
      attendees: event.attendees?.map((a) => ({
        email: a.email || '',
        displayName: a.displayName || undefined,
      })),
    }));
  },

  /**
   * Get events for a specific date range.
   */
  async getEventsByRange(start: Date, end: Date, maxResults: number = 20): Promise<CalendarEvent[]> {
    const { oauth2Client } = await getAuthenticatedClient();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults,
    });

    const events = response.data.items || [];

    return events.map((event) => ({
      id: event.id || '',
      summary: event.summary || '(No title)',
      description: event.description || undefined,
      start: {
        dateTime: event.start?.dateTime || undefined,
        date: event.start?.date || undefined,
      },
      end: {
        dateTime: event.end?.dateTime || undefined,
        date: event.end?.date || undefined,
      },
      location: event.location || undefined,
      attendees: event.attendees?.map((a) => ({
        email: a.email || '',
        displayName: a.displayName || undefined,
      })),
    }));
  },
};
