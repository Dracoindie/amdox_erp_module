import type { ReactNode } from 'react';
import { Logo } from './Logo';
import ThemeToggle from './ThemeToggle';

/** Shared frame for the sign-in, forgot and reset password pages. */
export function AuthCard({ title, description, children, footer }: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <Logo size="lg" className="justify-center" />
        <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-fg-muted">{footer}</div>}
      </div>
    </main>
  );
}
