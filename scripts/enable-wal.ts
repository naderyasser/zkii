/**
 * enable-wal.ts — يفعّل WAL على SQLite (أفضل للقراءة/الكتابة المتزامنة لعدة مستخدمين).
 *   DATABASE_URL="file:/root/zkii/db/custom.db" bun scripts/enable-wal.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const before = await db.$queryRawUnsafe<{ journal_mode: string }[]>('PRAGMA journal_mode;');
  console.log('[wal] before:', before);
  const res = await db.$queryRawUnsafe<{ journal_mode: string }[]>('PRAGMA journal_mode=WAL;');
  console.log('[wal] set →', res);
  await db.$executeRawUnsafe('PRAGMA synchronous=NORMAL;');
  const after = await db.$queryRawUnsafe<{ journal_mode: string }[]>('PRAGMA journal_mode;');
  console.log('[wal] after:', after);
  const mode = after?.[0]?.journal_mode?.toLowerCase();
  console.log(mode === 'wal' ? '[wal] ✓ WAL enabled' : `[wal] ⚠ mode=${mode}`);
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error('[wal] FAILED', e);
  await db.$disconnect();
  process.exit(1);
});
