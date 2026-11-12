'use client';

import type { ComponentType, ReactNode } from 'react';
import { AlertTriangle, Inbox, Lock, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from './Button';
import { cx } from './cx';

// ── Skeletons ───────────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-md bg-surface-3 motion-reduce:animate-none', className)} aria-hidden />;
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-line">
      <div className="flex gap-4 px-4 py-3 sm:px-5">
        {Array.from({ length: columns }, (_, i) => <Skeleton key={i} className="h-3 flex-1" />)}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-4 sm:px-5">
          {Array.from({ length: columns }, (_, c) => <Skeleton key={c} className={cx('h-4 flex-1', c === 0 && 'max-w-40')} />)}
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-line bg-surface p-5 shadow-xs">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-7 w-32" />
          <Skeleton className="mt-3 h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

export function BlockSkeleton({ className = 'h-64' }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading" className="p-4 sm:p-5">
      <Skeleton className={cx('w-full', className)} />
    </div>
  );
}

// ── Empty / error ───────────────────────────────────────────────────────────────

export function EmptyState({
  title = 'Nothing here yet', description, icon: Icon = Inbox, action, compact,
}: {
  title?: string;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-4 text-center', compact ? 'py-6' : 'py-12')}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message, onRetry, status, compact,
}: {
  message?: string | null;
  onRetry?: () => void;
  status?: number | null;
  compact?: boolean;
}) {
  const offline = status == null && /reach/i.test(message ?? '');
  if (status === 403) {
    return (
      <EmptyState
        compact={compact}
        icon={Lock}
        title="You don't have access to this"
        description="Your role can't view this section. Ask an administrator if you need it."
      />
    );
  }
  return (
    <div role="alert" className={cx('flex flex-col items-center justify-center px-4 text-center', compact ? 'py-6' : 'py-12')}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
        {offline ? <WifiOff className="h-5 w-5" aria-hidden /> : <AlertTriangle className="h-5 w-5" aria-hidden />}
      </span>
      <p className="mt-3 text-sm font-semibold text-fg">{offline ? "Can't reach the server" : "Couldn't load this data"}</p>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">
        {offline ? 'Check your connection or try again in a moment.' : message || 'Something went wrong on our side.'}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry} className="mt-4">
          Try again
        </Button>
      )}
    </div>
  );
}

// ── DataState ───────────────────────────────────────────────────────────────────

export interface LoadState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  status?: number | null;
  reload: () => void;
}

/**
 * Loading → skeleton, error → ErrorState with retry, empty → EmptyState,
 * otherwise children(data). While reloading, the previous data stays visible.
 */
export function DataState<T>({
  state, children, empty, isEmpty, skeleton,
}: {
  state: LoadState<T>;
  children: (data: T) => ReactNode;
  empty?: { title?: string; description?: ReactNode; action?: ReactNode; icon?: ComponentType<{ className?: string }> };
  isEmpty?: (data: T) => boolean;
  skeleton?: ReactNode;
}) {
  if (state.error && state.data === undefined) return <ErrorState message={state.error} status={state.status} onRetry={state.reload} />;
  if (state.data === undefined) return <>{state.loading ? skeleton ?? <TableSkeleton /> : null}</>;
  const blank = isEmpty ? isEmpty(state.data) : Array.isArray(state.data) && state.data.length === 0;
  if (blank) return <EmptyState {...empty} />;
  return <div className={cx('transition-opacity', state.loading && 'opacity-60')} aria-busy={state.loading || undefined}>{children(state.data)}</div>;
}
