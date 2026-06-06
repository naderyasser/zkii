'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import type { PropertyDef, SelectOption } from '@/types';

interface Props {
  def: PropertyDef;
  value: unknown;
  onChange: (value: unknown) => void;
  autoFocus?: boolean;
}

function optionById(def: PropertyDef, id: string): SelectOption | undefined {
  return def.options?.find((o) => o.id === id);
}

export default function PropertyCell({ def, value, onChange, autoFocus }: Props) {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  switch (def.type) {
    case 'checkbox':
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-accent-blue"
        />
      );

    case 'number':
      return (
        <input
          type="number"
          autoFocus={autoFocus}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full bg-transparent text-sm text-koala-primary outline-none placeholder:text-koala-muted"
          placeholder="—"
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full bg-transparent text-sm text-koala-primary outline-none [color-scheme:dark]"
        />
      );

    case 'url':
      return editing ? (
        <input
          autoFocus
          type="url"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          className="w-full bg-transparent text-sm text-koala-primary outline-none"
          placeholder="https://…"
        />
      ) : value ? (
        <a href={String(value)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="truncate text-sm text-accent-blue hover:underline" onDoubleClick={() => setEditing(true)}>
          {String(value)}
        </a>
      ) : (
        <button onClick={() => setEditing(true)} className="text-sm text-koala-muted">—</button>
      );

    case 'select': {
      const sel = typeof value === 'string' ? optionById(def, value) : undefined;
      return (
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex min-h-[24px] w-full items-center gap-1.5 text-start text-sm"
          >
            {sel ? (
              <span
                className="rounded px-1.5 py-0.5 text-xs"
                style={{ background: (sel.color || '#3b4261') + '33', color: sel.color || '#a9b1d6' }}
              >
                {sel.name}
              </span>
            ) : (
              <span className="text-koala-muted">—</span>
            )}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute z-20 mt-1 min-w-[140px] rounded-lg border border-border-default bg-surface p-1 shadow-[var(--shadow-museum)]">
                {(def.options || []).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => { onChange(o.id); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-start text-xs hover:bg-hover"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: o.color || '#565f89' }} />
                    <span className="flex-1 text-koala-primary">{o.name}</span>
                    {value === o.id && <Check size={12} className="text-koala-green" />}
                  </button>
                ))}
                <button onClick={() => { onChange(null); setMenuOpen(false); }} className="w-full rounded px-2 py-1 text-start text-xs text-koala-muted hover:bg-hover">
                  مسح
                </button>
              </div>
            </>
          )}
        </div>
      );
    }

    case 'multiSelect': {
      const arr: string[] = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (id: string) => {
        const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
        onChange(next);
      };
      return (
        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="flex min-h-[24px] w-full flex-wrap items-center gap-1 text-start">
            {arr.length ? (
              arr.map((id) => {
                const o = optionById(def, id);
                return o ? (
                  <span key={id} className="rounded px-1.5 py-0.5 text-xs" style={{ background: (o.color || '#3b4261') + '33', color: o.color || '#a9b1d6' }}>
                    {o.name}
                  </span>
                ) : null;
              })
            ) : (
              <span className="text-sm text-koala-muted">—</span>
            )}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute z-20 mt-1 min-w-[140px] rounded-lg border border-border-default bg-surface p-1 shadow-[var(--shadow-museum)]">
                {(def.options || []).map((o) => (
                  <button key={o.id} onClick={() => toggle(o.id)} className="flex w-full items-center gap-2 rounded px-2 py-1 text-start text-xs hover:bg-hover">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: o.color || '#565f89' }} />
                    <span className="flex-1 text-koala-primary">{o.name}</span>
                    {arr.includes(o.id) && <Check size={12} className="text-koala-green" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      );
    }

    // text (default)
    default:
      return (
        <input
          autoFocus={autoFocus}
          value={typeof value === 'string' ? value : value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm text-koala-primary outline-none placeholder:text-koala-muted"
          placeholder="—"
        />
      );
  }
}
