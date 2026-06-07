/**
 * migrate-to-pages.ts — نقل البيانات القديمة (Task/Project/Habit) إلى صفحات/قواعد بيانات Notion.
 * آمن وidempotent: يُعاد تشغيله بدون تكرار (يعتمد على markers مخزّنة في خصائص الصف).
 *
 * التشغيل:
 *   DATABASE_URL="file:/root/zkii/db/custom.db" bun scripts/migrate-to-pages.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const USER_ID = 'cmp4wfs1q0000jkubmtfn4mhc'; // DEFAULT_USER_ID

type Prop = { id: string; name: string; type: string; options?: { id: string; name: string; color?: string }[] };
type View = { id: string; name: string; type: string; filters: unknown[]; sorts: unknown[]; groupBy: string | null };

function log(msg: string) { console.log(`[migrate] ${msg}`); }

// إيجاد أو إنشاء صفحة-قاعدة-بيانات بعنوان ثابت (idempotent)
async function findOrCreateDatabasePage(opts: {
  title: string;
  icon: string;
  properties: Prop[];
  views: View[];
}) {
  let page = await db.page.findFirst({
    where: { userId: USER_ID, title: opts.title, type: 'database', archivedAt: null },
    include: { database: true },
  });

  if (!page) {
    const last = await db.page.findFirst({ where: { userId: USER_ID, parentId: null }, orderBy: { position: 'desc' } });
    page = await db.page.create({
      data: {
        title: opts.title,
        icon: opts.icon,
        type: 'database',
        system: true,
        userId: USER_ID,
        position: (last?.position ?? 0) + 1,
        database: { create: { properties: JSON.stringify(opts.properties), views: JSON.stringify(opts.views) } },
      },
      include: { database: true },
    });
    log(`created database page «${opts.title}»`);
  } else if (page.database) {
    // حدّث الخصائص (مثلاً خيارات المشاريع/الوسوم الجديدة) مع الحفاظ على نفس الـ ids
    await db.database.update({
      where: { id: page.database.id },
      data: { properties: JSON.stringify(opts.properties) },
    });
  }
  return page.database!;
}

// إيجاد أو إنشاء صفحة عادية (للأدوات) idempotent
async function findOrCreatePage(title: string, icon: string, content?: string) {
  const existing = await db.page.findFirst({
    where: { userId: USER_ID, title, type: 'page', archivedAt: null },
  });
  if (existing) return existing;
  const last = await db.page.findFirst({ where: { userId: USER_ID, parentId: null }, orderBy: { position: 'desc' } });
  const page = await db.page.create({
    data: { title, icon, type: 'page', system: true, userId: USER_ID, position: (last?.position ?? 0) + 1, content: content ?? null },
  });
  log(`created tool page «${title}»`);
  return page;
}

// إنشاء صف لو الـ marker مش موجود
async function upsertRow(databaseId: string, markerKey: string, markerVal: string, properties: Record<string, unknown>) {
  const rows = await db.row.findMany({ where: { databaseId } });
  const exists = rows.find((r) => {
    try { return (JSON.parse(r.properties) as Record<string, unknown>)[markerKey] === markerVal; }
    catch { return false; }
  });
  if (exists) return false;
  const last = rows.reduce((m, r) => Math.max(m, r.position), 0);
  await db.row.create({
    data: { databaseId, properties: JSON.stringify({ ...properties, [markerKey]: markerVal }), position: last + 1 },
  });
  return true;
}

async function main() {
  log('start');

  // ─── جهّز خيارات المشاريع والوسوم (للـ select/multiSelect في المهام) ───────────
  const projects = await db.project.findMany({ where: { userId: USER_ID } });
  const tags = await db.tag.findMany({ where: { userId: USER_ID } });
  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name, color: p.color }));
  const tagOptions = tags.map((t) => ({ id: t.id, name: t.name, color: t.color }));

  const defaultViews: View[] = [
    { id: 'table', name: 'جدول', type: 'table', filters: [], sorts: [], groupBy: null },
  ];

  // ═══ 📋 المهام ═══
  const tasksDbProps: Prop[] = [
    { id: 'title', name: 'الاسم', type: 'text' },
    { id: 'status', name: 'الحالة', type: 'select', options: [
      { id: 'pending', name: 'معلّقة', color: '#7aa2f7' },
      { id: 'done', name: 'منجزة', color: '#9ece6a' },
      { id: 'cancelled', name: 'ملغاة', color: '#565f89' },
    ] },
    { id: 'priority', name: 'الأولوية', type: 'select', options: [
      { id: 'urgent', name: 'عاجل', color: '#e94560' },
      { id: 'high', name: 'عالي', color: '#ff9e64' },
      { id: 'medium', name: 'متوسط', color: '#e0af68' },
      { id: 'low', name: 'منخفض', color: '#73daca' },
    ] },
    { id: 'due', name: 'التاريخ', type: 'date' },
    { id: 'category', name: 'التصنيف', type: 'text' },
    { id: 'project', name: 'المشروع', type: 'select', options: projectOptions },
    { id: 'tags', name: 'الوسوم', type: 'multiSelect', options: tagOptions },
  ];
  const tasksViews: View[] = [
    { id: 'table', name: 'جدول', type: 'table', filters: [], sorts: [], groupBy: null },
    { id: 'kanban', name: 'كانبان', type: 'kanban', filters: [], sorts: [], groupBy: 'status' },
    { id: 'calendar', name: 'تقويم', type: 'calendar', filters: [], sorts: [], groupBy: null },
  ];
  const tasksDb = await findOrCreateDatabasePage({ title: 'المهام', icon: 'lucide:ListTodo', properties: tasksDbProps, views: tasksViews });

  const tasks = await db.task.findMany({ where: { userId: USER_ID }, include: { tags: true } });
  let tCount = 0;
  for (const t of tasks) {
    const created = await upsertRow(tasksDb.id, '_taskId', t.id, {
      title: t.title,
      status: t.status,
      priority: t.priority,
      due: t.dueDatetime ? t.dueDatetime.toISOString().slice(0, 10) : null,
      category: t.category,
      project: t.projectId ?? null,
      tags: t.tags.map((tt) => tt.tagId),
    });
    if (created) tCount++;
  }
  log(`tasks migrated: ${tCount} new (of ${tasks.length})`);

  // ═══ 📁 المشاريع ═══
  const projDbProps: Prop[] = [
    { id: 'title', name: 'الاسم', type: 'text' },
    { id: 'description', name: 'الوصف', type: 'text' },
    { id: 'icon', name: 'الأيقونة', type: 'text' },
  ];
  const projDb = await findOrCreateDatabasePage({ title: 'المشاريع', icon: 'lucide:Folder', properties: projDbProps, views: defaultViews });
  let pCount = 0;
  for (const p of projects) {
    const created = await upsertRow(projDb.id, '_projectId', p.id, {
      title: p.name, description: p.description, icon: p.icon,
    });
    if (created) pCount++;
  }
  log(`projects migrated: ${pCount} new (of ${projects.length})`);

  // ═══ 🔁 العادات ═══
  const habitDbProps: Prop[] = [
    { id: 'title', name: 'الاسم', type: 'text' },
    { id: 'description', name: 'الوصف', type: 'text' },
    { id: 'frequency', name: 'التكرار', type: 'select', options: [
      { id: 'daily', name: 'يومي', color: '#9ece6a' },
      { id: 'weekly', name: 'أسبوعي', color: '#7aa2f7' },
      { id: 'custom', name: 'مخصّص', color: '#bb9af7' },
    ] },
    { id: 'target', name: 'الهدف', type: 'number' },
  ];
  const habitDb = await findOrCreateDatabasePage({ title: 'العادات', icon: 'lucide:Repeat', properties: habitDbProps, views: defaultViews });
  const habits = await db.habit.findMany({ where: { userId: USER_ID } });
  let hCount = 0;
  for (const h of habits) {
    const created = await upsertRow(habitDb.id, '_habitId', h.id, {
      title: h.name, description: h.description, frequency: h.frequency, target: h.targetCount,
    });
    if (created) hCount++;
  }
  log(`habits migrated: ${hCount} new (of ${habits.length})`);

  // ═══ صفحات الأدوات (روابط للأدوات القديمة مؤقتاً) ═══
  const toolNote = (label: string, href: string) =>
    JSON.stringify([
      { type: 'paragraph', content: `${label} متاحة حالياً في الأدوات القديمة.` },
      { type: 'paragraph', content: [{ type: 'link', href, content: 'افتح الأداة ↗' }] },
    ]);
  await findOrCreatePage('التركيز', 'lucide:Target', toolNote('أداة التركيز (Pomodoro)', '/legacy'));
  await findOrCreatePage('التحليلات', 'lucide:BarChart3', toolNote('لوحة التحليلات والـ heatmap', '/legacy'));
  await findOrCreatePage('شات زكي', 'lucide:MessageSquare', toolNote('محادثة زكي', '/legacy'));

  log('done ✓');
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error('[migrate] FAILED', e);
  await db.$disconnect();
  process.exit(1);
});
