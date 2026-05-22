import { clearAuth, getAccessToken, getRefreshToken, saveAuth } from './auth';
import type { AuthResponse } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

async function rawRequest(path: string, opts: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers ?? {}),
  };
  if (!opts.skipAuth) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  return res;
}

async function attemptRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await rawRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      skipAuth: true,
      skipRefresh: true,
    });
    if (!res.ok) return false;
    const tokens = (await res.json()) as AuthResponse['tokens'];
    const user = JSON.parse(localStorage.getItem('realtorai_user') ?? 'null');
    if (user) saveAuth(tokens, user);
    return true;
  } catch {
    return false;
  }
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await rawRequest(path, opts);

  if (res.status === 401 && !opts.skipRefresh && !opts.skipAuth) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      res = await rawRequest(path, { ...opts, skipRefresh: true });
    } else {
      clearAuth();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    const msg = (body as { message?: string })?.message ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiUrl = API_URL;
