'use client';

import type { ReactNode } from 'react';
import { ConfirmProvider, ToastProvider } from './ui';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  );
}
