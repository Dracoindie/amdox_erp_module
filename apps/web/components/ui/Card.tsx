import type { ComponentType, ReactNode } from 'react';
import { cx } from './cx';

export function Card({
  title, description, actions, children, className, flush = false, as: Tag = 'section',
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** No body padding: for tables and lists that run edge to edge */
  flush?: boolean;
  as?: 'section' | 'div';
}) {
  const hasHeader = title || description || actions;
  return (
    <Tag className={cx('min-w-0 rounded-xl border border-line bg-surface shadow-xs', className)}>
      {hasHeader && (
        <header className={cx('flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-4 pt-4 sm:px-5 sm:pt-5', flush ? 'pb-4' : 'pb-1')}>
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-fg">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
          </div>
          {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
        </header>
      )}
      <div className={cx(!flush && 'p-4 sm:p-5', !flush && hasHeader && 'pt-3 sm:pt-3', flush && hasHeader && 'border-t border-line')}>{children}</div>
    </Tag>
  );
}

export type StatTone = 'neutral' | 'good' | 'warn' | 'bad';

const TONE_TEXT: Record<StatTone, string> = {
  neutral: 'text-fg-subtle',
  good: 'text-success',
  warn: 'text-warning',
  bad: 'text-danger',
};

export function StatCard({
  label, value, hint, icon: Icon, tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  /** Colours the hint line (with its own wording, never colour alone) */
  tone?: StatTone;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface p-4 shadow-xs sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-fg-muted">{label}</p>
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg-muted">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-fg tabular-nums">{value}</p>
      {hint && <p className={cx('mt-1 text-xs', TONE_TEXT[tone], tone !== 'neutral' && 'font-medium')}>{hint}</p>}
    </div>
  );
}

/** Label / value list used in detail cards. */
export function DescriptionList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="divide-y divide-line">
      {items.map((i) => (
        <div key={i.label} className="grid grid-cols-1 gap-1 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-3 sm:gap-4">
          <dt className="text-sm text-fg-muted">{i.label}</dt>
          <dd className="min-w-0 break-words text-sm text-fg sm:col-span-2">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
