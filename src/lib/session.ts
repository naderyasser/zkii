// ═══════════════════════════════════════════════════════════════════════════════
// SESSION + OWNERSHIP — عزل البيانات لكل مستخدم (server only)
// قاعدة أمنية: طلب مورد ملك مستخدم تاني = 404 (مش 403 — منأكدش وجوده).
// ═══════════════════════════════════════════════════════════════════════════════
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth-config';
import { db } from './db';

// userId من جلسة NextAuth، أو null لو مفيش جلسة
export async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

export function notFound(entity = 'Resource') {
  return NextResponse.json({ error: `${entity} not found` }, { status: 404 });
}

// ─── ملكية: ترجع السجل لو ملك المستخدم، وإلا null (الـ caller → 404) ──────────
export async function ownedPage(id: string, userId: string) {
  const page = await db.page.findUnique({ where: { id }, include: { database: true } });
  if (!page || page.userId !== userId) return null;
  return page;
}

export async function ownedDatabase(id: string, userId: string) {
  const database = await db.database.findUnique({ where: { id } });
  if (!database || database.userId !== userId) return null;
  return database;
}

export async function ownedRow(id: string, userId: string) {
  const row = await db.row.findUnique({ where: { id } });
  if (!row || row.userId !== userId) return null;
  return row;
}

// helpers للجداول القديمة
export async function ownedTask(id: string, userId: string) {
  const task = await db.task.findUnique({ where: { id } });
  if (!task || task.userId !== userId) return null;
  return task;
}
export async function ownedProject(id: string, userId: string) {
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.userId !== userId) return null;
  return project;
}
export async function ownedHabit(id: string, userId: string) {
  const habit = await db.habit.findUnique({ where: { id } });
  if (!habit || habit.userId !== userId) return null;
  return habit;
}
export async function ownedTag(id: string, userId: string) {
  const tag = await db.tag.findUnique({ where: { id } });
  if (!tag || tag.userId !== userId) return null;
  return tag;
}
