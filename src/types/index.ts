/* ─── Task ──────────────────────────────────────────────── */
export interface Task {
  id: string;
  userId: string;
  title: string;
  notes: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDatetime: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isRecurring: boolean;
  source: TaskSource;
  aiScore: number;
  daysUntilDue: number | null;
  pressureLevel: PressureLevel;
}

export type TaskCategory = 'work' | 'personal' | 'errands' | 'calls' | 'reading';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'done';
export type TaskSource = 'manual' | 'chat' | 'email';
export type PressureLevel = 'chill' | 'normal' | 'urgent' | 'overdue';

/* ─── Chat ─────────────────────────────────────────────── */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallResult[];
  timestamp: number;
}

export interface ToolCallResult {
  tool: string;
  status: 'success' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

/* ─── Heatmap ──────────────────────────────────────────── */
export interface HeatmapDay {
  date: string;
  total: number;
  done: number;
  level: number;
}

export interface DayDetail {
  date: string;
  summary: string | null;
  totalTasks: number;
  completedTasks: number;
  productivityScore: number;
  tasks: DayDetailTask[];
}

export interface DayDetailTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
}

/* ─── Auth / Account ───────────────────────────────────── */
export interface Account {
  id: string;
  username: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  avatar?: string;
}

/* ─── OAuth ────────────────────────────────────────────── */
export interface OAuthStatus {
  connected: boolean;
  provider: string;
  scopes: string[];
  expiryDate: string | null;
  lastUpdated: string | null;
}

/* ─── Weekly Score ─────────────────────────────────────── */
export interface WeeklyScoreData {
  thisWeek: number;
  lastWeek: number;
  diff: number;
  direction: 'up' | 'down' | 'same';
}

/* ─── API Response Wrappers ────────────────────────────── */
export interface ChatResponse {
  reply: string;
  toolCalls?: ToolCallResult[];
}

export interface CreateTaskInput {
  title: string;
  notes?: string;
  category?: TaskCategory;
  priority?: TaskPriority;
  dueDatetime?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
}
