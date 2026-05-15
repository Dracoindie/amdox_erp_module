export interface AuthUser {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'HR_MANAGER' | 'FINANCE_MANAGER' | 'INVENTORY_MANAGER' | 'SALES_REP' | 'READ_ONLY';
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('amx_access_token');
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('amx_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('amx_access_token');
  localStorage.removeItem('amx_user');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ── Session timeout ────────────────────────────────────────────────────────────
const TIMEOUT_MS = 30 * 60 * 1000;       // 30 minutes
const WARNING_MS = TIMEOUT_MS - 5 * 60 * 1000; // warn 5 min before

type TimeoutCallback = () => void;

let warningTimer: ReturnType<typeof setTimeout> | null = null;
let logoutTimer: ReturnType<typeof setTimeout> | null = null;
let onWarnCb: TimeoutCallback | null = null;
let onLogoutCb: TimeoutCallback | null = null;

function clearTimers() {
  if (warningTimer) clearTimeout(warningTimer);
  if (logoutTimer) clearTimeout(logoutTimer);
}

function startTimers() {
  clearTimers();
  warningTimer = setTimeout(() => onWarnCb?.(), WARNING_MS);
  logoutTimer  = setTimeout(() => onLogoutCb?.(), TIMEOUT_MS);
}

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

export function initSessionTimeout(onWarn: TimeoutCallback, onLogout: TimeoutCallback) {
  onWarnCb  = onWarn;
  onLogoutCb = onLogout;

  const handler = () => startTimers();
  ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handler, { passive: true }));
  startTimers();

  return () => {
    clearTimers();
    ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handler));
  };
}

export function resetSessionTimer() {
  startTimers();
}
