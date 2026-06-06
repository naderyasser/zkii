'use client';

import { useMemo, useState } from 'react';
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCorners,
  useDraggable, useDroppable, type DragEndEvent,
} from '@dnd-kit/core';
import type { PropertyDef, WorkspaceRow } from '@/types';

interface Props {
  groupProp: PropertyDef;
  titleId: string;
  rows: WorkspaceRow[];
  onUpdateRow: (id: string, value: string | null) => void;
  onOpenRow: (row: WorkspaceRow) => void;
}

const NO_GROUP = '__none__';

function Card({ row, title, onOpen }: { row: WorkspaceRow; title: string; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: row.id });
  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={`cursor-grab rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-koala-primary hover:border-border-default ${isDragging ? 'opacity-40' : ''}`}
      onClick={onOpen}
      {...attributes}
      {...listeners}
    >
      {title || 'بدون عنوان'}
    </div>
  );
}

function Column({ id, label, color, rows, titleId, onOpenRow }: {
  id: string; label: string; color?: string; rows: WorkspaceRow[]; titleId: string; onOpenRow: (r: WorkspaceRow) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-koala-secondary">
        {color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />}
        {label} <span className="text-koala-muted">{rows.length}</span>
      </div>
      <div ref={setNodeRef} className={`flex min-h-[120px] flex-col gap-2 rounded-lg p-1.5 ${isOver ? 'bg-elevated' : 'bg-base'}`}>
        {rows.map((r) => (
          <Card key={r.id} row={r} title={String(r.properties[titleId] ?? '')} onOpen={() => onOpenRow(r)} />
        ))}
      </div>
    </div>
  );
}

export default function KanbanView({ groupProp, titleId, rows, onUpdateRow, onOpenRow }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null); // reserved

  const columns = useMemo(() => {
    const opts = groupProp.options || [];
    const grouped: { id: string; label: string; color?: string; rows: WorkspaceRow[] }[] = opts.map((o) => ({
      id: o.id, label: o.name, color: o.color, rows: [],
    }));
    grouped.push({ id: NO_GROUP, label: 'بدون', rows: [] });
    for (const r of rows) {
      const v = r.properties[groupProp.id];
      const col = grouped.find((c) => c.id === v) || grouped[grouped.length - 1];
      col.rows.push(r);
    }
    return grouped;
  }, [groupProp, rows]);

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const rowId = String(e.active.id);
    const colId = String(e.over.id);
    onUpdateRow(rowId, colId === NO_GROUP ? null : colId);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
      <div className="kanban-scroll-x flex gap-3 overflow-x-auto pb-4">
        {columns.map((c) => (
          <Column key={c.id} id={c.id} label={c.label} color={c.color} rows={c.rows} titleId={titleId} onOpenRow={onOpenRow} />
        ))}
      </div>
    </DndContext>
  );
}
