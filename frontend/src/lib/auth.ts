export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const ACCESS_KEY = 'edulink_access_token';
const REFRESH_KEY = 'edulink_refresh_token';
const USER_KEY = 'edulink_auth_user';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'PLATFORM_ADMIN' | 'SCHOOL_SECRETARY' | 'TEACHER' | 'STUDENT';
  school_id: string | null;
  school_name: string | null;
  school_domain: string | null;
  enable_erp_sync?: boolean;
  enable_benefits_club?: boolean;
  academic_user: {
    id: string;
    full_name: string;
    role: 'STUDENT' | 'TEACHER' | 'STAFF';
    institutional_email: string;
    bi_or_student_id: string;
    is_active: boolean;
    academic_year: string | null;
    grade_class: string | null;
    enrollment_status: 'ACTIVE' | 'SUSPENDED' | 'TRANSFERRED' | 'GRADUATED' | null;
  } | null;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveAuthSession(payload: { access: string; refresh: string; user: AuthUser }): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_KEY, payload.access);
  localStorage.setItem(REFRESH_KEY, payload.refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
}

export function updateStoredUser(user: AuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

async function tryRefreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) {
      clearAuthSession();
      return null;
    }
    const data = await res.json();
    if (data.access) {
      localStorage.setItem(ACCESS_KEY, data.access);
      if (data.refresh) localStorage.setItem(REFRESH_KEY, data.refresh);
      return data.access;
    }
  } catch {
    return null;
  }
  return null;
}

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      headers.set('Authorization', `Bearer ${refreshed}`);
      res = await fetch(`${API_BASE}${path}`, { ...init, headers });
    }
  }
  return res;
}

export async function openProtectedHtml(path: string): Promise<void> {
  const res = await authFetch(path);
  if (!res.ok) {
    throw new Error(`Não foi possível abrir o documento (HTTP ${res.status}).`);
  }
  const html = await res.text();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
