import type { AuthUser } from './types';

// Tokens now live in httpOnly cookies (rai_access / rai_refresh) set by the API.
// We only mirror the user profile in localStorage so the UI can show identity
// without an extra /auth/me round-trip on every navigation. The user object
// alone is NOT proof of auth — cookies are. `isAuthenticated()` is a UX hint:
// if the cookie has been revoked server-side, the next API call gets 401 and
// the api.ts interceptor redirects to /login.
const USER_KEY = 'realtorai_user';

export function saveUser(user: AuthUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getCurrentUser());
}
