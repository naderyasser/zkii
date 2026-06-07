
const API_BASE = '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ─── Tasks ────────────────────────────────────────────── */
export async function getTasks(filter = 'all', sortBy = 'priority') {
  return request<Task[]>(`/api/tasks?filter=${filter}&sort_by=${sortBy}`);
}

export async function createTask(data: CreateTaskInput) {
  return request<Task>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTask(id: string, data: Partial<Task>) {
  return request<Task>(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTask(id: string) {
  return request<{ success: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' });
}

export async function completeTask(id: string) {
  return request<Task>(`/api/tasks/${id}/complete`, { method: 'POST' });
}

/* ─── Heatmap ──────────────────────────────────────────── */
export async function getHeatmap(year: number) {
  return request<HeatmapDay[]>(`/api/tasks/heatmap?year=${year}`);
}

export async function getDayDetail(date: string) {
  return request<DayDetail>(`/api/tasks/day-detail?date=${date}`);
}

/* ─── Weekly Score ─────────────────────────────────────── */
export async function getWeeklyScore() {
  return request<WeeklyScoreData>('/api/tasks/weekly-score');
}

/* ─── Chat ─────────────────────────────────────────────── */
export async function sendChat(messages: { role: string; content: string }[]) {
  return request<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
}

export async function generateDaySummary(date: string) {
  return request<{ summary: string }>('/api/chat/generate-day-summary', {
    method: 'POST',
    body: JSON.stringify({ date }),
  });
}

/* ─── Integrations ─────────────────────────────────────── */
export async function getOAuthStatus() {
  return request<OAuthStatus>('/api/integrations/status');
}

/* ─── Kanban ───────────────────────────────────────────── */
export async function getKanbanTasks() {
  return request<Task[]>('/api/tasks/kanban');
}

/* ─── Tags ─────────────────────────────────────────────── */
export async function getTags() {
  return request<TagType[]>('/api/tags');
}

export async function createTag(name: string, color?: string) {
  return request<TagType>('/api/tags', {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  });
}

export async function deleteTag(id: string) {
  return request<{ message: string }>(`/api/tags/${id}`, { method: 'DELETE' });
}

export async function getTaskTags(taskId: string) {
  return request<TagType[]>(`/api/tasks/${taskId}/tags`);
}

export async function addTagToTask(taskId: string, tagId: string) {
  return request<TagType>(`/api/tasks/${taskId}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tagId }),
  });
}

export async function removeTagFromTask(taskId: string, tagId: string) {
  return request<{ message: string }>(`/api/tasks/${taskId}/tags`, {
    method: 'DELETE',
    body: JSON.stringify({ tagId }),
  });
}

/* ─── Habits ────────────────────────────────────────────── */
export async function getHabits() {
  return request<HabitType[]>('/api/habits');
}

export async function createHabit(data: CreateHabitInput) {
  return request<HabitType>('/api/habits', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteHabit(id: string) {
  return request<{ success: boolean }>(`/api/habits/${id}`, { method: 'DELETE' });
}

export async function toggleHabit(id: string) {
  return request<HabitType>(`/api/habits/${id}/toggle`, { method: 'POST' });
}

export async function getHabitLogs(habitId: string, days: number = 7) {
  return request<HabitLogType[]>(`/api/habits/${habitId}/logs?days=${days}`);
}

/* ─── Projects ─────────────────────────────────────────── */
export async function getProjects() {
  return request<ProjectType[]>('/api/projects');
}

export async function createProject(data: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}) {
  return request<ProjectType>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProject(
  id: string,
  data: Partial<{ name: string; description: string; color: string; icon: string }>
) {
  return request<ProjectType>(`/api/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string) {
  return request<{ message: string }>(`/api/projects/${id}`, {
    method: 'DELETE',
  });
}

/* ─── Motivation (AI Image Generation) ──────────────────── */
export async function generateMotivationImage(prompt: string) {
  return request<{ success: boolean; imageBase64?: string; prompt?: string; disabled?: boolean; message?: string }>('/api/motivation', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}

/* ─── Export ───────────────────────────────────────────── */
export async function exportTasksCSV() {
  const res = await fetch('/api/export?format=csv');
  if (!res.ok) throw new Error('Export failed');
  return res.text();
}

/* ─── Workspace Pages ──────────────────────────────────── */
export async function getPagesTree() {
  return request<WorkspacePageNode[]>('/api/pages?view=tree');
}

export async function getPagesFlat() {
  return request<WorkspacePage[]>('/api/pages?view=flat');
}

export async function getTrashPages() {
  return request<WorkspacePage[]>('/api/pages?archived=1');
}

export async function getPage(id: string) {
  return request<PageWithDatabase>(`/api/pages/${id}`);
}

export async function createPage(data: {
  title?: string;
  icon?: string;
  parentId?: string | null;
  type?: 'page' | 'database';
  coverUrl?: string;
}) {
  return request<WorkspacePage>('/api/pages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePage(
  id: string,
  data: Partial<{ title: string; icon: string | null; coverUrl: string | null; content: string; isFavorite: boolean }>
) {
  return request<WorkspacePage>(`/api/pages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function archivePage(id: string) {
  return request<{ archived: boolean; count: number }>(`/api/pages/${id}`, { method: 'DELETE' });
}

export async function hardDeletePage(id: string) {
  return request<{ deleted: boolean }>(`/api/pages/${id}?hard=1`, { method: 'DELETE' });
}

export async function movePage(id: string, data: { parentId?: string | null; position?: number }) {
  return request<WorkspacePage>(`/api/pages/${id}/move`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function restorePage(id: string) {
  return request<{ restored: boolean; count: number }>(`/api/pages/${id}/restore`, { method: 'POST' });
}

/* ─── Workspace Databases & Rows ───────────────────────── */
export async function getDatabase(id: string) {
  return request<DatabaseWithRows>(`/api/databases/${id}`);
}

export async function updateDatabase(
  id: string,
  data: Partial<{ properties: PropertyDef[]; views: ViewDef[] }>
) {
  return request<WorkspaceDatabase>(`/api/databases/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function createRow(databaseId: string, properties: Record<string, unknown> = {}) {
  return request<WorkspaceRow>(`/api/databases/${databaseId}/rows`, {
    method: 'POST',
    body: JSON.stringify({ properties }),
  });
}

export async function updateRow(
  id: string,
  data: { properties?: Record<string, unknown>; position?: number; pageId?: string | null; replaceProperties?: boolean }
) {
  return request<WorkspaceRow>(`/api/rows/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteRow(id: string) {
  return request<{ deleted: boolean }>(`/api/rows/${id}`, { method: 'DELETE' });
}

/* ─── Art (Met covers) ─────────────────────────────────── */
export interface ArtResult {
  objectID: number;
  title: string;
  artist: string;
  year: string;
  imageUrl: string;
}

export async function getRandomArt(excludeId?: number) {
  return request<ArtResult>(`/api/art/random${excludeId ? `?exclude=${excludeId}` : ''}`);
}

export async function setPageCover(
  id: string,
  data: { coverUrl: string | null; coverMeta?: { objectID?: number; title: string; artist: string; year: string; source?: string } }
) {
  return request<WorkspacePage>(`/api/pages/${id}/cover`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface SearchResult {
  id: string;
  title: string;
  icon: string | null;
  type: string;
  snippet: string;
}

export async function searchPages(q: string) {
  return request<SearchResult[]>(`/api/search?q=${encodeURIComponent(q)}`);
}

export async function aiFillProperty(data: {
  property: { name: string; type: string; options?: { id: string; name: string }[] };
  context: Record<string, unknown>;
  instruction?: string;
}) {
  return request<{ value: unknown }>('/api/ai/fill', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/* ─── Type imports for return types ────────────────────── */
import type {
  Task,
  CreateTaskInput,
  HeatmapDay,
  DayDetail,
  WeeklyScoreData,
  ChatResponse,
  OAuthStatus,
  Tag as TagType,
  Habit as HabitType,
  HabitLog as HabitLogType,
  CreateHabitInput,
  Project as ProjectType,
  WorkspacePage,
  WorkspacePageNode,
  PageWithDatabase,
  WorkspaceDatabase,
  DatabaseWithRows,
  WorkspaceRow,
  PropertyDef,
  ViewDef,
} from '@/types';
