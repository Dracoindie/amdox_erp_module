'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, LogOut, Menu, Settings } from 'lucide-react';
import { logout } from '../../../lib/auth';
import { useAuthUser } from '../../../lib/useAuth';
import { currentNav, TAB_LABELS } from '../../../lib/navigation';
import { initials, roleLabel } from '../../../lib/format';
import NotificationBell from '../../../components/NotificationBell';
import ThemeToggle from '../../../components/ThemeToggle';
import { IconButton, cx } from '../../../components/ui';

function Breadcrumbs() {
  const pathname = usePathname();
  const params = useSearchParams();
  const nav = currentNav(pathname);
  const tab = params.get('tab');
  const tabLabel = nav && tab ? TAB_LABELS[nav.href]?.[tab] : undefined;
  const crumbs = [
    ...(nav && nav.href !== '/' ? [{ label: nav.label, href: nav.href }] : [{ label: 'Dashboard', href: '/' }]),
    ...(tabLabel ? [{ label: tabLabel, href: `${nav!.href}?tab=${tab}` }] : []),
  ];
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.href} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />}
              {last ? (
                <span aria-current="page" className="truncate font-medium text-fg">{c.label}</span>
              ) : (
                <Link href={c.href} className="truncate text-fg-muted hover:text-fg">{c.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function UserMenu() {
  const user = useAuthUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const name = user?.employee?.name ?? user?.email ?? '';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      router.replace('/login');
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-10 items-center gap-2.5 rounded-lg pl-1 pr-1 transition-colors hover:bg-surface-2 sm:h-9 sm:pr-2.5"
      >
        <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-soft-fg sm:h-7 sm:w-7">
          {initials(name) || '?'}
        </span>
        {/* Named by its visible text plus screen-reader text, so the name matches what's shown (WCAG 2.5.3) */}
        <span className="sr-only">Account menu: </span>
        <span className="sr-only md:hidden">{name}</span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-40 truncate text-sm font-medium text-fg">{name}</span>
          <span className="block text-xs text-fg-subtle">{user ? roleLabel(user.role) : ''}</span>
        </span>
      </button>
      {open && (
        <div role="menu" aria-label="Account" className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium text-fg">{name}</p>
            <p className="truncate text-xs text-fg-subtle">{user?.email}</p>
            <p className="mt-1 text-xs text-fg-muted">{user ? roleLabel(user.role) : ''}</p>
          </div>
          <Link role="menuitem" href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-fg hover:bg-surface-2">
            <Settings className="h-4 w-4 text-fg-subtle" aria-hidden /> Settings
          </Link>
          <button role="menuitem" type="button" onClick={() => void signOut()} disabled={signingOut} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-fg hover:bg-surface-2 disabled:opacity-60">
            <LogOut className="h-4 w-4 text-fg-subtle" aria-hidden /> {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}

export function Header({ onMenu }: { onMenu: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header
      className={cx(
        'sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-surface/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80 sm:px-6 lg:px-8',
        scrolled ? 'border-line' : 'border-transparent lg:border-line',
      )}
    >
      <IconButton icon={Menu} aria-label="Open navigation" onClick={onMenu} className="-ml-2 lg:hidden" />
      <div className="min-w-0 flex-1"><Breadcrumbs /></div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationBell />
        <div className="ml-1"><UserMenu /></div>
      </div>
    </header>
  );
}
