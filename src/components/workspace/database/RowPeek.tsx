'use client';

import { X, Trash2 } from 'lucide-react';
import type { PropertyDef, WorkspaceRow } from '@/types';
import PropertyCell from './PropertyCell';

interface Props {
  row: WorkspaceRow;
  properties: PropertyDef[];
  titleId: string;
  onClose: () => void;
  onChange: (propId: string, value: unknown) => void;
  onDelete: () => void;
}

export default function RowPeek({ row, properties, titleId, onClose, onChange, onDelete }: Props) {
  const titleDef = properties.find((p) => p.id === titleId) || properties[0];
  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <aside
        dir="rtl"
        className="h-full w-full max-w-md overflow-y-auto kanban-scroll border-s border-border-default bg-surface p-5 shadow-2xl animate-in slide-in-from-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <button onClick={onDelete} className="flex items-center gap-1 text-xs text-koala-muted hover:text-coral">
            <Trash2 size={13} /> حذف الصف
          </button>
          <button onClick={onClose} className="rounded p-1 text-koala-secondary hover:bg-hover"><X size={16} /></button>
        </div>

        {/* Title */}
        <input
          value={typeof row.properties[titleDef.id] === 'string' ? (row.properties[titleDef.id] as string) : ''}
          onChange={(e) => onChange(titleDef.id, e.target.value)}
          placeholder="بدون عنوان"
          className="mb-5 w-full bg-transparent text-2xl font-bold text-koala-bright outline-none placeholder:text-koala-muted"
        />

        {/* Properties */}
        <div className="space-y-3">
          {properties.filter((p) => p.id !== titleDef.id).map((p) => (
            <div key={p.id} className="grid grid-cols-[110px_1fr] items-center gap-2">
              <span className="text-xs text-koala-muted">{p.name}</span>
              <div className="rounded-md border border-border-subtle px-2 py-1.5">
                <PropertyCell def={p} value={row.properties[p.id]} onChange={(v) => onChange(p.id, v)} />
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
