'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePref } from '../lib/theme';
import { IconButton } from './ui';

const NEXT: Record<ThemePref, ThemePref> = { light: 'dark', dark: 'system', system: 'light' };
const LABEL: Record<ThemePref, string> = { light: 'Light', dark: 'Dark', system: 'System' };
const ICON = { light: Sun, dark: Moon, system: Monitor };

/** Cycles light → dark → system. The label says the current mode and what a click does. */
export default function ThemeToggle({ className }: { className?: string }) {
  const { pref, setPref } = useTheme();
  return (
    <IconButton
      icon={ICON[pref]}
      onClick={() => setPref(NEXT[pref])}
      aria-label={`Theme: ${LABEL[pref]}. Switch to ${LABEL[NEXT[pref]].toLowerCase()}`}
      title={`Theme: ${LABEL[pref]}`}
      className={className}
    />
  );
}
