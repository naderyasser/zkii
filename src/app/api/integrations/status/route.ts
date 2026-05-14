import { NextResponse } from 'next/server';
import { getOAuthStatus } from '@/lib/googleApi';

// ═══════════════════════════════════════════════════════════════════════════════
// Integration Status — Check if Google OAuth is connected
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const status = await getOAuthStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('[Integrations Status] Error:', error);
    return NextResponse.json(
      { connected: false, provider: 'google', error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
