'use client';

import { useState, useRef, useCallback } from 'react';
import { Plus, Send, Calendar, Mic, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useCreateTask } from '@/hooks/useTasks';
import AddTaskForm from '@/components/tasks/AddTaskForm';

type RecordingState = 'idle' | 'recording' | 'transcribing';

export default function AddTaskInput() {
  const [quickValue, setQuickValue] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const createTask = useCreateTask();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function handleQuickKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!quickValue.trim()) return;
      createTask.mutate({ title: quickValue.trim(), category: 'work', priority: 'medium' });
      setQuickValue('');
    }
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      openDialog();
    }
  }

  function openDialog() {
    setDialogOpen(true);
  }

  function handleQuickSend() {
    if (!quickValue.trim()) return;
    createTask.mutate({ title: quickValue.trim(), category: 'work', priority: 'medium' });
    setQuickValue('');
  }

  function handleDialogSuccess() {
    setDialogOpen(false);
    setQuickValue('');
  }

  const hasValue = quickValue.trim().length > 0;

  /* ── Voice recording ─────────────────────────────────────────── */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          setRecordingState('transcribing');
          try {
            const res = await fetch('/api/asr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64 }),
            });
            const data = await res.json();
            if (data.text) {
              setQuickValue((prev) => prev ? prev + ' ' + data.text : data.text);
            }
          } catch (err) {
            console.error('ASR failed:', err);
          } finally {
            setRecordingState('idle');
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setRecordingState('recording');
    } catch (err) {
      console.error('Mic access denied:', err);
      setRecordingState('idle');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return (
    <>
      <div className="flex items-center gap-2 bg-surface rounded-[10px] border border-border-subtle px-3 py-2.5 focus-within:border-accent-blue/50 transition-colors duration-150">
        <input
          value={quickValue}
          onChange={(e) => setQuickValue(e.target.value)}
          onKeyDown={handleQuickKeyDown}
          placeholder={recordingState === 'recording' ? '🎤 جاري التسجيل...' : recordingState === 'transcribing' ? '⏳ جاري التحويل...' : 'مهمة جديدة... اضغط Enter للحفظ'}
          className="flex-1 bg-transparent text-[13px] text-koala-bright placeholder:text-koala-muted outline-none"
          dir="rtl"
          disabled={recordingState !== 'idle'}
        />

        {/* Mic button */}
        <button
          onClick={recordingState === 'recording' ? stopRecording : startRecording}
          disabled={recordingState === 'transcribing'}
          className={cn(
            'shrink-0 transition-all duration-200 rounded-md p-1.5',
            recordingState === 'recording' && 'text-coral bg-coral/15 animate-pulse',
            recordingState === 'transcribing' && 'text-koala-purple bg-koala-purple/15',
            recordingState === 'idle' && 'text-koala-secondary hover:text-koala-primary hover:bg-hover',
          )}
          aria-label={recordingState === 'recording' ? 'إيقاف التسجيل' : 'تسجيل صوتي'}
        >
          {recordingState === 'recording' ? (
            <Square className="size-4" />
          ) : recordingState === 'transcribing' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Mic className="size-4" />
          )}
        </button>

        <button onClick={openDialog}
          className="text-koala-secondary hover:text-koala-primary transition-colors duration-150 shrink-0"
          aria-label="خيارات إضافية">
          <Calendar className="size-4 scale-x-[-1]" />
        </button>
        <button onClick={handleQuickSend} aria-label="إرسال"
          className={cn('transition-all duration-150 shrink-0',
            hasValue ? 'text-accent-blue hover:text-accent-blue/80' : 'text-koala-muted pointer-events-none')}>
          <Send className="size-4 scale-x-[-1]" />
        </button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-surface border-border-subtle max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-koala-bright text-[15px]">مهمة جديدة</DialogTitle>
          </DialogHeader>
          <AddTaskForm initialTitle={quickValue} onSuccess={handleDialogSuccess} />
        </DialogContent>
      </Dialog>
    </>
  );
}
