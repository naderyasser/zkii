'use client';

import {
  ListTodo, Folder, Repeat, Target, BarChart3, MessageSquare,
  FileText, Database, BookOpen, Calendar, Bookmark, Hash, Star,
  Lightbulb, Flag, Clock, type LucideIcon,
} from 'lucide-react';

// خريطة أيقونات lucide المسموحة كأيقونات صفحات (sentinel: "lucide:Name")
const LUCIDE_MAP: Record<string, LucideIcon> = {
  ListTodo, Folder, Repeat, Target, BarChart3, MessageSquare,
  FileText, Database, BookOpen, Calendar, Bookmark, Hash, Star,
  Lightbulb, Flag, Clock,
};

interface Props {
  icon: string | null | undefined;
  size?: number;
  className?: string;
}

// زخرفة المتحف الافتراضية: معيّن ذهبي 6px مايل 45° (بديل الـ emoji الافتراضي)
function GoldDiamond({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="rotate-45 bg-museum-gold" style={{ width: 6, height: 6 }} />
    </span>
  );
}

export default function PageIcon({ icon, size = 16, className = 'text-koala-secondary' }: Props) {
  if (icon && icon.startsWith('lucide:')) {
    const name = icon.slice('lucide:'.length);
    const Cmp = LUCIDE_MAP[name];
    if (Cmp) return <Cmp size={size} className={className} />;
    return <GoldDiamond size={size} />;
  }
  if (icon && icon.trim()) {
    // محتوى المستخدم (emoji/حرف) — مسموح كاستثناء
    return (
      <span className="leading-none" style={{ fontSize: size + 1 }}>
        {icon}
      </span>
    );
  }
  return <GoldDiamond size={size} />;
}
