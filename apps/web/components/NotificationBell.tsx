'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface Notification {
  id: string;
  type: 'alert' | 'success' | 'info';
  message: string;
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'alert',   message: 'Low stock: SKU-1004 below threshold',      time: '5m ago',  read: false },
  { id: '2', type: 'success', message: 'Payroll May 2026 confirmed',                time: '1h ago',  read: false },
  { id: '3', type: 'info',    message: 'Leave request from EMP-004 pending review', time: '2h ago',  read: false },
  { id: '4', type: 'success', message: 'Invoice INV-047 posted to ledger',          time: '3h ago',  read: true  },
  { id: '5', type: 'info',    message: 'Lead LD-003 moved to Negotiation stage',    time: '5h ago',  read: true  },
];

const ICON_MAP = {
  alert:   <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />,
  success: <CheckCircle   className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />,
  info:    <Clock         className="h-4 w-4 text-[#ff5a00] shrink-0 mt-0.5" />,
};

export default function NotificationBell() {
  const [open, setOpen]   = useState(false);
  const [notifs, setNotifs] = useState(MOCK_NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.read).length;

  const markAll = () => setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
  const dismiss = (id: string) => setNotifs((ns) => ns.filter((n) => n.id !== id));

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        id="notification-bell"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#ff5a00]/40 dark:hover:border-[#ff5a00]/40 hover:text-[#ff5a00] dark:hover:text-[#ff5a00] transition-all"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white animate-pulse">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl shadow-slate-200/60 dark:shadow-slate-900/60">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-4 py-3">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-[#ff5a00] hover:underline font-medium">
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/50">
            {notifs.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-400">All caught up!</li>
            )}
            {notifs.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 transition-colors ${n.read ? 'bg-white dark:bg-slate-800' : 'bg-orange-50/60 dark:bg-orange-500/10'}`}
              >
                {ICON_MAP[n.type]}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-snug ${n.read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200 font-medium'}`}>
                    {n.message}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">{n.time}</p>
                </div>
                <button
                  onClick={() => dismiss(n.id)}
                  className="text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2 text-center">
            <button className="text-xs text-slate-400 dark:text-slate-500 hover:text-[#ff5a00] transition-colors">
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
