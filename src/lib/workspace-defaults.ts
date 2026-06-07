// ═══════════════════════════════════════════════════════════════════════════════
// WORKSPACE DEFAULTS — schemas الافتراضية للـ databases + bootstrap لمستخدم جديد
// مشترك بين migrate-to-pages وbootstrapNewUser. أيقونات lucide:* (هوية المتحف).
// ═══════════════════════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';

type Prop = { id: string; name: string; type: string; options?: { id: string; name: string; color?: string }[] };
type View = { id: string; name: string; type: string; filters: unknown[]; sorts: unknown[]; groupBy: string | null };

export const TASKS_PROPS: Prop[] = [
  { id: 'title', name: 'الاسم', type: 'text' },
  { id: 'status', name: 'الحالة', type: 'select', options: [
    { id: 'pending', name: 'معلّقة', color: '#7c2f2a' },
    { id: 'done', name: 'منجزة', color: '#56603f' },
    { id: 'cancelled', name: 'ملغاة', color: '#6e6550' },
  ] },
  { id: 'priority', name: 'الأولوية', type: 'select', options: [
    { id: 'urgent', name: 'عاجل', color: '#8e3b2f' },
    { id: 'high', name: 'عالي', color: '#b5702e' },
    { id: 'medium', name: 'متوسط', color: '#a8853b' },
    { id: 'low', name: 'منخفض', color: '#56603f' },
  ] },
  { id: 'due', name: 'التاريخ', type: 'date' },
  { id: 'category', name: 'التصنيف', type: 'text' },
  { id: 'project', name: 'المشروع', type: 'select', options: [] },
  { id: 'tags', name: 'الوسوم', type: 'multiSelect', options: [] },
];

export const TASKS_VIEWS: View[] = [
  { id: 'table', name: 'جدول', type: 'table', filters: [], sorts: [], groupBy: null },
  { id: 'kanban', name: 'كانبان', type: 'kanban', filters: [], sorts: [], groupBy: 'status' },
  { id: 'calendar', name: 'تقويم', type: 'calendar', filters: [], sorts: [], groupBy: null },
];

export const PROJECTS_PROPS: Prop[] = [
  { id: 'title', name: 'الاسم', type: 'text' },
  { id: 'description', name: 'الوصف', type: 'text' },
];

export const HABITS_PROPS: Prop[] = [
  { id: 'title', name: 'الاسم', type: 'text' },
  { id: 'description', name: 'الوصف', type: 'text' },
  { id: 'frequency', name: 'التكرار', type: 'select', options: [
    { id: 'daily', name: 'يومي', color: '#56603f' },
    { id: 'weekly', name: 'أسبوعي', color: '#7c2f2a' },
    { id: 'custom', name: 'مخصّص', color: '#a8853b' },
  ] },
  { id: 'target', name: 'الهدف', type: 'number' },
];

export const TABLE_VIEW: View[] = [{ id: 'table', name: 'جدول', type: 'table', filters: [], sorts: [], groupBy: null }];

async function createDbPage(
  db: PrismaClient,
  userId: string,
  title: string,
  icon: string,
  properties: Prop[],
  views: View[],
  position: number
) {
  // idempotent: متعملش لو موجودة بنفس العنوان
  const existing = await db.page.findFirst({
    where: { userId, title, type: 'database', archivedAt: null },
  });
  if (existing) return;
  await db.page.create({
    data: {
      title, icon, type: 'database', userId, position, system: true,
      database: { create: { userId, properties: JSON.stringify(properties), views: JSON.stringify(views) } },
    },
  });
}

// صفحة أداة نظام (التركيز/التحليلات/شات) — لينك مؤقت للأدوات القديمة
async function createToolPage(db: PrismaClient, userId: string, title: string, icon: string, label: string, position: number) {
  const existing = await db.page.findFirst({ where: { userId, title, type: 'page', archivedAt: null } });
  if (existing) return;
  await db.page.create({
    data: {
      title, icon, type: 'page', userId, position, system: true,
      content: JSON.stringify([
        { type: 'paragraph', content: `${label} متاحة حالياً في الأدوات القديمة.` },
        { type: 'paragraph', content: [{ type: 'link', href: '/legacy', content: 'افتح الأداة ↗' }] },
      ]),
    },
  });
}

// ينشئ workspace افتراضي فاضي لمستخدم جديد (idempotent)
export async function bootstrapNewUser(db: PrismaClient, userId: string) {
  // صفحة ترحيب
  const welcome = await db.page.findFirst({ where: { userId, title: 'مرحباً بك', type: 'page', archivedAt: null } });
  if (!welcome) {
    await db.page.create({
      data: {
        title: 'مرحباً بك', icon: 'lucide:BookOpen', type: 'page', userId, position: 0,
        content: JSON.stringify([
          { type: 'heading', props: { level: 1 }, content: 'أهلاً في زكي' },
          { type: 'paragraph', content: 'دي مساحتك الخاصة. ابدأ بإنشاء صفحة من الشريط الجانبي، أو اكتب «/» للأوامر.' },
        ]),
      },
    });
  }
  await createDbPage(db, userId, 'المهام', 'lucide:ListTodo', TASKS_PROPS, TASKS_VIEWS, 1);
  await createDbPage(db, userId, 'المشاريع', 'lucide:Folder', PROJECTS_PROPS, TABLE_VIEW, 2);
  await createDbPage(db, userId, 'العادات', 'lucide:Repeat', HABITS_PROPS, TABLE_VIEW, 3);
  await createToolPage(db, userId, 'التركيز', 'lucide:Target', 'أداة التركيز (Pomodoro)', 4);
  await createToolPage(db, userId, 'التحليلات', 'lucide:BarChart3', 'لوحة التحليلات والـ heatmap', 5);
  await createToolPage(db, userId, 'شات زكي', 'lucide:MessageSquare', 'محادثة زكي', 6);
}
