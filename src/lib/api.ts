import { getDefaultUserId } from './auth';

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
    body: JSON.stringify({ ...data, userId: getDefaultUserId() }),
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
} from '@/types';
