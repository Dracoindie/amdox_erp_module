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
    clearSession();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.assign('/login');
    }
    return Promise.reject(refreshError);
  }
});

/** Pulls a readable message out of an API error. */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const e = err as AxiosError<{ message?: string }>;
  if (e?.response?.data?.message) return e.response.data.message;
  if (e?.request && !e.response) return 'Cannot reach the API server.';
  return fallback;
}

export default api;
