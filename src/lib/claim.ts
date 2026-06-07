// ═══════════════════════════════════════════════════════════════════════════════
// CLAIM + RESOLVE USER — يربط إيميل Google بمستخدم DB، ويورّث بيانات الأدمن.
// ═══════════════════════════════════════════════════════════════════════════════
import { db } from './db';
import { DEFAULT_USER_ID } from './task-utils';
import { bootstrapNewUser } from './workspace-defaults';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

// يطبع counts البيانات المملوكة لمستخدم (للتحقق من التوريث)
export async function logOwnedCounts(userId: string, label: string) {
  const [pages, dbs, rows, tasks, projects, habits, tags] = await Promise.all([
    db.page.count({ where: { userId } }),
    db.database.count({ where: { userId } }),
    db.row.count({ where: { userId } }),
    db.task.count({ where: { userId } }),
    db.project.count({ where: { userId } }),
    db.habit.count({ where: { userId } }),
    db.tag.count({ where: { userId } }),
  ]);
  console.log(`[claim] ${label} userId=${userId} → pages=${pages} databases=${dbs} rows=${rows} tasks=${tasks} projects=${projects} habits=${habits} tags=${tags}`);
}

/**
 * resolveUser — يحوّل (email,name) إلى userId ثابت:
 *  (a) مستخدم بنفس الإيميل موجود → استخدمه.
 *  (b) email === ADMIN_EMAIL → تبنّي مستخدم الـ legacy (DEFAULT_USER_ID) عبر تحديث إيميله،
 *      فيرث كل البيانات الحالية فوراً بدون نقل FK (idempotent).
 *  (c) غير ذلك → أنشئ مستخدم جديد + bootstrap workspace فاضي.
 */
export async function resolveUser(email: string, name?: string | null): Promise<string> {
  const normalized = email.trim().toLowerCase();

  const existing = await db.user.findUnique({ where: { email: normalized } });
  if (existing) return existing.id;

  // (b) تبنّي الـ legacy user للأدمن
  if (ADMIN_EMAIL && normalized === ADMIN_EMAIL) {
    const legacy = await db.user.findUnique({ where: { id: DEFAULT_USER_ID } });
    if (legacy) {
      await db.user.update({ where: { id: DEFAULT_USER_ID }, data: { email: normalized, name: name || legacy.name } });
      console.log(`[claim] ADMIN adopted legacy user ${DEFAULT_USER_ID} via email ${normalized}`);
      await logOwnedCounts(DEFAULT_USER_ID, 'inherited');
      return DEFAULT_USER_ID;
    }
  }

  // (c) مستخدم جديد + workspace فاضي
  const created = await db.user.create({ data: { email: normalized, name: name || normalized.split('@')[0] } });
  await bootstrapNewUser(db, created.id);
  console.log(`[claim] new user ${created.id} (${normalized}) bootstrapped`);
  return created.id;
}
