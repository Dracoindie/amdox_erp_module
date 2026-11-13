'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import type { NotificationList } from '@repo/types';
import api from '../lib/axios';
import { useApi } from '../lib/useApi';
import { timeAgo } from '../lib/format';

const POLL_MS = 60_000;

const ICONS = {
  alert: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />,
  success: <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />,
  info: <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5a00]" />,
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const list = useApi<NotificationList>('/notifications?limit=20');
  const ref = useRef<HTMLDivElement>(null);
  const { reload } = list;

  // Poll while the tab is visible
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [reload]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`, {}).catch(() => undefined);
    reload();
  };
  const markAll = async () => {
    await api.post('/notifications/read-all', {}).catch(() => undefined);
    reload();
  };

  const unread = list.data?.unread ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        id="notification-bell"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:border-[#ff5a00]/40 hover:text-[#ff5a00] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Notifications</span>
            {unread > 0 && <button onClick={() => void markAll()} className="text-xs font-semibold text-[#ff5a00] hover:underline">Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {list.loading && !list.data && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-[#ff5a00]" /></div>}
            {list.error && <p role="alert" className="px-4 py-6 text-center text-sm text-rose-600">{list.error}</p>}
            {list.data && list.data.items.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500">You are all caught up.</p>}
            {list.data?.items.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.isRead && void markRead(n.id)}
                className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-700/40 ${n.isRead ? 'opacity-60' : ''}`}
              >
                {ICONS[n.type] ?? ICONS.info}
                <span className="flex-1">
                  <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</span>
                  {n.body && <span className="block text-xs text-slate-500">{n.body}</span>}
                  <span className="block text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                </span>
                {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#ff5a00]" aria-label="Unread" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
