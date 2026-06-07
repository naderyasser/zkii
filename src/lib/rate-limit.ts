// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMIT — حد لكل مستخدم على نافذة زمنية (نمط cache في art.ts)
// ═══════════════════════════════════════════════════════════════════════════════

const WINDOW_MS = 60 * 60 * 1000; // ساعة
const buckets = new Map<string, number[]>(); // userId → timestamps

export interface RateResult {
  ok: boolean;
  remaining: number;
  limit: number;
  retryAfterSec?: number;
}

// يتحقق ويسجّل محاولة. limit من CHAT_RATE_LIMIT_PER_HOUR (افتراضي 30).
export function checkRateLimit(userId: string, limit?: number): RateResult {
  const max = limit ?? (Number(process.env.CHAT_RATE_LIMIT_PER_HOUR) || 30);
  const now = Date.now();
  const arr = (buckets.get(userId) || []).filter((t) => now - t < WINDOW_MS);

  if (arr.length >= max) {
    const oldest = arr[0];
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - oldest)) / 1000);
    buckets.set(userId, arr);
    return { ok: false, remaining: 0, limit: max, retryAfterSec };
  }

  arr.push(now);
  buckets.set(userId, arr);
  return { ok: true, remaining: max - arr.length, limit: max };
}
