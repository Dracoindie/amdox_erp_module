'use client';

// Small shared UI kit for the dashboard pages (Tailwind, light + dark).

import type { ComponentType, ReactNode } from 'react';
import { AlertCircle, Inbox, Loader2, RefreshCw, X } from 'lucide-react';

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

// ── Layout ────────────────────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800', className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, tone = 'default' }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'good' | 'warn' | 'bad' | 'brand' }) {
  const color = { default: 'text-slate-900 dark:text-white', good: 'text-emerald-600', warn: 'text-amber-600', bad: 'text-rose-600', brand: 'text-[#ff5a00]' }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cx('mt-2 text-3xl font-extrabold tracking-tight', color)}>{value}</p>
      {hint && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export interface TabDef<T extends string> {
  id: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
}

export function Tabs<T extends string>({ tabs, active, onChange }: { tabs: readonly TabDef<T>[]; active: T; onChange: (id: T) => void }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
            active === t.id ? 'bg-[#ff5a00] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
          )}
        >
          {t.icon && <t.icon className="h-4 w-4" />}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── States ────────────────────────────────────────────────────────────────────

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin text-[#ff5a00]" /> {label}
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', hint }: { title?: string; hint?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-600" />
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry, status }: { message: string; onRetry?: () => void; status?: number | null }) {
  const denied = status === 403;
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <AlertCircle className={cx('h-8 w-8', denied ? 'text-amber-500' : 'text-rose-500')} />
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {denied ? 'You do not have access to this section.' : message}
      </p>
      {onRetry && !denied && (
        <button onClick={onRetry} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      )}
    </div>
  );
}

/** Renders loading / error / empty / content for a useApi() result. */
export function DataState<T>({
  state, empty, isEmpty, children,
}: {
  state: { data: T | undefined; loading: boolean; error: string | null; status?: number | null; reload: () => void };
  empty?: { title?: string; hint?: ReactNode };
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}) {
  if (state.loading && state.data === undefined) return <Spinner />;
  if (state.error) return <ErrorState message={state.error} status={state.status} onRetry={state.reload} />;
  if (state.data === undefined) return null;
  const blank = isEmpty ? isEmpty(state.data) : Array.isArray(state.data) && state.data.length === 0;
  if (blank) return <EmptyState {...empty} />;
  return <>{children(state.data)}</>;
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="text-sm font-medium text-rose-600">{message}</p>;
}

// ── Controls ──────────────────────────────────────────────────────────────────

export function Button({
  children, variant = 'primary', size = 'md', className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'sm' | 'md' }) {
  const styles = {
    primary: 'bg-[#ff5a00] text-white hover:bg-orange-600 shadow-sm',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
  }[variant];
  return (
    <button
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm',
        styles, className,
      )}
    >
      {children}
    </button>
  );
}

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#ff5a00] focus:ring-2 focus:ring-orange-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:ring-orange-500/20';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputClass, props.className)} />;
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputClass, props.className)}>{children}</select>;
}

export function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Table & badges ────────────────────────────────────────────────────────────

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cx('px-3 py-2.5 text-slate-700 dark:text-slate-200', className)}>{children}</td>;
}

const BADGE: Record<string, string> = {
  good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  warn: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  bad: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  info: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const STATUS_TONE: Record<string, keyof typeof BADGE> = {
  ACTIVE: 'good', APPROVED: 'good', PAID: 'good', POSTED: 'good', RECEIVED: 'good', FULFILLED: 'good', WON: 'good', CONFIRMED: 'good', REIMBURSED: 'good',
  PENDING: 'warn', SUBMITTED: 'warn', SENT: 'info', ISSUED: 'info', ONBOARDING: 'info', DRAFT: 'neutral', PROSPECT: 'neutral',
  QUALIFIED: 'info', PROPOSAL: 'info', NEGOTIATION: 'warn',
  REJECTED: 'bad', OVERDUE: 'bad', VOID: 'bad', CANCELLED: 'bad', TERMINATED: 'bad', LOST: 'bad',
  High: 'bad', Medium: 'warn', Low: 'good',
};

export function Badge({ children, tone }: { children: string; tone?: keyof typeof BADGE }) {
  const t = tone ?? STATUS_TONE[children] ?? 'neutral';
  return (
    <span className={cx('inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide', BADGE[t])}>
      {children.replace(/_/g, ' ')}
    </span>
  );
}

export function Pager({ meta, onPage }: { meta?: { page: number; totalPages: number; total: number }; onPage: (p: number) => void }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
      <span>{meta.total} records · page {meta.page} of {meta.totalPages}</span>
      <div className="flex gap-1">
        <Button size="sm" variant="secondary" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Previous</Button>
        <Button size="sm" variant="secondary" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>Next</Button>
      </div>
    </div>
  );
}
