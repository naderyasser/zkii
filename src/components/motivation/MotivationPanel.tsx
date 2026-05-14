'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Download, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as api from '@/lib/api';
import { Button } from '@/components/ui/button';

const MOTIVATION_THEMES = [
  { id: 'peak', label: 'قمة الجبل', emoji: '🏔️', prompt: 'A lone figure standing on top of a mountain peak at sunrise, overlooking vast clouds below, dark sky with golden horizon' },
  { id: 'ocean', label: 'أمواج المحيط', emoji: '🌊', prompt: 'Powerful ocean waves crashing against dark rocks at sunset, deep blue and purple tones, dramatic and inspiring' },
  { id: 'space', label: 'الفضاء', emoji: '🚀', prompt: 'Astronaut floating in deep space with a distant galaxy, nebula colors of blue and purple, infinite cosmos' },
  { id: 'fire', label: 'نار الإرادة', emoji: '🔥', prompt: 'A phoenix rising from flames against a dark night sky, fiery orange and red wings spreading wide, epic and powerful' },
  { id: 'forest', label: 'طريق الغابة', emoji: '🌲', prompt: 'A mysterious dark forest path with rays of golden light breaking through ancient trees, enchanted and inviting' },
  { id: 'city', label: 'أضواء المدينة', emoji: '🌃', prompt: 'Futuristic cyberpunk cityscape at night with neon lights reflecting on wet streets, dark atmosphere with vibrant blue and pink' },
  { id: 'aurora', label: 'الشفق القطبي', emoji: '🌌', prompt: 'Northern lights aurora borealis over a dark frozen lake, vivid green and purple ribbons in the night sky, serene and mystical' },
  { id: 'storm', label: 'العاصفة', emoji: '⛈️', prompt: 'Dramatic lightning storm over dark ocean, electric bolts illuminating purple clouds, raw power of nature' },
];

export default function MotivationPanel() {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const generateImage = useMutation({
    mutationFn: (prompt: string) => api.generateMotivationImage(prompt),
    onSuccess: (data) => {
      setImageBase64(data.imageBase64);
    },
  });

  function handleGenerate() {
    const theme = MOTIVATION_THEMES.find((t) => t.id === selectedTheme);
    const prompt = customPrompt.trim() || theme?.prompt || '';
    if (!prompt) return;
    generateImage.mutate(prompt);
  }

  function handleDownload() {
    if (!imageBase64) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageBase64}`;
    link.download = `zaki-motivation-${Date.now()}.png`;
    link.click();
  }

  return (
    <section className="flex flex-col gap-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-koala-yellow/15 flex items-center justify-center">
          <Sparkles className="size-4 text-koala-yellow" />
        </div>
        <div>
          <h2 className="text-[18px] font-semibold text-koala-bright">
            صورة تحفيزية
          </h2>
          <p className="text-[12px] text-koala-secondary">
            ولّد صورة بالذكاء الاصطناعي لتحفيزك
          </p>
        </div>
      </div>

      {/* Theme Grid */}
      <div>
        <label className="text-[12px] text-koala-secondary mb-2 block">اختر الثيم</label>
        <div className="grid grid-cols-4 gap-2">
          {MOTIVATION_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                setSelectedTheme(theme.id);
                setCustomPrompt('');
              }}
              className={cn(
                'flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all duration-150',
                selectedTheme === theme.id
                  ? 'bg-koala-yellow/10 border-koala-yellow/40 scale-[1.02]'
                  : 'bg-surface border-border-subtle hover:bg-hover hover:border-border-default'
              )}
            >
              <span className="text-lg">{theme.emoji}</span>
              <span className={cn(
                'text-[10px] font-medium',
                selectedTheme === theme.id ? 'text-koala-yellow' : 'text-koala-secondary'
              )}>
                {theme.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Prompt */}
      <div>
        <label className="text-[12px] text-koala-secondary mb-1.5 block">أو اكتب وصف مخصص</label>
        <input
          value={customPrompt}
          onChange={(e) => {
            setCustomPrompt(e.target.value);
            if (e.target.value.trim()) setSelectedTheme(null);
          }}
          placeholder="مثال: غروب على البحر مع إحساس بالحرية..."
          className="w-full h-9 px-3 rounded-lg bg-surface border border-border-subtle text-[13px] text-koala-bright placeholder:text-koala-muted focus:outline-none focus:border-accent-blue/50 transition-colors"
          dir="rtl"
        />
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={generateImage.isPending || (!selectedTheme && !customPrompt.trim())}
        className={cn(
          'h-9 text-[13px] gap-2',
          'bg-koala-yellow/15 text-koala-yellow border border-koala-yellow/25',
          'hover:bg-koala-yellow/25 hover:border-koala-yellow/40',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors duration-150'
        )}
        variant="ghost"
      >
        {generateImage.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            جارٍ التوليد...
          </>
        ) : (
          <>
            <Sparkles className="size-4" />
            ولّد الصورة
          </>
        )}
      </Button>

      {/* Generated Image */}
      {imageBase64 && (
        <div className="flex flex-col gap-3">
          <div className="relative rounded-xl overflow-hidden border border-border-subtle">
            <img
              src={`data:image/png;base64,${imageBase64}`}
              alt="صورة تحفيزية"
              className="w-full h-auto"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-base/90 to-transparent p-3">
              <p className="text-[11px] text-koala-secondary text-center">
                تم التوليد بالذكاء الاصطناعي ✨
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownload}
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-[11px] gap-1.5 text-koala-teal hover:text-koala-teal hover:bg-koala-teal/10"
            >
              <Download className="size-3" />
              تحميل
            </Button>
            <Button
              onClick={handleGenerate}
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-[11px] gap-1.5 text-koala-yellow hover:text-koala-yellow hover:bg-koala-yellow/10"
              disabled={generateImage.isPending}
            >
              <RefreshCw className={cn('size-3', generateImage.isPending && 'animate-spin')} />
              صورة أخرى
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
