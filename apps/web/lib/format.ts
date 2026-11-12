// Display helpers. The API sends money as decimal strings; convert only here.

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const compactCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });

export const toNumber = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? 0 : Number(v));

export const money = (v: string | number | null | undefined) => currency.format(toNumber(v));
export const moneyCompact = (v: string | number | null | undefined) => compactCurrency.format(toNumber(v));

export function date(v: string | null | undefined) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function dateTime(v: string | null | undefined) {
  if (!v) return '—';
  return new Date(v).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

/** "2026-05" → "May 2026" (or "May" when short) */
export function monthLabel(key: string, short = false) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y!, (m ?? 1) - 1, 1));
  return d.toLocaleDateString('en-US', short ? { month: 'short', timeZone: 'UTC' } : { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function timeAgo(v: string) {
  const s = Math.max(0, (Date.now() - new Date(v).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const titleCase = (v: string) => v.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
