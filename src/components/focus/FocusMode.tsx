'use client';

import { useReducer, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, X, Coffee, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskPriority, TaskCategory } from '@/types';

/* ─── Constants ──────────────────────────────────────────────────────── */
const FOCUS_DURATION = 25 * 60; // 25 minutes
const BREAK_DURATION = 5 * 60;  // 5 minutes

/* ─── Priority / Category labels (Arabic) ────────────────────────────── */
const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'عاجل',
  high: 'مرتفع',
  medium: 'متوسط',
  low: 'منخفض',
};

const CATEGORY_LABEL: Record<string, string> = {
  work: 'شغل',
  personal: 'شخصي',
  errands: 'مهام',
  calls: 'مكالمات',
  reading: 'قراءة',
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-coral',
  high: 'bg-koala-orange',
  medium: 'bg-koala-yellow',
  low: 'bg-koala-green',
};

/* ─── Types ──────────────────────────────────────────────────────────── */
type SessionType = 'focus' | 'break';

interface FocusModeProps {
  task: { id: string; title: string; priority: string; category: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

/* ─── Reducer ────────────────────────────────────────────────────────── */
interface FocusState {
  timeLeft: number;
  isRunning: boolean;
  sessionType: SessionType;
  hasCompleted: boolean;
  justOpened: boolean;
}

type FocusAction =
  | { type: 'TICK' }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESET' }
  | { type: 'SKIP' }
  | { type: 'OPEN' }
  | { type: 'FOCUS_DONE' }
  | { type: 'SWITCH_TO_BREAK' };

function focusReducer(state: FocusState, action: FocusAction): FocusState {
  switch (action.type) {
    case 'TICK':
      if (!state.isRunning || state.timeLeft <= 0) return state;
      return { ...state, timeLeft: state.timeLeft - 1 };

    case 'START':
      return { ...state, isRunning: true };

    case 'PAUSE':
      return { ...state, isRunning: false };

    case 'RESET':
      return {
        ...state,
        isRunning: false,
        timeLeft: state.sessionType === 'focus' ? FOCUS_DURATION : BREAK_DURATION,
        hasCompleted: false,
      };

    case 'SKIP': {
      const nextType: SessionType = state.sessionType === 'focus' ? 'break' : 'focus';
      return {
        ...state,
        isRunning: false,
        sessionType: nextType,
        timeLeft: nextType === 'focus' ? FOCUS_DURATION : BREAK_DURATION,
        hasCompleted: false,
      };
    }

    case 'OPEN':
      return {
        isRunning: false,
        sessionType: 'focus',
        timeLeft: FOCUS_DURATION,
        hasCompleted: false,
        justOpened: true,
      };

    case 'FOCUS_DONE':
      return { ...state, isRunning: false, hasCompleted: true };

    case 'SWITCH_TO_BREAK':
      return {
        ...state,
        sessionType: 'break',
        timeLeft: BREAK_DURATION,
        hasCompleted: false,
        justOpened: false,
      };

    default:
      return state;
  }
}

const initialState: FocusState = {
  timeLeft: FOCUS_DURATION,
  isRunning: false,
  sessionType: 'focus',
  hasCompleted: false,
  justOpened: false,
};

/* ─── Progress Ring Component ────────────────────────────────────────── */
function ProgressRing({
  radius,
  strokeWidth,
  progress,
  sessionType,
}: {
  radius: number;
  strokeWidth: number;
  progress: number;
  sessionType: SessionType;
}) {
  const center = radius + strokeWidth / 2;
  const size = center * 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const trackColor = sessionType === 'focus'
    ? 'rgba(158,206,106,0.12)'
    : 'rgba(187,154,247,0.12)';
  const progressColor = sessionType === 'focus'
    ? 'var(--accent-green)'
    : 'var(--accent-purple)';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="drop-shadow-lg"
    >
      {/* Track */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Progress arc */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={progressColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        className="transition-[stroke-dashoffset] duration-1000 ease-linear"
      />
    </svg>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function FocusMode({ task, isOpen, onClose, onComplete }: FocusModeProps) {
  const [state, dispatch] = useReducer(focusReducer, initialState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTaskIdRef = useRef<string | undefined>(undefined);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref current (in effect to avoid render-time ref access)
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const { timeLeft, isRunning, sessionType, hasCompleted, justOpened } = state;
  const totalTime = sessionType === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
  const progress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;

  /* ── Reset when opened or task changes ──────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    const taskId = task?.id;
    if (prevTaskIdRef.current !== taskId) {
      prevTaskIdRef.current = taskId;
      dispatch({ type: 'OPEN' });
    }
  }, [isOpen, task?.id]);

  /* ── Timer tick ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  /* ── Detect timer reaching zero ─────────────────────────────────── */
  useEffect(() => {
    if (timeLeft !== 0 || !isRunning) return;

    if (sessionType === 'focus') {
      dispatch({ type: 'FOCUS_DONE' });
    } else {
      // Break over → new focus session (via SKIP action)
      dispatch({ type: 'SKIP' });
    }
  }, [timeLeft, isRunning, sessionType]);

  /* ── Fire onComplete callback & auto-switch to break after focus ─ */
  useEffect(() => {
    if (!hasCompleted) return;
    onCompleteRef.current();

    const timeout = setTimeout(() => {
      dispatch({ type: 'SWITCH_TO_BREAK' });
    }, 1200);

    return () => clearTimeout(timeout);
  }, [hasCompleted]);

  /* ── Clear justOpened flag after first render ───────────────────── */
  useEffect(() => {
    if (!justOpened) return;
    // justOpened is consumed on next render; no action needed
  }, [justOpened]);

  /* ── Keyboard shortcut: Escape to close ─────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  /* ── Handlers ───────────────────────────────────────────────────── */
  const handleStart = useCallback(() => dispatch({ type: 'START' }), []);
  const handlePause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const handleReset = useCallback(() => dispatch({ type: 'RESET' }), []);
  const handleSkip = useCallback(() => dispatch({ type: 'SKIP' }), []);

  /* ── Format time ────────────────────────────────────────────────── */
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  /* ── Don't render if closed ─────────────────────────────────────── */
  if (!isOpen) return null;

  const isFocus = sessionType === 'focus';

  return (
    <div
      dir="rtl"
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-base/97 backdrop-blur-md',
      )}
    >
      {/* ── Close button ──────────────────────────────────────────── */}
      <button
        onClick={onClose}
        aria-label="إغلاق وضع التركيز"
        className={cn(
          'absolute top-5 right-5 z-10',
          'flex items-center justify-center size-10 rounded-full',
          'bg-surface/80 border border-border-subtle',
          'text-koala-secondary hover:text-koala-bright hover:bg-hover',
          'transition-colors duration-200',
        )}
      >
        <X className="size-5" />
      </button>

      {/* ── Centered content ──────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-8 px-6 max-w-md w-full">

        {/* ── Task info ─────────────────────────────────────────── */}
        {task && (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2">
              {PRIORITY_DOT[task.priority] && (
                <span className={cn('size-2 rounded-full', PRIORITY_DOT[task.priority])} />
              )}
              <span className={cn(
                'rounded-[4px] px-2 py-0.5 text-[10px] font-medium',
                task.category === 'work' && 'bg-accent-blue/10 text-accent-blue',
                task.category === 'personal' && 'bg-koala-purple/10 text-koala-purple',
                task.category === 'errands' && 'bg-koala-yellow/10 text-koala-yellow',
                task.category === 'calls' && 'bg-coral/10 text-coral',
                task.category === 'reading' && 'bg-koala-green/10 text-koala-green',
                !['work','personal','errands','calls','reading'].includes(task.category)
                  && 'bg-hover text-koala-secondary',
              )}>
                {CATEGORY_LABEL[task.category] ?? task.category}
              </span>
              {PRIORITY_LABEL[task.priority] && (
                <span className="text-[10px] text-koala-muted">
                  {PRIORITY_LABEL[task.priority]}
                </span>
              )}
            </div>
            <h2 className={cn(
              'text-lg font-semibold leading-relaxed max-w-[280px]',
              isFocus ? 'text-koala-green' : 'text-koala-purple',
              'transition-colors duration-500',
            )}>
              {task.title}
            </h2>
          </div>
        )}

        {/* ── Timer + Progress ring ─────────────────────────────── */}
        <div className="relative flex items-center justify-center">
          <ProgressRing
            radius={120}
            strokeWidth={5}
            progress={progress}
            sessionType={sessionType}
          />

          {/* Timer text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Session icon */}
            <div className={cn(
              'mb-1 transition-colors duration-500',
              isFocus ? 'text-koala-green/60' : 'text-koala-purple/60',
            )}>
              {isFocus ? (
                <Zap className="size-5" />
              ) : (
                <Coffee className="size-5" />
              )}
            </div>

            {/* Time display */}
            <span
              className={cn(
                'font-mono text-5xl sm:text-6xl font-bold tracking-wider tabular-nums',
                'transition-colors duration-500',
                isFocus ? 'text-koala-green' : 'text-koala-purple',
                hasCompleted && 'animate-pulse',
              )}
            >
              {formattedTime}
            </span>

            {/* Session type label */}
            <span className={cn(
              'mt-1.5 text-sm font-medium tracking-wide',
              'transition-colors duration-500',
              isFocus ? 'text-koala-green/70' : 'text-koala-purple/70',
            )}>
              {isFocus ? 'تركيز' : 'استراحة'}
            </span>
          </div>
        </div>

        {/* ── Session indicator dots ────────────────────────────── */}
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'size-2 rounded-full transition-all duration-500',
            isFocus ? 'bg-koala-green scale-125' : 'bg-koala-green/30',
          )} />
          <span className={cn(
            'size-2 rounded-full transition-all duration-500',
            !isFocus ? 'bg-koala-purple scale-125' : 'bg-koala-purple/30',
          )} />
        </div>

        {/* ── Control buttons ───────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Start / Pause */}
          <button
            onClick={isRunning ? handlePause : handleStart}
            aria-label={isRunning ? 'إيقاف مؤقت' : 'تشغيل'}
            className={cn(
              'flex items-center justify-center size-14 rounded-full',
              'border-2 transition-all duration-300',
              isFocus
                ? 'border-koala-green/40 bg-koala-green/10 text-koala-green hover:bg-koala-green/20 hover:border-koala-green/60'
                : 'border-koala-purple/40 bg-koala-purple/10 text-koala-purple hover:bg-koala-purple/20 hover:border-koala-purple/60',
              isRunning && 'ring-2 ring-offset-2 ring-offset-base',
              isRunning && (isFocus ? 'ring-koala-green/30' : 'ring-koala-purple/30'),
            )}
          >
            {isRunning ? (
              <Pause className="size-6" />
            ) : (
              <Play className="size-6 ms-0.5" />
            )}
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            aria-label="إعادة تعيين"
            className={cn(
              'flex items-center justify-center size-11 rounded-full',
              'border border-border-subtle bg-surface/60',
              'text-koala-secondary hover:text-koala-bright hover:bg-hover',
              'transition-colors duration-200',
            )}
          >
            <RotateCcw className="size-4.5" />
          </button>

          {/* Skip */}
          <button
            onClick={handleSkip}
            aria-label="تخطي"
            className={cn(
              'flex items-center justify-center size-11 rounded-full',
              'border border-border-subtle bg-surface/60',
              'text-koala-secondary hover:text-koala-bright hover:bg-hover',
              'transition-colors duration-200',
            )}
          >
            <SkipForward className="size-4.5 scale-x-[-1]" />
          </button>
        </div>

        {/* ── Hint text ─────────────────────────────────────────── */}
        <p className="text-[11px] text-koala-muted text-center">
          {isFocus
            ? 'ركز على مهمتك لمدة ٢٥ دقيقة'
            : 'خذ استراحة قصيرة لمدة ٥ دقائق'}
        </p>
      </div>
    </div>
  );
}
