'use client';

import { useState, useCallback, useRef, type KeyboardEvent } from 'react';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as api from '@/lib/api';

interface ChatInputProps {
  onSend: (content: string) => void;
  isPending: boolean;
}

export default function ChatInput({ onSend, isPending }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const hasText = value.trim().length > 0;

  const handleSend = useCallback(() => {
    if (!hasText || isPending) return;
    onSend(value.trim());
    setValue('');
  }, [hasText, isPending, onSend, value]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  /* ── Voice Recording ───────────────────────────────────────── */
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
          const base64Audio = (reader.result as string).split(',')[1];
          if (!base64Audio) return;

          setIsTranscribing(true);
          try {
            const result = await fetch('/api/asr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64Audio }),
            });
            const data = await result.json();
            if (data.text) {
              setValue((prev) => (prev ? prev + ' ' + data.text : data.text));
            }
          } catch (err) {
            console.error('ASR error:', err);
          } finally {
            setIsTranscribing(false);
          }
        };

        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className="shrink-0 border-t border-border-subtle p-3">
      <div className="flex items-center gap-2 bg-base rounded-lg border border-border-subtle px-3 py-2 focus-within:border-accent-blue/50 transition-colors duration-150">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isTranscribing ? 'جارٍ التحويل...' : isRecording ? '🎤 جارٍ التسجيل...' : 'اكتب أمر هنا...'}
          disabled={isPending || isTranscribing}
          className="flex-1 bg-transparent text-koala-primary placeholder:text-koala-muted focus:outline-none focus:ring-0 text-[13px]"
          dir="rtl"
        />

        {/* Microphone button */}
        <button
          type="button"
          onClick={toggleRecording}
          disabled={isPending || isTranscribing}
          className={cn(
            'flex items-center justify-center size-7 rounded-md transition-all duration-200 shrink-0',
            isRecording
              ? 'bg-coral text-white animate-pulse'
              : isTranscribing
                ? 'bg-koala-yellow/20 text-koala-yellow'
                : 'bg-hover text-koala-muted hover:text-koala-bright hover:bg-hover/80',
            (isPending || isTranscribing) && 'opacity-50 cursor-not-allowed'
          )}
          aria-label={isRecording ? 'إيقاف التسجيل' : 'تسجيل صوتي'}
        >
          {isTranscribing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : isRecording ? (
            <MicOff className="size-3.5" />
          ) : (
            <Mic className="size-3.5" />
          )}
        </button>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!hasText || isPending}
          className={cn(
            'flex items-center justify-center size-7 rounded-md transition-all duration-150 shrink-0',
            hasText && !isPending
              ? 'bg-koala-purple text-base hover:bg-koala-purple/80'
              : 'bg-hover text-koala-muted cursor-default'
          )}
          aria-label="إرسال"
        >
          <Send className="size-3.5 scale-x-[-1]" />
        </button>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center justify-center gap-2 mt-1.5">
          <span className="size-2 rounded-full bg-coral animate-pulse" />
          <span className="text-[10px] text-coral font-medium">جارٍ التسجيل — اضغط للإيقاف</span>
        </div>
      )}
    </div>
  );
}
