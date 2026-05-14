import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/db';
import { DEFAULT_USER_ID } from '@/lib/task-utils';

// ═══════════════════════════════════════════════════════════════════════════════
// Google OAuth2 Disconnect — Revoke tokens & delete from DB
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST() {
  try {
    const oauthConfig = await db.oAuthConfig.findUnique({
      where: { userId: DEFAULT_USER_ID },
    });

    if (!oauthConfig) {
      return NextResponse.json(
        { error: 'No Google connection found' },
        { status: 404 }
      );
    }

    // Attempt to revoke the token at Google
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (clientId && clientSecret) {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        await oauth2Client.revokeToken(oauthConfig.accessToken);
        console.log('[OAuth Disconnect] Token revoked at Google');
      }
    } catch (revokeError) {
      // Non-fatal: token may already be expired or revoked
      console.warn('[OAuth Disconnect] Could not revoke token at Google:', revokeError);
    }

    // Delete the record from DB
    await db.oAuthConfig.delete({
      where: { userId: DEFAULT_USER_ID },
    });

    return NextResponse.json({ success: true, message: 'Google account disconnected' });
  } catch (error) {
    console.error('[OAuth Disconnect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Google account' },
      { status: 500 }
    );
  }
}
