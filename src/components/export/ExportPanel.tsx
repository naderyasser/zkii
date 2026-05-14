'use client';

import { useMutation } from '@tanstack/react-query';
import { Download, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as api from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function ExportPanel() {
  const exportCsv = useMutation({
    mutationFn: () => api.exportTasksCSV(),
    onSuccess: (csv) => {
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `zaki-tasks-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });

  return (
    <section className="flex flex-col gap-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-koala-teal/15 flex items-center justify-center">
          <FileText className="size-4 text-koala-teal" />
        </div>
        <div>
          <h2 className="text-[18px] font-semibold text-koala-bright">
            تصدير البيانات
          </h2>
          <p className="text-[12px] text-koala-secondary">
            صدّر مهامك في صيغة CSV
          </p>
        </div>
      </div>

      {/* Export Card */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-border-subtle">
        <div className="size-12 rounded-xl bg-koala-teal/10 flex items-center justify-center shrink-0">
          <FileText className="size-6 text-koala-teal" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-koala-bright">
            تصدير المهام CSV
          </h3>
          <p className="text-[12px] text-koala-secondary mt-0.5">
            يشمل: العنوان، الحالة، الأولوية، التصنيف، تاريخ الاستحقاق، عمود الكانبان
          </p>
        </div>
        <Button
          onClick={() => exportCsv.mutate()}
          disabled={exportCsv.isPending}
          className={cn(
            'h-8 px-4 text-[12px] gap-1.5 shrink-0',
            'bg-koala-teal/15 text-koala-teal border border-koala-teal/25',
            'hover:bg-koala-teal/25 hover:border-koala-teal/40',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-150'
          )}
          variant="ghost"
        >
          {exportCsv.isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              جارٍ التصدير...
            </>
          ) : (
            <>
              <Download className="size-3.5" />
              تصدير
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
