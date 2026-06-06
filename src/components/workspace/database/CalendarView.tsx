'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { PropertyDef, WorkspaceRow } from '@/types';

interface Props {
  dateProp: PropertyDef;
  titleId: string;
  rows: WorkspaceRow[];
  onOpenRow: (row: WorkspaceRow) => void;
}

const WEEKDAYS = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function CalendarView({ dateProp, titleId, rows, onOpenRow }: Props) {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const byDay = useMemo(() => {
    const map = new Map<string, WorkspaceRow[]>();
    for (const r of rows) {
      const v = r.properties[dateProp.id];
      if (typeof v === 'string' && v) {
        const key = v.slice(0, 10);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r);
      }
    }
    return map;
  }, [rows, dateProp.id]);

  const firstDay = new Date(cursor.y, cursor.m, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prev = () => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }));
  const next = () => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }));

  const dateKey = (d: number) => `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-koala-bright">{MONTHS[cursor.m]} {cursor.y}</h3>
        <div className="flex gap-1">
          <button onClick={prev} className="rounded p-1 text-koala-secondary hover:bg-hover"><ChevronRight size={16} /></button>
          <button onClick={next} className="rounded p-1 text-koala-secondary hover:bg-hover"><ChevronLeft size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-surface py-1.5 text-center text-[11px] text-koala-muted">{w}</div>
        ))}
        {cells.map((d, i) => {
          const key = d ? dateKey(d) : '';
          const items = d ? byDay.get(key) || [] : [];
          const isToday = key === today.toISOString().slice(0, 10);
          return (
            <div key={i} className="min-h-[84px] bg-base p-1.5">
              {d && (
                <>
                  <div className={`mb-1 text-[11px] ${isToday ? 'font-bold text-accent-blue' : 'text-koala-secondary'}`}>{d}</div>
                  <div className="flex flex-col gap-1">
                    {items.slice(0, 3).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => onOpenRow(r)}
                        className="truncate rounded bg-elevated px-1.5 py-0.5 text-start text-[11px] text-koala-primary hover:bg-hover"
                      >
                        {String(r.properties[titleId] ?? 'بدون عنوان')}
                      </button>
                    ))}
                    {items.length > 3 && <span className="px-1 text-[10px] text-koala-muted">+{items.length - 3}</span>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
