'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, Info } from 'lucide-react';
import type { NotificationList } from '@repo/types';
import api from '../lib/axios';
import { useApi } from '../lib/useApi';
import { timeAgo } from '../lib/format';
import { Button, ErrorState, IconButton, Skeleton, cx } from './ui';

const POLL_MS = 60_000;

const ICONS = {
  alert: { icon: AlertTriangle, cls: 'bg-danger-soft text-danger', label: 'Alert' },
  success: { icon: CheckCircle2, cls: 'bg-success-soft text-success', label: 'Success' },
  info: { icon: Info, cls: 'bg-info-soft text-info', label: 'Info' },
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const list = useApi<NotificationList>('/notifications?limit=20');
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { reload } = list;

  // Poll while the tab is visible
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [reload]);

  // Close on outside click and Escape (focus returns to the bell)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

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
      <IconButton
        ref={buttonRef}
        icon={Bell}
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-controls="notification-panel"
      >
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-solid px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-surface" aria-hidden>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </IconButton>

      {open && (
        <div
          id="notification-panel"
          role="region"
          aria-label="Notifications"
          className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border border-line bg-surface shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-fg">
              Notifications {unread > 0 && <span className="font-normal text-fg-subtle">· {unread} unread</span>}
            </h2>
            {unread > 0 && <Button size="sm" variant="ghost" onClick={() => void markAll()}>Mark all as read</Button>}
          </div>
          <div className="max-h-[min(24rem,70dvh)] overflow-y-auto">
            {list.loading && !list.data && (
              <div className="space-y-3 p-4" role="status" aria-label="Loading notifications">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}
              </div>
            )}
            {list.error && !list.data && <ErrorState compact message={list.error} status={list.status} onRetry={reload} />}
            {list.data && list.data.items.length === 0 && (
              <div className="px-4 py-10 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-fg-subtle" aria-hidden />
                <p className="mt-2 text-sm font-medium text-fg">You&apos;re all caught up</p>
                <p className="text-xs text-fg-subtle">New alerts about leave, expenses, payslips and stock appear here.</p>
              </div>
            )}
            <ul className="divide-y divide-line">
              {list.data?.items.map((n) => {
                const meta = ICONS[n.type] ?? ICONS.info;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => !n.isRead && void markRead(n.id)}
                      className={cx('flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2', !n.isRead && 'bg-primary-soft/40')}
                    >
                      <span className={cx('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', meta.cls)}>
                        <meta.icon className="h-3.5 w-3.5" aria-label={meta.label} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cx('block text-sm text-fg', !n.isRead && 'font-medium')}>{n.title}</span>
                        {n.body && <span className="mt-0.5 block text-sm text-fg-muted">{n.body}</span>}
                        <span className="mt-1 block text-xs text-fg-subtle">
                          {timeAgo(n.createdAt)}{!n.isRead && ' · Unread — click to mark as read'}
                        </span>
                      </span>
                      {!n.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
