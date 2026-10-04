import type { Task, TaskInput } from './types';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const request = async <T>(path: string, options: RequestInit = {}, token?: string): Promise<T> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed (${response.status})`);
  }
  return response.status === 204 ? (undefined as T) : (await response.json()).data;
};

export const api = {
  authenticate: (mode: 'login' | 'register', email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string } }>(`/api/auth/${mode}`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  listTasks: (token: string) => request<Task[]>('/api/tasks', {}, token),
  createTask: (token: string, input: TaskInput) =>
    request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(input) }, token),
  updateTask: (token: string, id: string, input: Partial<TaskInput>) =>
    request<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  deleteTask: (token: string, id: string) =>
    request<void>(`/api/tasks/${id}`, { method: 'DELETE' }, token),
};
