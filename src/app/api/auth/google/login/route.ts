import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// ═══════════════════════════════════════════════════════════════════════════════
// Google OAuth2 Login — Generate Authorization URL & Redirect
// ═══════════════════════════════════════════════════════════════════════════════
// Scopes: Gmail readonly + Calendar events readonly
// access_type=offline + prompt=consent → ensures we always get a refresh_token
// ═══════════════════════════════════════════════════════════════════════════════

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
];

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:1111/api/auth/google/callback';

  // ─── Validate environment variables ──────────────────────────────────────────
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error: 'Google OAuth not configured',
        message: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env',
        hint: 'Visit Google Cloud Console → APIs & Services → Credentials to obtain these values.',
      },
      { status: 500 }
    );
  }

  // ─── Create OAuth2 client ────────────────────────────────────────────────────
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  // ─── Generate authorization URL ──────────────────────────────────────────────
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',   // Required to get refresh_token
    prompt: 'consent',        // Force consent screen → always get refresh_token
    scope: SCOPES,
    // Include state parameter for CSRF protection (single user → simple token)
    state: 'zaki_oauth_' + Date.now(),
  });

  // Redirect the user to Google's consent screen
  return NextResponse.redirect(authUrl);
}
