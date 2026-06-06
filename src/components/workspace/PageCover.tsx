'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ImagePlus, X, Loader2 } from 'lucide-react';
import * as api from '@/lib/api';
import type { ArtMeta } from '@/types';

interface Props {
  pageId: string;
  coverUrl: string | null;
  coverMeta: string | null;
}

function parseMeta(meta: string | null): ArtMeta | null {
  if (!meta) return null;
  try { return JSON.parse(meta) as ArtMeta; } catch { return null; }
}

export default function PageCover({ pageId, coverUrl, coverMeta }: Props) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const meta = parseMeta(coverMeta);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['page', pageId] });
    qc.invalidateQueries({ queryKey: ['pages'] });
  };

  const newArtwork = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const art = await api.getRandomArt(meta?.objectID);
      await api.setPageCover(pageId, {
        coverUrl: art.imageUrl,
        coverMeta: { objectID: art.objectID, title: art.title, artist: art.artist, year: art.year, source: 'The Met' },
      });
      refresh();
    } catch {
      /* تجاهل */
    } finally {
      setBusy(false);
    }
  };

  const removeCover = async () => {
    setBusy(true);
    try {
      await api.setPageCover(pageId, { coverUrl: null });
      refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!coverUrl) {
    return (
      <button
        onClick={newArtwork}
        disabled={busy}
        className="mb-4 flex items-center gap-1.5 rounded-[var(--radius)] border border-border-subtle px-2.5 py-1 text-xs text-koala-secondary hover:border-museum-gold hover:text-museum-gold-deep"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />} إضافة غلاف من المتحف
      </button>
    );
  }

  return (
    <div className="group relative mb-5">
      {/* برواز دبل: حد خارجي ذهبي + pad + صورة بحد داخلي line */}
      <div className="rounded-[2px] border border-museum-gold p-1">
        <div className="relative h-44 w-full overflow-hidden rounded-[1px] border border-museum-line">
          <Image src={coverUrl} alt={meta?.title || 'غلاف'} fill className="object-cover" sizes="(max-width: 768px) 100vw, 768px" unoptimized />
        </div>
      </div>

      {/* سطر النسبة */}
      {meta && (
        <p className="font-amiri mt-1.5 text-[11px] italic text-koala-secondary">
          {meta.title}{meta.artist ? ` — ${meta.artist}` : ''}{meta.year ? `، ${meta.year}` : ''} · The Met
        </p>
      )}

      {/* أزرار */}
      <div className="absolute end-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={newArtwork}
          disabled={busy}
          title="لوحة جديدة"
          className="flex h-7 items-center gap-1 rounded-[var(--radius)] border border-museum-line bg-surface/95 px-2 text-[11px] text-koala-secondary hover:text-museum-gold-deep"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} لوحة جديدة
        </button>
        <button
          onClick={removeCover}
          disabled={busy}
          title="إزالة الغلاف"
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius)] border border-museum-line bg-surface/95 text-koala-secondary hover:text-coral"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
