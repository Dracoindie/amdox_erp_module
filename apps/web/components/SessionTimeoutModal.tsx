'use client';

import { useEffect, useRef } from 'react';
import { Clock, LogOut } from 'lucide-react';

interface SessionTimeoutModalProps {
  onStayLoggedIn: () => void;
  onLogout: () => void;
  secondsRemaining: number;
}

export function SessionTimeoutModal({ onStayLoggedIn, onLogout, secondsRemaining }: SessionTimeoutModalProps) {
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-100 p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <Clock className="h-8 w-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Session Expiring Soon</h2>
        <p className="mt-2 text-sm text-slate-500">
          You&apos;ll be automatically logged out in{' '}
          <span className="font-bold text-amber-600">
            {mins > 0 ? `${mins}m ` : ''}{secs}s
          </span>{' '}
          due to inactivity.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onLogout}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Log out now
          </button>
          <button
            onClick={onStayLoggedIn}
            className="flex-1 rounded-xl bg-gradient-to-r from-[#ff5a00] to-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:shadow-orange-500/30 transition-all"
          >
            Stay logged in
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Session timeout hook ───────────────────────────────────────────────────────
export function useSessionTimeout(onLogout: () => void) {
  const TIMEOUT_MS   = 30 * 60 * 1000;
  const WARNING_MS   = 25 * 60 * 1000; // show warning at 25 min
  const warningRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = () => {
    if (warningRef.current)   clearTimeout(warningRef.current);
    if (logoutRef.current)    clearTimeout(logoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  // Exposed so parent can call resetTimer on "Stay logged in"
  const reset = () => {
    clearAll();
    start();
  };

  function start() {
    warningRef.current = setTimeout(() => {
      // Parent component handles the warning state
      window.dispatchEvent(new CustomEvent('amx:session-warning'));
    }, WARNING_MS);
    logoutRef.current = setTimeout(() => {
      onLogout();
    }, TIMEOUT_MS);
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    const handler = () => reset();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    start();

    return () => {
      clearAll();
      events.forEach((e) => window.removeEventListener(e, handler));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { reset };
}
