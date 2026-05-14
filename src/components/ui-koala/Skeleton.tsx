'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-md bg-border-subtle',
        className
      )}
      style={{
        width: width ?? '100%',
        height: height ?? '16px',
      }}
      aria-hidden="true"
    />
  );
}
