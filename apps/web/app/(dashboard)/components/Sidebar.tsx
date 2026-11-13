'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useAuthUser } from '../../../lib/useAuth';
import { isActive, navFor } from '../../../lib/navigation';
import { Logo } from '../../../components/Logo';
import { IconButton, cx } from '../../../components/ui';

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const user = useAuthUser();
  const items = navFor(user);
  return (
    <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                  active ? 'bg-primary-soft text-primary-soft-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                )}
              >
                <item.icon className={cx('h-[18px] w-[18px] shrink-0', active ? 'text-primary-soft-fg' : 'text-fg-subtle group-hover:text-fg-muted')} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Fixed sidebar from the `lg` breakpoint up. */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-5">
        <Link href="/"><Logo /><span className="sr-only"> (home)</span></Link>
      </div>
      <NavLinks />
      <p className="border-t border-line px-5 py-3 text-xs text-fg-subtle">AMX-ERP-2026 · v0.2</p>
    </aside>
  );
}

/**
 * Off-canvas navigation below `lg`. A native modal <dialog> traps focus, closes
 * on Escape and on backdrop click; it also closes after navigating.
 */
export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Close when the route changes (e.g. browser back while open)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <dialog
      ref={ref}
      aria-label="Navigation"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="fixed inset-y-0 left-0 m-0 h-dvh max-h-dvh w-72 max-w-[85vw] border-r border-line bg-surface p-0 text-fg shadow-xl lg:hidden"
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
          <Logo />
          <IconButton icon={X} aria-label="Close navigation" onClick={onClose} />
        </div>
        <NavLinks onNavigate={onClose} />
      </div>
    </dialog>
  );
}
