'use client';

import { useEffect, useState } from 'react';

// Mock Service Worker runs only when NEXT_PUBLIC_USE_MOCKS=true (the
// static Vercel demo). In every other build, requests go to the real API.
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';
const START_TIMEOUT_MS = 4000;

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!USE_MOCKS);

  useEffect(() => {
    if (!USE_MOCKS) return;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    // Never leave the page blank: render after START_TIMEOUT_MS even if the worker hangs.
    const timer = setTimeout(() => {
      console.warn('[MSW] worker did not start in time; continuing without mocks');
      finish();
    }, START_TIMEOUT_MS);

    import('../mocks/browser')
      .then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass', quiet: true }))
      .catch((err) => console.error('[MSW] failed to start; continuing without mocks', err))
      .finally(() => {
        clearTimeout(timer);
        finish();
      });

    return () => clearTimeout(timer);
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
