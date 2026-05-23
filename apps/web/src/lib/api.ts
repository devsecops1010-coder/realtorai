import { clearAuth } from './auth';

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const API_URL = (configuredApiUrl && configuredApiUrl !== '/' ? configuredApiUrl : '/api').replace(/\/+$/, '');

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

// Double-submit CSRF: API sets rai_csrf cookie (NOT HttpOnly) on every
// request. We copy it into the X-CSRF-Token header on state-changing
// requests. Reading is constrained to document.cookie since the cookie has
// no HttpOnly flag specifically so we can do this.
export function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)rai_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Returns headers needed to authenticate a `fetch()` call against the API.
 * The api() helper does this automatically; raw fetch() callers (typically
 * multipart uploads where api() doesn't fit) should spread this into their
 * own headers map.
 *
 * Cookies (rai_access/rai_refresh) ride along separately via
 * `credentials: 'include'` — they're not in this object.
 */
export function csrfHeaders(): Record<string, string> {
  const token = readCsrfCookie();
  return token ? { 'X-CSRF-Token': token } : {};
}

async function rawRequest(path: string, opts: RequestOptions = {}): Promise<Response> {
  const method = (opts.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers ?? {}),
  };
  // Attach CSRF on state-changing requests. Server exempts /auth/login,
  // /auth/refresh, /auth/register-tenant, etc. so the very first request
  // (when no cookie exists yet) still goes through.
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrf = readCsrfCookie();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  // `credentials: 'include'` makes the browser send the rai_access / rai_refresh
  // httpOnly cookies along with the request. The API reads them via cookie-parser.
  // We no longer attach an Authorization header from the client.
  const res = await fetch(toApiUrl(path), {
    ...opts,
    headers,
    credentials: 'include',
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  return res;
}

function toApiUrl(path: string) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${cleanPath}`;
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
    // Read the body ONCE — calling res.text() after a failed res.json()
    // throws "body stream already read". Read as text first, then parse
    // JSON; fall back to raw string when the body isn't JSON.
    const raw = await res.text().catch(() => '');
    let body: unknown = raw;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      /* keep raw string */
    }
    // 451 = TenantStatusGuard says the tenant is suspended (or office inactive).
    // Server returns `{ code: 'tenant_suspended', reason, suspendedAt, ... }`.
    // We don't redirect from here (lets the page show a contextual error if
    // it wants to handle it inline), but we surface the structured body
    // through ApiError.body so the caller can branch.
    if (res.status === 451 && typeof window !== 'undefined') {
      const code = (body as { code?: string } | null)?.code;
      // Don't loop redirect if we're already on /suspended.
      if (code === 'tenant_suspended' && !window.location.pathname.startsWith('/suspended')) {
        window.location.href = '/suspended';
      }
    }
    const msg = resolveErrorMessage(res.status, raw, body);
    throw new ApiError(res.status, msg, body);
  }

  if (res.status === 204) return undefined as T;
  const raw = await res.text();
  if (!raw) return undefined as T;
  return JSON.parse(raw) as T;
}

export const apiUrl = API_URL;

function resolveErrorMessage(status: number, raw: string, body: unknown) {
  const bodyMessage = getBodyMessage(body);
  if (bodyMessage) return bodyMessage;

  if (status === 401) return 'אין הרשאה או שפרטי ההתחברות שגויים';
  if (status === 403) return 'אין הרשאה לבצע פעולה זו';
  if (status === 404) return 'שירות ה-API לא נמצא או אינו זמין כרגע';
  if (status === 429) return 'יותר מדי ניסיונות. נסה שוב בעוד דקה';
  if (status >= 500) return 'שגיאת שרת זמנית. נסה שוב בעוד רגע';

  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(raw) || raw.includes('<!DOCTYPE html>');
  if (looksLikeHtml) return `שגיאה ${status}. נסה שוב בעוד רגע`;

  return raw || `HTTP ${status}`;
}

function getBodyMessage(body: unknown) {
  if (!body || typeof body !== 'object') return null;
  const message = (body as { message?: unknown }).message;
  if (Array.isArray(message)) return message.filter(Boolean).join(', ');
  if (typeof message === 'string' && !/<\/?[a-z][\s\S]*>/i.test(message)) return message;
  return null;
}
