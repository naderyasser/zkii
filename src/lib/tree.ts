// ═══════════════════════════════════════════════════════════════════════════════
// TREE HELPERS — تسطيح شجرة الصفحات + إسقاط العمق للـ drag & drop (نمط dnd-kit)
// client-safe (لا يستورد prisma)
// ═══════════════════════════════════════════════════════════════════════════════
import { arrayMove } from '@dnd-kit/sortable';
import type { WorkspacePageNode } from '@/types';

export interface FlatItem {
  id: string;
  parentId: string | null;
  depth: number;
  hasChildren: boolean;
  collapsed: boolean;
  node: WorkspacePageNode;
}

// تسطيح الشجرة لقائمة مرئية (نخفي أبناء العقد المطويّة)
export function flattenTree(
  nodes: WorkspacePageNode[],
  collapsed: Set<string>,
  parentId: string | null = null,
  depth = 0
): FlatItem[] {
  const out: FlatItem[] = [];
  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(node.id);
    out.push({ id: node.id, parentId, depth, hasChildren, collapsed: isCollapsed, node });
    if (hasChildren && !isCollapsed) {
      out.push(...flattenTree(node.children, collapsed, node.id, depth + 1));
    }
  }
  return out;
}

export interface Projection {
  depth: number;
  parentId: string | null;
}

// حساب العمق/الأب المتوقّع أثناء السحب — مقتبس من مثال dnd-kit sortable tree
export function getProjection(
  items: FlatItem[],
  activeId: string,
  overId: string,
  dragOffsetX: number,
  indentWidth: number
): Projection {
  const overIndex = items.findIndex((i) => i.id === overId);
  const activeIndex = items.findIndex((i) => i.id === activeId);
  if (overIndex === -1 || activeIndex === -1) return { depth: 0, parentId: null };

  const activeItem = items[activeIndex];
  const newItems = arrayMove(items, activeIndex, overIndex);
  const prevItem = newItems[overIndex - 1];
  const nextItem = newItems[overIndex + 1];

  const dragDepth = Math.round(dragOffsetX / indentWidth);
  const projectedDepth = activeItem.depth + dragDepth;
  const maxDepth = prevItem ? prevItem.depth + 1 : 0;
  const minDepth = nextItem ? nextItem.depth : 0;

  let depth = projectedDepth;
  if (depth > maxDepth) depth = maxDepth;
  else if (depth < minDepth) depth = minDepth;

  const getParentId = (): string | null => {
    if (depth === 0 || !prevItem) return null;
    if (depth === prevItem.depth) return prevItem.parentId;
    if (depth > prevItem.depth) return prevItem.id;
    const parent = newItems
      .slice(0, overIndex)
      .reverse()
      .find((i) => i.depth === depth)?.parentId;
    return parent ?? null;
  };

  return { depth, parentId: getParentId() };
}

// حساب position كسري بين الجارين الجداد تحت نفس الأب (يسمح بإعادة ترتيب لا نهائية)
export function computePosition(
  items: FlatItem[],
  activeId: string,
  overId: string,
  newParentId: string | null
): number {
  const overIndex = items.findIndex((i) => i.id === overId);
  const activeIndex = items.findIndex((i) => i.id === activeId);
  const newItems = arrayMove(items, activeIndex, overIndex).filter((i) => i.id !== activeId);
  // أدرج active منطقياً عند overIndex المعدّل
  const insertAt = newItems.findIndex((i) => i.id === overId) + (activeIndex < overIndex ? 1 : 0);
  const ordered = [...newItems];
  ordered.splice(insertAt, 0, items[activeIndex]);

  const siblings = ordered.filter((i) => i.parentId === newParentId || i.id === activeId);
  const pos = siblings.findIndex((i) => i.id === activeId);
  const prev = siblings[pos - 1];
  const next = siblings[pos + 1];
  const prevPos = prev ? prev.node.position : null;
  const nextPos = next ? next.node.position : null;

  if (prevPos !== null && nextPos !== null) return (prevPos + nextPos) / 2;
  if (prevPos !== null) return prevPos + 1;
  if (nextPos !== null) return nextPos - 1;
  return 0;
}
