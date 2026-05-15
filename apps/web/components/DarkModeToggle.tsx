'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('amx_dark_mode');
    const enabled = stored === 'true';
    setDark(enabled);
    document.documentElement.classList.toggle('dark', enabled);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('amx_dark_mode', String(next));
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <button
      id="dark-mode-toggle"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-[#ff5a00]/40 hover:text-[#ff5a00] transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
