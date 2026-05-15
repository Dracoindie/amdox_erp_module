import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let csrfTokenPromise: Promise<string> | null = null;

async function getCsrfToken() {
  if (!csrfTokenPromise) {
    csrfTokenPromise = axios.get(`${API_URL}/api/v1/csrf-token`, { withCredentials: true })
      .then(res => res.data.data.csrfToken)
      .catch(() => '');
  }
  return csrfTokenPromise;
}

// ── Request interceptor: attach Bearer token and CSRF ──────────────────────────────────
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('amx_access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
        const csrf = await getCsrfToken();
        if (csrf && config.headers) {
          config.headers['CSRF-Token'] = csrf;
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: auto-refresh on 401 ────────────────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        // Queue the request until refresh completes
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token: string) => {
              if (original.headers) original.headers.Authorization = `Bearer ${token}`;
              resolve(api(original));
            },
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken: string = data.data.accessToken;
        localStorage.setItem('amx_access_token', newToken);
        if (original.headers) original.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear session and redirect to login
        localStorage.removeItem('amx_access_token');
        localStorage.removeItem('amx_user');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
