/* ─── Tag ──────────────────────────────────────────────── */
export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
}

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
  boardColumn: BoardColumn;
  projectId: string | null;
  project?: Project;
}

export type TaskCategory = 'work' | 'personal' | 'errands' | 'calls' | 'reading';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'done' | 'cancelled';
export type TaskSource = 'manual' | 'chat' | 'email' | 'ai';
export type PressureLevel = 'chill' | 'normal' | 'urgent' | 'overdue';
export type BoardColumn = 'todo' | 'in_progress' | 'review' | 'done';

/* ─── Project ──────────────────────────────────────────── */
export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
  tasks?: Task[];
  taskCount?: number;
  doneCount?: number;
}

/* ─── Habit ────────────────────────────────────────────── */
export interface Habit {
  id: string;
  userId: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  targetCount: number;
  createdAt: string;
  updatedAt: string;
  streak?: number;
  todayDone?: boolean;
  weekLogs?: HabitLog[];
}

export type HabitFrequency = 'daily' | 'weekly' | 'custom';

export interface CreateHabitInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  frequency?: HabitFrequency;
  targetCount?: number;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  count: number;
  createdAt: string;
}

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
  boardColumn?: BoardColumn;
  projectId?: string;
}

/* ─── Notion-like Workspace (Page / Database / Row) ─────────── */
export type PropertyType =
  | 'text' | 'number' | 'select' | 'multiSelect'
  | 'date' | 'checkbox' | 'url' | 'relation';

export interface SelectOption { id: string; name: string; color?: string }

export interface PropertyDef {
  id: string;
  name: string;
  type: PropertyType;
  options?: SelectOption[];
}

export type ViewType = 'table' | 'kanban' | 'calendar' | 'list';

export interface ViewDef {
  id: string;
  name: string;
  type: ViewType;
  filters?: unknown[];
  sorts?: unknown[];
  groupBy?: string | null;
}

export interface PagePalette {
  accentLight: string;
  accentDark: string;
  tintLight: string;
  tintDark: string;
  swatches: string[];
}

export interface ArtMeta {
  objectID?: number;
  title: string;
  artist: string;
  year: string;
  source?: string;
}

export interface WorkspacePage {
  id: string;
  title: string;
  icon: string | null;
  coverUrl: string | null;
  coverMeta: string | null; // JSON ArtMeta
  palette: string | null; // JSON PagePalette
  parentId: string | null;
  type: string; // 'page' | 'database'
  content: string | null; // BlockNote JSON string
  position: number;
  isFavorite: boolean;
  archivedAt: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  hasDatabase?: boolean;
}

export interface WorkspacePageNode extends WorkspacePage {
  children: WorkspacePageNode[];
}

export interface WorkspaceDatabase {
  id: string;
  pageId: string;
  properties: PropertyDef[];
  views: ViewDef[];
}

export interface WorkspaceRow {
  id: string;
  databaseId: string;
  properties: Record<string, unknown>;
  pageId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageWithDatabase extends WorkspacePage {
  database: WorkspaceDatabase | null;
}

export interface DatabaseWithRows extends WorkspaceDatabase {
  rows: WorkspaceRow[];
}
