import { titleCase } from '../../lib/format';
import { cx } from './cx';

export type BadgeTone = 'good' | 'warn' | 'bad' | 'info' | 'neutral' | 'brand';

const TONES: Record<BadgeTone, string> = {
  good: 'border-success-line bg-success-soft text-success',
  warn: 'border-warning-line bg-warning-soft text-warning',
  bad: 'border-danger-line bg-danger-soft text-danger',
  info: 'border-info-line bg-info-soft text-info',
  neutral: 'border-line bg-surface-2 text-fg-muted',
  brand: 'border-transparent bg-primary-soft text-primary-soft-fg',
};

const DOTS: Record<BadgeTone, string> = {
  good: 'bg-success', warn: 'bg-warning', bad: 'bg-danger', info: 'bg-info', neutral: 'bg-fg-subtle', brand: 'bg-primary',
};

/** Status → tone. Every status is also spelled out, so colour is never the only cue. */
const STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: 'good', APPROVED: 'good', PAID: 'good', POSTED: 'good', RECEIVED: 'good', FULFILLED: 'good',
  WON: 'good', CONFIRMED: 'good', REIMBURSED: 'good', COMPLETED: 'good', OK: 'good', IN_STOCK: 'good',
  PENDING: 'warn', SUBMITTED: 'warn', NEGOTIATION: 'warn', LOW_STOCK: 'warn', PROCESSING: 'warn',
  SENT: 'info', ISSUED: 'info', ONBOARDING: 'info', QUALIFIED: 'info', PROPOSAL: 'info', WORKING: 'info',
  DRAFT: 'neutral', PROSPECT: 'neutral', DISABLED: 'neutral', INACTIVE: 'neutral',
  REJECTED: 'bad', OVERDUE: 'bad', VOID: 'bad', CANCELLED: 'bad', TERMINATED: 'bad', LOST: 'bad',
  HIGH: 'bad', MEDIUM: 'warn', LOW: 'good',
};

export function statusTone(status: string): BadgeTone {
  return STATUS_TONE[status.toUpperCase().replace(/\s+/g, '_')] ?? 'neutral';
}

/**
 * A status pill. Pass the raw enum (e.g. "SUBMITTED"); it is shown as "Submitted"
 * and coloured by STATUS_TONE unless a tone is given.
 */
export function Badge({ children, tone, dot = true, className }: { children: string; tone?: BadgeTone; dot?: boolean; className?: string }) {
  const t = tone ?? statusTone(children);
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', TONES[t], className)}>
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', DOTS[t])} aria-hidden />}
      {/^[A-Z_]+$/.test(children) ? titleCase(children) : children}
    </span>
  );
}
