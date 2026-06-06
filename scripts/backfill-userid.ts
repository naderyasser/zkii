/**
 * backfill-userid.ts — يملأ Database.userId و Row.userId من الصفحة الأم (idempotent).
 * يشتغل بأمان متكرر (where userId=null فقط).
 *   DATABASE_URL="file:/root/zkii/db/custom.db" bun scripts/backfill-userid.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('[backfill] start');

  // Database.userId = الصفحة الأم
  const dbs = await db.database.findMany({
    where: { userId: null },
    include: { page: { select: { userId: true } } },
  });
  let dbCount = 0;
  for (const d of dbs) {
    if (d.page?.userId) {
      await db.database.update({ where: { id: d.id }, data: { userId: d.page.userId } });
      dbCount++;
    }
  }
  console.log(`[backfill] Database.userId set: ${dbCount}/${dbs.length}`);

  // Row.userId = database → page
  const rows = await db.row.findMany({
    where: { userId: null },
    include: { database: { select: { userId: true } } },
  });
  let rowCount = 0;
  for (const r of rows) {
    if (r.database?.userId) {
      await db.row.update({ where: { id: r.id }, data: { userId: r.database.userId } });
      rowCount++;
    }
  }
  console.log(`[backfill] Row.userId set: ${rowCount}/${rows.length}`);

  // تحقق: أي سجلات لسه null؟
  const dbNull = await db.database.count({ where: { userId: null } });
  const rowNull = await db.row.count({ where: { userId: null } });
  console.log(`[backfill] remaining null — Database: ${dbNull}, Row: ${rowNull}`);
  console.log('[backfill] done ✓');
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error('[backfill] FAILED', e);
  await db.$disconnect();
  process.exit(1);
});
