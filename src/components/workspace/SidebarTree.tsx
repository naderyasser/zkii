'use client';

import { useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, ChevronDown, Plus, Star, Trash2 } from 'lucide-react';
import { flattenTree, getProjection, computePosition, type FlatItem } from '@/lib/tree';
import { useMovePage, useCreatePage, useArchivePage, useUpdatePage } from '@/hooks/usePages';
import PageIcon from './PageIcon';
import type { WorkspacePageNode } from '@/types';

const INDENT = 14;

interface RowProps {
  item: FlatItem;
  depth: number;
  active: boolean;
  onToggle: (id: string) => void;
  onNavigate: (id: string) => void;
  onAddChild: (id: string) => void;
  onArchive: (id: string) => void;
  onFavorite: (id: string, val: boolean) => void;
}

function TreeRow({ item, depth, active, onToggle, onNavigate, onAddChild, onArchive, onFavorite }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    paddingInlineStart: depth * INDENT + 6,
  };
  const node = item.node;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1 rounded-md pe-1 py-[5px] text-[13px] select-none cursor-pointer
        ${active ? 'bg-elevated text-koala-bright' : 'text-koala-primary hover:bg-hover'}
        ${isDragging ? 'opacity-40' : ''}`}
      {...attributes}
      {...listeners}
    >
      {/* chevron / spacer */}
      {item.hasChildren ? (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-koala-secondary hover:text-koala-bright hover:bg-elevated"
        >
          {item.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        </button>
      ) : (
        <span className="h-4 w-4 shrink-0" />
      )}

      <span className="flex w-[18px] shrink-0 items-center justify-center" onClick={() => onNavigate(item.id)}>
        <PageIcon icon={node.icon} size={14} />
      </span>

      <span className="flex-1 truncate" onClick={() => onNavigate(item.id)}>
        {node.title || 'بدون عنوان'}
      </span>

      {/* hover actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
        <button
          title={node.isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          onClick={(e) => { e.stopPropagation(); onFavorite(item.id, !node.isFavorite); }}
          className="flex h-5 w-5 items-center justify-center rounded text-koala-secondary hover:text-koala-yellow hover:bg-elevated"
        >
          <Star size={12} fill={node.isFavorite ? 'currentColor' : 'none'} className={node.isFavorite ? 'text-koala-yellow' : ''} />
        </button>
        <button
          title="نقل لسلة المهملات"
          onClick={(e) => { e.stopPropagation(); onArchive(item.id); }}
          className="flex h-5 w-5 items-center justify-center rounded text-koala-secondary hover:text-coral hover:bg-elevated"
        >
          <Trash2 size={12} />
        </button>
        <button
          title="صفحة فرعية"
          onClick={(e) => { e.stopPropagation(); onAddChild(item.id); }}
          className="flex h-5 w-5 items-center justify-center rounded text-koala-secondary hover:text-koala-bright hover:bg-elevated"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

export default function SidebarTree({ tree }: { tree: WorkspacePageNode[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [overId, setOverId] = useState<string | null>(null);

  const move = useMovePage();
  const createPage = useCreatePage();
  const archive = useArchivePage();
  const updatePage = useUpdatePage();

  const flat = useMemo(() => flattenTree(tree, collapsed), [tree, collapsed]);
  const ids = useMemo(() => flat.map((i) => i.id), [flat]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const projection =
    activeId && overId ? getProjection(flat, activeId, overId, offsetX, INDENT) : null;

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setOverId(String(e.active.id));
  };
  const handleDragMove = (e: DragMoveEvent) => {
    setOffsetX(e.delta.x);
    if (e.over) setOverId(String(e.over.id));
  };
  const handleDragEnd = (e: DragEndEvent) => {
    const aId = String(e.active.id);
    const oId = e.over ? String(e.over.id) : null;
    if (aId && oId && projection) {
      const parentId = projection.parentId;
      const position = computePosition(flat, aId, oId, parentId);
      move.mutate({ id: aId, parentId, position });
    }
    setActiveId(null);
    setOverId(null);
    setOffsetX(0);
  };

  const onAddChild = async (parentId: string) => {
    setCollapsed((prev) => { const n = new Set(prev); n.delete(parentId); return n; });
    const page = await createPage.mutateAsync({ parentId });
    router.push(`/p/${page.id}`);
  };

  if (flat.length === 0) {
    return <p className="px-2 py-3 text-xs text-koala-secondary">لا توجد صفحات بعد. ابدأ بإنشاء صفحة جديدة</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={() => { setActiveId(null); setOverId(null); setOffsetX(0); }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col">
          {flat.map((item) => {
            const depth = item.id === activeId && projection ? projection.depth : item.depth;
            return (
              <TreeRow
                key={item.id}
                item={item}
                depth={depth}
                active={pathname === `/p/${item.id}`}
                onToggle={toggle}
                onNavigate={(id) => router.push(`/p/${id}`)}
                onAddChild={onAddChild}
                onArchive={(id) => archive.mutate(id)}
                onFavorite={(id, val) => updatePage.mutate({ id, data: { isFavorite: val } })}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
