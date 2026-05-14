'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tag } from '@/types';

interface TagBadgeProps {
  tag: Tag;
  removable?: boolean;
  onRemove?: (tagId: string) => void;
  className?: string;
}

/**
 * Converts a hex color to an rgba string with the given opacity.
 */
function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function TagBadge({ tag, removable, onRemove, className }: TagBadgeProps) {
  const bgColor = hexToRgba(tag.color, 0.1);
  const borderColor = hexToRgba(tag.color, 0.2);

  return (
    <span
      dir="rtl"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 text-[10px] font-medium',
        'transition-colors duration-150 select-none',
        className
      )}
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        color: tag.color,
      }}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: tag.color }}
        aria-hidden="true"
      />
      <span className="truncate max-w-[80px]">{tag.name}</span>
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag.id);
          }}
          className="shrink-0 ms-0.5 transition-opacity opacity-60 hover:opacity-100"
          aria-label={`إزالة ${tag.name}`}
        >
          <X className="size-2.5 scale-x-[-1]" />
        </button>
      )}
    </span>
  );
}
