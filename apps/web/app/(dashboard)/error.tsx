'use client';

// Error boundary for every dashboard page: a render error shows this card
// inside the app shell instead of a white screen.

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto mt-10 max-w-md rounded-xl border border-line bg-surface p-6 text-center shadow-xs">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </span>
      <h1 className="mt-4 text-lg font-semibold text-fg">This page hit a problem</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Something went wrong while showing this page. Try again; if it keeps happening, reload the app.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-fg-subtle">Reference: {error.digest}</p>}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button icon={RefreshCw} onClick={reset}>Try again</Button>
        <Button variant="secondary" onClick={() => window.location.reload()}>Reload app</Button>
      </div>
    </div>
  );
}
