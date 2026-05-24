'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from "./components/Sidebar";
import NotificationBell from "../../components/NotificationBell";
import DarkModeToggle from "../../components/DarkModeToggle";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('amx_access_token');
    if (!token) {
      router.replace('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ff5a00] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 px-6 shadow-sm z-10">
          <h1 className="text-lg font-bold tracking-wide text-slate-900 dark:text-white">
            AMDOX <span className="text-[#ff5a00]">ERP</span>{' '}
            <span className="text-slate-400 font-normal ml-2 dark:text-slate-500">| Dashboard</span>
          </h1>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-6 relative">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-[#ff5a00] opacity-5 blur-[150px] pointer-events-none" />
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}