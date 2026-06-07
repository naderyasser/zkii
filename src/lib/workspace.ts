// ═══════════════════════════════════════════════════════════════════════════════
// WORKSPACE (server) — helpers لإيجاد قواعد بيانات النظام للمستخدم (المهام/العادات…)
// ═══════════════════════════════════════════════════════════════════════════════
import { db } from './db';

// يرجّع صفحة-قاعدة-بيانات نظام بعنوان معيّن + الـ database. null لو مش موجودة.
export async function getSystemDatabasePage(userId: string, title: string) {
  const page = await db.page.findFirst({
    where: { userId, title, type: 'database', system: true, archivedAt: null },
    include: { database: true },
  });
  if (!page || !page.database) return null;
  return page;
}

export async function getTasksDatabase(userId: string) {
  return getSystemDatabasePage(userId, 'المهام');
}

export async function getHabitsDatabase(userId: string) {
  return getSystemDatabasePage(userId, 'العادات');
}
