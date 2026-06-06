'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Table as TableIcon, LayoutGrid, Calendar as CalIcon, List as ListIcon,
  Plus, Search, Sparkles, Loader2, ArrowUpDown,
} from 'lucide-react';
import { useDatabase, useUpdateDatabase, useCreateRow, useUpdateRow, useDeleteRow } from '@/hooks/useDatabase';
import * as api from '@/lib/api';
import type { PropertyDef, PropertyType, ViewDef, ViewType, WorkspaceRow } from '@/types';
import PropertyCell from './PropertyCell';
import KanbanView from './KanbanView';
import CalendarView from './CalendarView';
import RowPeek from './RowPeek';

const VIEW_ICON: Record<ViewType, React.ReactNode> = {
  table: <TableIcon size={14} />,
  kanban: <LayoutGrid size={14} />,
  calendar: <CalIcon size={14} />,
  list: <ListIcon size={14} />,
};
const VIEW_LABEL: Record<ViewType, string> = { table: 'جدول', kanban: 'كانبان', calendar: 'تقويم', list: 'قائمة' };
const TYPE_LABEL: Record<PropertyType, string> = {
  text: 'نص', number: 'رقم', select: 'اختيار', multiSelect: 'اختيار متعدد',
  date: 'تاريخ', checkbox: 'مربع', url: 'رابط', relation: 'علاقة',
};

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export default function DatabaseView({ databaseId }: { databaseId: string }) {
  const qc = useQueryClient();
  const { data: db, isLoading } = useDatabase(databaseId);
  const updateDb = useUpdateDatabase(databaseId);
  const createRow = useCreateRow(databaseId);
  const updateRow = useUpdateRow(databaseId);
  const deleteRow = useDeleteRow(databaseId);

  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ propId: string; dir: 'asc' | 'desc' } | null>(null);
  const [peekRow, setPeekRow] = useState<string | null>(null);
  const [filling, setFilling] = useState<string | null>(null);

  const view: ViewDef | undefined = useMemo(() => {
    if (!db) return undefined;
    return db.views.find((v) => v.id === activeViewId) || db.views[0];
  }, [db, activeViewId]);

  const titleId = db?.properties[0]?.id ?? 'title';

  const rows = useMemo(() => {
    if (!db) return [];
    let r = db.rows;
    if (query.trim()) {
      const t = query.toLowerCase();
      r = r.filter((row) => String(row.properties[titleId] ?? '').toLowerCase().includes(t));
    }
    if (sort) {
      r = [...r].sort((a, b) => {
        const av = String(a.properties[sort.propId] ?? '');
        const bv = String(b.properties[sort.propId] ?? '');
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return r;
  }, [db, query, sort, titleId]);

  if (isLoading || !db || !view) {
    return <div className="py-8 text-sm text-koala-secondary">…تحميل قاعدة البيانات</div>;
  }

  const setCell = (rowId: string, propId: string, value: unknown) =>
    updateRow.mutate({ id: rowId, data: { properties: { [propId]: value } } });

  const addRow = () => createRow.mutate({});

  const addColumn = () => {
    const name = window.prompt('اسم العمود الجديد:');
    if (!name) return;
    const type = (window.prompt('النوع: text / number / select / multiSelect / date / checkbox / url', 'text') || 'text') as PropertyType;
    const def: PropertyDef = { id: uid('prop'), name, type };
    if (type === 'select' || type === 'multiSelect') def.options = [];
    updateDb.mutate({ properties: [...db.properties, def] });
  };

  const addView = (type: ViewType) => {
    const v: ViewDef = { id: uid('view'), name: VIEW_LABEL[type], type, filters: [], sorts: [], groupBy: null };
    updateDb.mutate({ views: [...db.views, v] });
    setActiveViewId(v.id);
  };

  // املأ عمود بزكي (للصفوف الفاضية)
  const fillColumn = async (prop: PropertyDef) => {
    setFilling(prop.id);
    try {
      for (const row of db.rows) {
        const current = row.properties[prop.id];
        if (current !== undefined && current !== null && current !== '') continue;
        const context: Record<string, unknown> = {};
        for (const p of db.properties) {
          if (p.id !== prop.id) context[p.name] = row.properties[p.id];
        }
        try {
          const { value } = await api.aiFillProperty({
            property: { name: prop.name, type: prop.type, options: prop.options },
            context,
          });
          await api.updateRow(row.id, { properties: { [prop.id]: value } });
        } catch { /* تجاهل صف فشل */ }
      }
    } finally {
      setFilling(null);
      qc.invalidateQueries({ queryKey: ['database', databaseId] });
    }
  };

  const groupProp = db.properties.find((p) => p.type === 'select');
  const dateProp = db.properties.find((p) => p.type === 'date');
  const peek = peekRow ? db.rows.find((r) => r.id === peekRow) : null;

  return (
    <div>
      {/* View tabs + toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-border-subtle pb-2">
        {db.views.map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveViewId(v.id)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm ${v.id === view.id ? 'bg-elevated text-koala-bright' : 'text-koala-secondary hover:bg-hover'}`}
          >
            {VIEW_ICON[v.type]} {v.name}
          </button>
        ))}
        <div className="group relative">
          <button className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-koala-muted hover:bg-hover"><Plus size={13} /> عرض</button>
          <div className="absolute z-20 mt-1 hidden min-w-[130px] rounded-lg border border-border-default bg-surface p-1 shadow-xl group-hover:block">
            {(['table', 'kanban', 'calendar', 'list'] as ViewType[]).map((t) => (
              <button key={t} onClick={() => addView(t)} className="flex w-full items-center gap-2 rounded px-2 py-1 text-start text-xs text-koala-primary hover:bg-hover">
                {VIEW_ICON[t]} {VIEW_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="ms-auto flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1">
            <Search size={13} className="text-koala-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث" className="w-24 bg-transparent text-xs text-koala-primary outline-none" />
          </div>
          <button onClick={addRow} className="flex items-center gap-1 rounded-md bg-elevated px-2.5 py-1 text-sm text-koala-bright hover:bg-hover"><Plus size={14} /> صف</button>
        </div>
      </div>

      {/* View body */}
      {view.type === 'table' && (
        <div className="overflow-x-auto kanban-scroll-x">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-koala-muted">
                {db.properties.map((p) => (
                  <th key={p.id} className="px-2 py-1.5 text-start font-medium">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSort((s) => (s?.propId === p.id ? { propId: p.id, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { propId: p.id, dir: 'asc' }))} className="flex items-center gap-1 hover:text-koala-bright">
                        {p.name} <ArrowUpDown size={11} className="opacity-40" />
                      </button>
                      {(p.type === 'select' || p.type === 'text' || p.type === 'multiSelect') && (
                        <button onClick={() => fillColumn(p)} title="املأ بزكي" className="text-koala-muted hover:text-accent-blue">
                          {filling === p.id ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-2">
                  <button onClick={addColumn} title="عمود جديد" className="text-koala-muted hover:text-koala-bright"><Plus size={14} /></button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border-subtle/50 hover:bg-hover/40">
                  {db.properties.map((p, i) => (
                    <td key={p.id} className="px-2 py-1 align-middle">
                      {i === 0 ? (
                        <button onClick={() => setPeekRow(row.id)} className="truncate text-start text-koala-bright hover:underline">
                          {String(row.properties[p.id] ?? '') || 'بدون عنوان'}
                        </button>
                      ) : (
                        <PropertyCell def={p} value={row.properties[p.id]} onChange={(v) => setCell(row.id, p.id, v)} />
                      )}
                    </td>
                  ))}
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="py-6 text-center text-sm text-koala-secondary">لا توجد صفوف. اضغط «صف» للإضافة.</p>}
        </div>
      )}

      {view.type === 'list' && (
        <div className="flex flex-col gap-1">
          {rows.map((row) => (
            <button key={row.id} onClick={() => setPeekRow(row.id)} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-2.5 text-start hover:bg-elevated">
              <span className="flex-1 truncate text-sm text-koala-primary">{String(row.properties[titleId] ?? '') || 'بدون عنوان'}</span>
              {groupProp && typeof row.properties[groupProp.id] === 'string' && (
                <span className="text-xs text-koala-muted">{groupProp.options?.find((o) => o.id === row.properties[groupProp.id])?.name}</span>
              )}
            </button>
          ))}
          {rows.length === 0 && <p className="py-6 text-center text-sm text-koala-secondary">لا توجد صفوف.</p>}
        </div>
      )}

      {view.type === 'kanban' && (
        groupProp ? (
          <KanbanView groupProp={groupProp} titleId={titleId} rows={rows} onUpdateRow={(id, v) => setCell(id, groupProp.id, v)} onOpenRow={(r) => setPeekRow(r.id)} />
        ) : (
          <p className="py-6 text-center text-sm text-koala-secondary">عرض كانبان يحتاج خاصية «اختيار». أضف عموداً من نوع select.</p>
        )
      )}

      {view.type === 'calendar' && (
        dateProp ? (
          <CalendarView dateProp={dateProp} titleId={titleId} rows={rows} onOpenRow={(r) => setPeekRow(r.id)} />
        ) : (
          <p className="py-6 text-center text-sm text-koala-secondary">عرض التقويم يحتاج خاصية «تاريخ». أضف عموداً من نوع date.</p>
        )
      )}

      {peek && (
        <RowPeek
          row={peek}
          properties={db.properties}
          titleId={titleId}
          onClose={() => setPeekRow(null)}
          onChange={(propId, value) => setCell(peek.id, propId, value)}
          onDelete={() => { deleteRow.mutate(peek.id); setPeekRow(null); }}
        />
      )}
    </div>
  );
}
