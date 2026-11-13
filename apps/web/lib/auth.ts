// In-memory session store. The access token is never written to localStorage
// or sessionStorage, so an XSS payload cannot read a long-lived copy of it.
// After a full page reload the session is restored from the httpOnly refresh
// cookie via POST /auth/refresh (see restoreSession).

import type { AuthUser } from '@repo/types';
import { authClient } from './axios';

export type { AuthUser };

let accessToken: string | null = null;
let currentUser: AuthUser | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getAccessToken() {
  return accessToken;
}

export function getUser() {
  return currentUser;
}

export function setSession(token: string, user: AuthUser | null) {
  accessToken = token;
  if (user) currentUser = user;
  emit();
}

export function clearSession() {
  accessToken = null;
  currentUser = null;
  emit();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ── Refresh (single-flight) ───────────────────────────────────────────────────
// Concurrent callers share one request: a second refresh with the same cookie
// would be treated by the API as token reuse.

let refreshing: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  try {
    const { data } = await authClient.post('/auth/refresh', {});
    setSession(data.data.accessToken, data.data.user);
    return data.data.accessToken as string;
  } catch (err: any) {
    // Another tab may have rotated the cookie a moment ago; one retry picks up the new one.
    if (err?.response?.status === 401 && /already used/i.test(err.response.data?.message ?? '')) {
      await new Promise((r) => setTimeout(r, 400));
      const { data } = await authClient.post('/auth/refresh', {});
      setSession(data.data.accessToken, data.data.user);
      return data.data.accessToken as string;
    }
    throw err;
  }
}

export function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

/** Validates the current session with /auth/me, refreshing first if needed. */
export async function restoreSession(): Promise<AuthUser | null> {
  try {
    if (!accessToken) await refreshAccessToken();
    const { data } = await authClient.get('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    currentUser = data.data as AuthUser;
    emit();
    return currentUser;
  } catch {
    clearSession();
    return null;
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { data } = await authClient.post('/auth/login', { email, password });
  setSession(data.data.accessToken, data.data.user);
  return data.data.user as AuthUser;
}

export async function logout(): Promise<void> {
  try {
    await authClient.post('/auth/logout', {});
  } finally {
    clearSession();
  }
}
