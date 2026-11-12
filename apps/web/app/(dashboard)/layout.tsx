'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RefreshCw, WifiOff } from 'lucide-react';
import { Header } from './components/Header';
import { MobileNav, Sidebar } from './components/Sidebar';
import { restoreSession } from '../../lib/auth';
import { Logo } from '../../components/Logo';
import { Button, Skeleton } from '../../components/ui';

type Status = 'checking' | 'ok' | 'unavailable';

/** Shown while the session is checked: the real shell outline, not a blank page. */
function ShellSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="min-h-dvh">
      <div className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-surface lg:block" />
      <div className="lg:pl-64">
        <div className="h-16 border-b border-line bg-surface" />
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-56" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function Unavailable({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Logo size="lg" className="justify-center" />
        <div className="mt-8 rounded-xl border border-line bg-surface p-6 shadow-xs">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
            <WifiOff className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-fg">Can&apos;t reach the server</h1>
          <p className="mt-1 text-sm text-fg-muted">
            The ERP service isn&apos;t responding. You are still signed in; your session will resume when it&apos;s back.
          </p>
          <Button className="mt-5 w-full" icon={RefreshCw} loading={retrying} onClick={onRetry}>Try again</Button>
        </div>
      </div>
    </main>
  );
}

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<Status>('checking');
  const [retrying, setRetrying] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // Guard: the session must be confirmed by the API (/auth/me), not just by the
  // presence of a token. An unreachable API is reported, not treated as sign-out.
  const check = useCallback(async () => {
    const result = await restoreSession();
    if (result.status === 'ok') setStatus('ok');
    else if (result.status === 'unavailable') setStatus('unavailable');
    else router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }, [router]);

  useEffect(() => {
    void check();
    // Run once per mount; route changes inside the dashboard keep the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to top on navigation (the page scrolls, not an inner container)
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  if (status === 'checking') return <ShellSkeleton />;
  if (status === 'unavailable') {
    return (
      <Unavailable
        retrying={retrying}
        onRetry={async () => {
          setRetrying(true);
          await check();
          setRetrying(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only z-50 rounded-lg bg-surface px-4 py-2 text-sm font-medium text-fg shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Sidebar />
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="lg:pl-64">
        <Suspense fallback={<div className="h-16 border-b border-line bg-surface" />}>
          <Header onMenu={() => setNavOpen(true)} />
        </Suspense>
        <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 pb-16 pt-6 focus:outline-none sm:px-6 lg:px-8">
          <Suspense fallback={<Skeleton className="h-72 rounded-xl" />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}
