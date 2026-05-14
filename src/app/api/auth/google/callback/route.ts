import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/db';
import { DEFAULT_USER_ID } from '@/lib/task-utils';

// ═══════════════════════════════════════════════════════════════════════════════
// Google OAuth2 Callback — Exchange code for tokens & store in DB
// ═══════════════════════════════════════════════════════════════════════════════
// Handles the redirect from Google after user grants consent.
// Exchanges the authorization code for access_token + refresh_token.
// Stores or updates the tokens in the OAuthConfig Prisma model.
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // ─── Handle user denial or errors ────────────────────────────────────────────
  if (error) {
    return NextResponse.redirect(
      new URL(`/?oauth_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/?oauth_error=no_code', request.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env' },
      { status: 500 }
    );
  }

  try {
    // ─── Create OAuth2 client and exchange code for tokens ────────────────────
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        new URL('/?oauth_error=missing_tokens', request.url)
      );
    }

    // ─── Store or update tokens in Prisma ─────────────────────────────────────
    const userId = DEFAULT_USER_ID;
    const existing = await db.oAuthConfig.findUnique({
      where: { userId },
    });

    if (existing) {
      // Update existing record
      await db.oAuthConfig.update({
        where: { userId },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          scopes: tokens.scope || '',
          provider: 'google',
        },
      });
    } else {
      // Create new record
      await db.oAuthConfig.create({
        data: {
          userId,
          provider: 'google',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          scopes: tokens.scope || '',
        },
      });
    }

    // ─── Redirect back to app with success flag ──────────────────────────────
    return NextResponse.redirect(
      new URL('/?oauth_success=google', request.url)
    );
  } catch (err) {
    console.error('[OAuth Callback] Error exchanging code for tokens:', err);
    return NextResponse.redirect(
      new URL(`/?oauth_error=${encodeURIComponent('token_exchange_failed')}`, request.url)
    );
  }
}
