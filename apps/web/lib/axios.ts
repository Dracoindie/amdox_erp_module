import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

// NEXT_PUBLIC_API_URL is baked in at build time. With mocks enabled and no URL
// set, requests stay relative so MSW can answer them.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NEXT_PUBLIC_USE_MOCKS === 'true' ? '' : 'http://localhost:4000');

export const API_BASE = `${API_URL}/api/v1`;

const UNSAFE = new Set(['post', 'put', 'patch', 'delete']);

// ── CSRF (double-submit) ──────────────────────────────────────────────────────

let csrfToken: Promise<string> | null = null;

function getCsrfToken(force = false): Promise<string> {
  if (!csrfToken || force) {
    csrfToken = axios
      .get(`${API_BASE}/csrf-token`, { withCredentials: true })
      .then((res) => res.data.data.csrfToken as string)
      .catch((err) => {
        csrfToken = null;
        throw err;
      });
  }
  return csrfToken;
}

function isCsrfFailure(error: AxiosError) {
  return error.response?.status === 403 && (error.response.data as any)?.message === 'Invalid CSRF token';
}

function withCsrf(instance: AxiosInstance) {
  instance.interceptors.request.use(async (config) => {
    if (UNSAFE.has(config.method?.toLowerCase() ?? '')) {
      config.headers.set('X-CSRF-Token', await getCsrfToken());
    }
    return config;
  });
  // The CSRF cookie can expire; fetch a fresh token and retry once.
  instance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _csrfRetry?: boolean }) | undefined;
    if (original && !original._csrfRetry && isCsrfFailure(error)) {
      original._csrfRetry = true;
      original.headers.set('X-CSRF-Token', await getCsrfToken(true));
      return instance(original);
    }
    return Promise.reject(error);
  });
  return instance;
}

// authClient: login / refresh / logout / me. No 401 auto-refresh (that would loop).
export const authClient = withCsrf(
  axios.create({ baseURL: API_BASE, withCredentials: true, headers: { 'Content-Type': 'application/json' } }),
);

// api: everything else. Attaches the in-memory access token and refreshes once on 401.
export const api = withCsrf(
  axios.create({ baseURL: API_BASE, withCredentials: true, headers: { 'Content-Type': 'application/json' } }),
);

api.interceptors.request.use(async (config) => {
  const { getAccessToken } = await import('./auth');
  const token = getAccessToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (InternalAxiosRequestConfig & { _authRetry?: boolean }) | undefined;
  if (error.response?.status !== 401 || !original || original._authRetry) {
    return Promise.reject(error);
  }
  original._authRetry = true;
  const { refreshAccessToken, clearSession } = await import('./auth');
  try {
    const token = await refreshAccessToken();
    original.headers.set('Authorization', `Bearer ${token}`);
    return api(original);
  } catch (refreshError) {
    // Only a rejected refresh means "signed out". A network error or 5xx while
    // refreshing is an outage: keep the session and let the page show the error.
    const status = (refreshError as AxiosError)?.response?.status;
    if (status === 401 || status === 403) {
      clearSession();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.assign(`/login?next=${next}&expired=1`);
      }
    }
    return Promise.reject(refreshError);
  }
});

/** Field errors from a 422 response ({ errors: { fieldErrors: { name: [msg] } } }). */
export function apiFieldErrors(err: unknown): Record<string, string> {
  const e = err as AxiosError<{ errors?: { fieldErrors?: Record<string, string[] | undefined> } }>;
  const fields = e?.response?.status === 422 ? e.response.data?.errors?.fieldErrors : undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields ?? {})) if (v?.[0]) out[k] = v[0];
  return out;
}

/** True when the request never got a response (API down, offline, CORS). */
export function isNetworkError(err: unknown) {
  const e = err as AxiosError;
  return !!e?.isAxiosError && !e.response;
}

/** Pulls a readable message out of an API error. */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const e = err as AxiosError<{ message?: string }>;
  if (e?.response?.data?.message) return e.response.data.message;
  if (e?.request && !e.response) return 'Cannot reach the API server.';
  return fallback;
}

export default api;
