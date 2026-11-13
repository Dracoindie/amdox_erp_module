// Display helpers. The API sends money as decimal strings; convert only here.
//
// Indian rupees with Indian digit grouping by default (₹12,34,567.00; compact
// ₹12.3L / ₹1.2Cr). A deployment can override both at build time with
// NEXT_PUBLIC_CURRENCY / NEXT_PUBLIC_LOCALE (e.g. USD / en-US).

export const LOCALE = process.env.NEXT_PUBLIC_LOCALE || 'en-IN';
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'INR';

const currency = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compactCurrency = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, notation: 'compact', maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });

/** The currency symbol on its own (for input prefixes), e.g. "$" or "₹". */
export const CURRENCY_SYMBOL =
  currency.formatToParts(0).find((p) => p.type === 'currency')?.value ?? CURRENCY;

export const toNumber = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? 0 : Number(v));

export const money = (v: string | number | null | undefined) => currency.format(toNumber(v));
export const moneyCompact = (v: string | number | null | undefined) => compactCurrency.format(toNumber(v));
export const num = (v: number | null | undefined) => (v == null ? '—' : integer.format(v));
export const dec = (v: number | null | undefined) => (v == null ? '—' : decimal.format(v));
export const pct = (v: number) => `${decimal.format(v)}%`;

export function date(v: string | null | undefined) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString(LOCALE, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function dateTime(v: string | null | undefined) {
  if (!v) return '—';
  return new Date(v).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
}

export function time(v: string | null | undefined) {
  if (!v) return '—';
  return new Date(v).toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
}

/** "2026-05" → "May 2026" (or "May" when short) */
export function monthLabel(key: string, short = false) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y!, (m ?? 1) - 1, 1));
  return d.toLocaleDateString(LOCALE, short ? { month: 'short', timeZone: 'UTC' } : { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** True when "YYYY-MM" is the current (still running) month. */
export function isCurrentMonth(key: string) {
  const now = new Date();
  return key === `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function timeAgo(v: string) {
  const s = Math.max(0, (Date.now() - new Date(v).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return date(v);
}

export const titleCase = (v: string) => v.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Role enum → "Finance manager" */
export const roleLabel = (v: string) => {
  const s = v.toLowerCase().replace(/_/g, ' ').replace(/\bhr\b/, 'HR');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function initials(text: string) {
  return text.split(/[\s.@_-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
}

const ACTIONS: Record<string, string> = {
  LOGIN: 'signed in', LOGOUT: 'signed out',
  POST: 'created', PUT: 'updated', PATCH: 'updated', DELETE: 'deleted',
  CREATE: 'created', UPDATE: 'updated',
};

/** Audit entry → "signed in" / "created invoice" */
export function auditPhrase(action: string, entity: string) {
  const verb = ACTIONS[action.toUpperCase()] ?? action.toLowerCase();
  if (action === 'LOGIN' || action === 'LOGOUT') return verb;
  const noun = entity.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').toLowerCase();
  return `${verb} ${noun.replace(/s$/, '')}`;
}
