import { NextResponse } from 'next/server';
import { getOAuthStatus } from '@/lib/googleApi';
import { getUserId, unauthorized } from '@/lib/session';
import { DEFAULT_USER_ID } from '@/lib/task-utils';

// ═══════════════════════════════════════════════════════════════════════════════
// Integration Status — حالة ربط Google (تكامل Gmail/Calendar مربوط بالأدمن حالياً)
// ═══════════════════════════════════════════════════════════════════════════════
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();
    // التكامل متاح للأدمن فقط — غيره يشوف «غير متصل»
    if (userId !== DEFAULT_USER_ID) {
      return NextResponse.json({ connected: false, provider: 'google', scopes: [] });
    }
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
