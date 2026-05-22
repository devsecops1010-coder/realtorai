import { clearAuth } from './auth';

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

  // `credentials: 'include'` makes the browser send the rai_access / rai_refresh
  // httpOnly cookies along with the request. The API reads them via cookie-parser.
  // We no longer attach an Authorization header from the client.
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers,
    credentials: 'include',
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  return res;
}

async function attemptRefresh(): Promise<boolean> {
  try {
    // The refresh token lives in the rai_refresh httpOnly cookie, so the body
    // is empty — the server reads it from the cookie. On success the server
    // also rotates both cookies.
    const res = await rawRequest('/auth/refresh', {
      method: 'POST',
      body: {},
      skipAuth: true,
      skipRefresh: true,
    });
    return res.ok;
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
