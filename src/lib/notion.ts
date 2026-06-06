// ═══════════════════════════════════════════════════════════════════════════════
// NOTION-LIKE HELPERS — أنواع وأدوات مشتركة لصفحات/قواعد بيانات الـ workspace
// ═══════════════════════════════════════════════════════════════════════════════
import type { Page as PrismaPage, Database as PrismaDatabase, Row as PrismaRow } from '@prisma/client';

// ─── أنواع الخصائص والعروض ────────────────────────────────────────────────────
export type PropertyType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiSelect'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'relation';

export interface SelectOption {
  id: string;
  name: string;
  color?: string;
}

export interface PropertyDef {
  id: string;
  name: string;
  type: PropertyType;
  options?: SelectOption[]; // للـ select / multiSelect
}

export type ViewType = 'table' | 'kanban' | 'calendar' | 'list';

export interface ViewDef {
  id: string;
  name: string;
  type: ViewType;
  filters?: unknown[];
  sorts?: unknown[];
  groupBy?: string | null; // propId (للـ kanban)
}

// ─── شكل الـ Page بعد التسلسل للـ client ───────────────────────────────────────
export interface SerializedPage {
  id: string;
  title: string;
  icon: string | null;
  coverUrl: string | null;
  coverMeta: string | null;
  palette: string | null;
  parentId: string | null;
  type: string;
  content: string | null;
  position: number;
  isFavorite: boolean;
  archivedAt: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  hasDatabase?: boolean;
}

export interface PageTreeNode extends SerializedPage {
  children: PageTreeNode[];
}

// ─── خصائص/عروض افتراضية لقاعدة بيانات جديدة ───────────────────────────────────
export function defaultProperties(): PropertyDef[] {
  return [
    { id: 'title', name: 'الاسم', type: 'text' },
    {
      id: 'status',
      name: 'الحالة',
      type: 'select',
      options: [
        { id: 'todo', name: 'للتنفيذ', color: '#7aa2f7' },
        { id: 'doing', name: 'جاري', color: '#e0af68' },
        { id: 'done', name: 'تم', color: '#9ece6a' },
      ],
    },
  ];
}

export function defaultViews(): ViewDef[] {
  return [{ id: 'default', name: 'جدول', type: 'table', filters: [], sorts: [], groupBy: null }];
}

// ─── parse/serialize آمن للـ JSON المخزّن كـ string ────────────────────────────
export function safeParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function serializePage(
  page: PrismaPage & { database?: PrismaDatabase | null }
): SerializedPage {
  return {
    id: page.id,
    title: page.title,
    icon: page.icon,
    coverUrl: page.coverUrl,
    coverMeta: page.coverMeta,
    palette: page.palette,
    parentId: page.parentId,
    type: page.type,
    content: page.content,
    position: page.position,
    isFavorite: page.isFavorite,
    archivedAt: page.archivedAt ? page.archivedAt.toISOString() : null,
    userId: page.userId,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
    hasDatabase: page.database != null ? true : undefined,
  };
}

export interface SerializedDatabase {
  id: string;
  pageId: string;
  properties: PropertyDef[];
  views: ViewDef[];
}

export function serializeDatabase(database: PrismaDatabase): SerializedDatabase {
  return {
    id: database.id,
    pageId: database.pageId,
    properties: safeParse<PropertyDef[]>(database.properties, []),
    views: safeParse<ViewDef[]>(database.views, []),
  };
}

export interface SerializedRow {
  id: string;
  databaseId: string;
  properties: Record<string, unknown>;
  pageId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export function serializeRow(row: PrismaRow): SerializedRow {
  return {
    id: row.id,
    databaseId: row.databaseId,
    properties: safeParse<Record<string, unknown>>(row.properties, {}),
    pageId: row.pageId,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── بناء شجرة من قائمة صفحات مسطّحة ────────────────────────────────────────────
export function buildTree(pages: SerializedPage[]): PageTreeNode[] {
  const byId = new Map<string, PageTreeNode>();
  const roots: PageTreeNode[] = [];
  for (const p of pages) byId.set(p.id, { ...p, children: [] });
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (nodes: PageTreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}
