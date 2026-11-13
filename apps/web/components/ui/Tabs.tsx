'use client';

import { useCallback, useRef, type ComponentType, type KeyboardEvent, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cx } from './cx';

export interface TabDef<T extends string> {
  id: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  /** Hide the tab (e.g. the role cannot use it) */
  hidden?: boolean;
}

/**
 * The active tab lives in the URL (?tab=…), so reload, back/forward and shared
 * links keep it. Unknown or hidden ids fall back to the first visible tab.
 */
export function useTabParam<T extends string>(tabs: readonly TabDef<T>[]) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const visible = tabs.filter((t) => !t.hidden);
  const requested = params.get('tab');
  const active = (visible.find((t) => t.id === requested) ?? visible[0])!.id;
  const setActive = useCallback(
    (id: T) => {
      const next = new URLSearchParams(params.toString());
      if (id === visible[0]?.id) next.delete('tab');
      else next.set('tab', id);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router, visible],
  );
  return [active, setActive] as const;
}

/** Accessible tab list: arrow keys / Home / End move between tabs (WAI-ARIA tabs pattern). */
export function Tabs<T extends string>({
  tabs, active, onChange, label,
}: {
  tabs: readonly TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const visible = tabs.filter((t) => !t.hidden);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = visible.findIndex((t) => t.id === active);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % visible.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + visible.length) % visible.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = visible.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const id = visible[next]!.id;
    onChange(id);
    refs.current[id]?.focus();
  };

  if (visible.length <= 1) return null;

  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex min-w-max gap-1 border-b border-line">
        {visible.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => { refs.current[t.id] = el; }}
              role="tab"
              type="button"
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(t.id)}
              className={cx(
                '-mb-px flex h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-offset-[-2px]',
                selected ? 'border-primary text-fg' : 'border-transparent text-fg-muted hover:border-line-strong hover:text-fg',
              )}
            >
              {t.icon && <t.icon className={cx('h-4 w-4', selected ? 'text-primary' : 'text-fg-subtle')} aria-hidden />}
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} className="space-y-6 focus-visible:outline-none">
      {children}
    </div>
  );
}
