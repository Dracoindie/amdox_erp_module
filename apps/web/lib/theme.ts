'use client';

import { useSyncExternalStore } from 'react';

// Theme preference: 'light' | 'dark' | 'system' (follows the OS). Stored per
// browser. The inline THEME_SCRIPT applies it before first paint, so there is
// no white flash for dark-mode users.

export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'amx_theme';

/** Runs in <head> before the page paints. Keep it tiny and dependency-free. */
export const THEME_SCRIPT = `(function(){try{var k='${KEY}',p=localStorage.getItem(k);if(!p){var o=localStorage.getItem('amx_dark_mode');p=o==='true'?'dark':o==='false'?'light':'system';}var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.dataset.themePref=p;}catch(e){}})();`;

const listeners = new Set<() => void>();
const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

function readPref(): ThemePref {
  try {
    const p = localStorage.getItem(KEY);
    if (p === 'light' || p === 'dark' || p === 'system') return p;
  } catch { /* storage blocked */ }
  return (document.documentElement.dataset.themePref as ThemePref) || 'system';
}

function apply(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && mq().matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.dataset.themePref = pref;
}

export function setThemePref(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref);
    localStorage.removeItem('amx_dark_mode');
  } catch { /* storage blocked: still apply for this page */ }
  apply(pref);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onOs = () => {
    if (readPref() === 'system') apply('system');
    listener();
  };
  const media = mq();
  media.addEventListener('change', onOs);
  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', onOs);
  };
}

/** Current preference and whether dark is in effect. */
export function useTheme() {
  const pref = useSyncExternalStore(subscribe, readPref, () => 'system' as ThemePref);
  const dark = useSyncExternalStore(subscribe, () => document.documentElement.classList.contains('dark'), () => false);
  return { pref, dark, setPref: setThemePref };
}
