'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Tag, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tag as TagType } from '@/types';

const DEFAULT_COLORS = [
  '#7aa2f7', // accent-blue
  '#bb9af7', // koala-purple
  '#73daca', // koala-teal
  '#e0af68', // koala-yellow
  '#9ece6a', // koala-green
  '#e94560', // coral
  '#ff9e64', // koala-orange
];

interface TagPickerProps {
  /** All available tags for the user */
  allTags: TagType[];
  /** Tags currently assigned to the task */
  assignedTags: TagType[];
  /** Callback when a tag is added to the task */
  onAddTag: (tagId: string) => void;
  /** Callback when a tag is removed from the task */
  onRemoveTag: (tagId: string) => void;
  /** Callback to create a new tag (should return the created tag) */
  onCreateTag: (name: string, color: string) => Promise<TagType>;
  /** Loading state for tags */
  isLoading?: boolean;
  className?: string;
}

export default function TagPicker({
  allTags,
  assignedTags,
  onAddTag,
  onRemoveTag,
  onCreateTag,
  isLoading,
  className,
}: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const assignedIds = new Set(assignedTags.map((t) => t.id));

  // Filter tags by search
  const filteredTags = allTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  // Determine if the search term matches exactly (for create button)
  const exactMatch = allTags.some(
    (t) => t.name.toLowerCase() === search.toLowerCase().trim()
  );
  const canCreate = search.trim().length > 0 && !exactMatch;

  // Pick next default color by cycling
  const nextColor = DEFAULT_COLORS[allTags.length % DEFAULT_COLORS.length];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleToggleTag = useCallback(
    (tagId: string) => {
      if (assignedIds.has(tagId)) {
        onRemoveTag(tagId);
      } else {
        onAddTag(tagId);
      }
    },
    [assignedIds, onAddTag, onRemoveTag]
  );

  const handleCreate = useCallback(async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      const newTag = await onCreateTag(search.trim(), nextColor);
      onAddTag(newTag.id);
      setSearch('');
    } catch (err) {
      console.error('Failed to create tag:', err);
    } finally {
      setCreating(false);
    }
  }, [canCreate, creating, onCreateTag, onAddTag, search, nextColor]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && canCreate) {
      e.preventDefault();
      handleCreate();
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
    }
  }

  /**
   * Converts a hex color to rgba with given opacity.
   */
  function hexToRgba(hex: string, alpha: number): string {
    const cleaned = hex.replace('#', '');
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[10px] font-medium',
          'bg-surface border border-border-subtle text-koala-secondary',
          'hover:text-koala-primary hover:border-border-default transition-colors duration-150',
          open && 'border-accent-blue/50 text-accent-blue'
        )}
        dir="rtl"
        aria-label="إدارة الوسوم"
      >
        <Tag className="size-3 scale-x-[-1]" />
        <span>وسوم</span>
        {assignedTags.length > 0 && (
          <span className="size-4 flex items-center justify-center rounded-full bg-accent-blue/15 text-accent-blue text-[9px] font-bold">
            {assignedTags.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full mt-1 end-0 z-50 w-56 rounded-[10px] border border-border-subtle bg-surface shadow-lg shadow-black/20 animate-slide-up"
          dir="rtl"
        >
          {/* Search input */}
          <div className="p-2 border-b border-border-subtle">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ابحث أو أنشئ وسمًا..."
              className="w-full bg-elevated text-[12px] text-koala-bright placeholder:text-koala-muted rounded-[6px] border border-border-subtle px-2.5 py-1.5 outline-none focus:border-accent-blue/50 transition-colors"
              dir="rtl"
            />
          </div>

          {/* Tags list */}
          <div className="max-h-48 overflow-y-auto p-1.5">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-4 animate-spin text-koala-secondary" />
              </div>
            ) : filteredTags.length === 0 && !canCreate ? (
              <div className="text-center py-4 text-[11px] text-koala-muted">
                {search ? 'لا توجد نتائج' : 'لا توجد وسوم بعد'}
              </div>
            ) : (
              <>
                {filteredTags.map((tag) => {
                  const isAssigned = assignedIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag(tag.id)}
                      className={cn(
                        'w-full flex items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-[12px] transition-colors duration-100',
                        isAssigned
                          ? 'bg-hover text-koala-bright'
                          : 'text-koala-primary hover:bg-hover hover:text-koala-bright'
                      )}
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 text-start truncate">
                        {tag.name}
                      </span>
                      {isAssigned && (
                        <span
                          className="size-3.5 shrink-0 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: hexToRgba(tag.color, 0.2),
                          }}
                        >
                          <span
                            className="text-[8px] font-bold"
                            style={{ color: tag.color }}
                          >
                            ✓
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Create new tag option */}
                {canCreate && (
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-[12px]',
                      'text-accent-blue hover:bg-accent-blue/10 transition-colors duration-100',
                      'border-t border-border-subtle mt-1 pt-2'
                    )}
                  >
                    {creating ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Plus className="size-3" />
                    )}
                    <span>
                      إنشاء وسم &ldquo;{search.trim()}&rdquo;
                    </span>
                    <span
                      className="size-2.5 shrink-0 rounded-full ms-auto"
                      style={{ backgroundColor: nextColor }}
                    />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Assigned tags summary */}
          {assignedTags.length > 0 && (
            <div className="border-t border-border-subtle p-2 flex flex-wrap gap-1">
              {assignedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[9px] font-medium"
                  style={{
                    backgroundColor: hexToRgba(tag.color, 0.1),
                    color: tag.color,
                  }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
