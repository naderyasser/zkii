/**
 * claim-legacy-data.ts — يورّث بيانات الـ legacy (DEFAULT_USER_ID) لإيميل الأدمن (idempotent).
 * يحدّث إيميل مستخدم الـ legacy لـ ADMIN_EMAIL، فيرث كل البيانات فوراً بدون نقل FK.
 *   ADMIN_EMAIL=you@gmail.com DATABASE_URL="file:/root/zkii/db/custom.db" bun scripts/claim-legacy-data.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const DEFAULT_USER_ID = 'cmp4wfs1q0000jkubmtfn4mhc';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

async function counts(userId: string) {
  const [pages, dbs, rows, tasks, projects, habits, tags] = await Promise.all([
    db.page.count({ where: { userId } }),
    db.database.count({ where: { userId } }),
    db.row.count({ where: { userId } }),
    db.task.count({ where: { userId } }),
    db.project.count({ where: { userId } }),
    db.habit.count({ where: { userId } }),
    db.tag.count({ where: { userId } }),
  ]);
  return { pages, dbs, rows, tasks, projects, habits, tags };
}

async function main() {
  if (!ADMIN_EMAIL) {
    console.error('[claim] ADMIN_EMAIL غير مضبوط — توقف.');
    process.exit(1);
  }
  const legacy = await db.user.findUnique({ where: { id: DEFAULT_USER_ID } });
  if (!legacy) {
    console.error(`[claim] legacy user ${DEFAULT_USER_ID} غير موجود.`);
    process.exit(1);
  }

  console.log('[claim] counts (before):', await counts(DEFAULT_USER_ID));

  if (legacy.email.toLowerCase() === ADMIN_EMAIL) {
    console.log(`[claim] already claimed by ${ADMIN_EMAIL} — idempotent no-op.`);
  } else {
    // تأكد إن مفيش مستخدم تاني بنفس الإيميل (unique)
    const clash = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
    if (clash && clash.id !== DEFAULT_USER_ID) {
      console.error(`[claim] مستخدم آخر (${clash.id}) عنده الإيميل ${ADMIN_EMAIL} — حُل التعارض يدوياً.`);
      process.exit(1);
    }
    await db.user.update({ where: { id: DEFAULT_USER_ID }, data: { email: ADMIN_EMAIL } });
    console.log(`[claim] legacy user adopted → email=${ADMIN_EMAIL}`);
  }

  console.log('[claim] inherited counts:', await counts(DEFAULT_USER_ID));
  console.log('[claim] done ✓');
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error('[claim] FAILED', e);
  await db.$disconnect();
  process.exit(1);
});
