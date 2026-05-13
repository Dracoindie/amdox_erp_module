'use client';

import { useEffect, useState } from 'react';

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function init() {
      if (typeof window !== 'undefined') {
        const { worker } = await import('../mocks/browser');
        await worker.start({ onUnhandledRequest: 'bypass' });
        setIsReady(true);
      }
    }
    init();
  }, []);

  if (!isReady) return null;

  return <>{children}</>;
}
