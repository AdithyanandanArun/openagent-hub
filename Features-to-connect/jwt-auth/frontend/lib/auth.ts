// lib/auth.ts
// Token storage, retrieval, and auth utilities for the frontend

const TOKEN_KEY = 'llm_worker_token';
const USER_KEY = 'llm_worker_user';

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

// ─── Token Storage ────────────────────────────────────────────────────────────

export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

// ─── User Storage ─────────────────────────────────────────────────────────────

export function setUser(user: AuthUser): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Session Helpers ──────────────────────────────────────────────────────────

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  try {
    // Decode JWT payload (no signature verification — that's the server's job)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000; // Convert to ms
    return Date.now() < expiresAt;
  } catch {
    return false;
  }
}

export function saveAuthResponse(response: AuthResponse): void {
  setToken(response.token);
  setUser(response.user);
}

export function clearAuth(): void {
  removeToken();
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function authFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export async function register(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Registration failed');
  }

  return res.json();
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Login failed');
  }

  return res.json();
}

export async function generateApiKey(): Promise<string> {
  const res = await authFetch('/auth/api-key', { method: 'POST' });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to generate API key');
  }

  const data = await res.json();
  return data.apiKey;
}

export function logout(redirectTo = '/auth/login'): void {
  clearAuth();
  if (typeof window !== 'undefined') {
    window.location.href = redirectTo;
  }
}
