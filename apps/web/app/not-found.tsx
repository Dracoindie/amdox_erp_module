import Link from 'next/link';
import type { Metadata } from 'next';
import { Compass } from 'lucide-react';
import { Logo } from '../components/Logo';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Logo size="lg" className="justify-center" />
        <div className="mt-8 rounded-xl border border-line bg-surface p-6 shadow-xs">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
            <Compass className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-4 text-sm font-medium text-primary-soft-fg">Error 404</p>
          <h1 className="mt-1 text-lg font-semibold text-fg">We can&apos;t find that page</h1>
          <p className="mt-1 text-sm text-fg-muted">The link may be broken, or the page may have moved.</p>
          <Link
            href="/"
            className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg hover:bg-primary-hover sm:h-9"
          >
            Back to the dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
