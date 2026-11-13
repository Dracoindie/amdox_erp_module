'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './components/Sidebar';
import NotificationBell from '../../components/NotificationBell';
import DarkModeToggle from '../../components/DarkModeToggle';
import { restoreSession } from '../../lib/auth';

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'checking' | 'ok'>('checking');

  // Guard: the session must be confirmed by the API (/auth/me), not just by the
  // presence of a token. restoreSession() refreshes from the httpOnly cookie
  // after a reload, then validates with /auth/me.
  useEffect(() => {
    let cancelled = false;
    restoreSession().then((user) => {
      if (cancelled) return;
      if (user) setStatus('ok');
      else router.replace(`/login?next=${encodeURIComponent(pathname || '/')}`);
    });
    return () => {
      cancelled = true;
    };
    // Run once per mount; route changes inside the dashboard keep the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'checking') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900" role="status" aria-label="Checking session">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ff5a00] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 px-6 shadow-sm z-10">
          <h1 className="text-lg font-bold tracking-wide text-slate-900 dark:text-white">
            AMDOX <span className="text-[#ff5a00]">ERP</span>{' '}
            <span className="text-slate-400 font-normal ml-2 dark:text-slate-500">| Dashboard</span>
          </h1>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-6 relative">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-[#ff5a00] opacity-5 blur-[150px] pointer-events-none" />
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
