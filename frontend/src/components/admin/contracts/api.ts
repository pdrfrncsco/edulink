import { API_BASE, authFetch } from '@/lib/auth';

export { API_BASE };

export interface FeedbackState {
  type: 'success' | 'error';
  message: string;
  details?: any;
}

export async function apiJson<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(path, init);
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text };
  }
  if (!res.ok) {
    throw new Error(data?.detail || data?.error || JSON.stringify(data) || `Erro HTTP ${res.status}`);
  }
  return data as T;
}
