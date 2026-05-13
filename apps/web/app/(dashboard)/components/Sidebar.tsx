'use client';

import {
  LayoutDashboard, Wallet, Users, Package,
  BarChart3, Settings, UserCircle2, Building2, LogOut
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navigation = [
  { name: 'Dashboard',            icon: LayoutDashboard, href: '/' },
  { name: 'Financial Ledger',     icon: Wallet,          href: '/finance' },
  { name: 'HR & Payroll',         icon: Users,           href: '/hr' },
  { name: 'Supply Chain',         icon: Package,         href: '/scm' },
  { name: 'CRM & Sales',          icon: UserCircle2,     href: '/crm' },
  { name: 'Business Intelligence',icon: BarChart3,       href: '/bi' },
  { name: 'Settings',             icon: Settings,        href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const handleSignOut = () => {
    localStorage.removeItem('amx_access_token');
    localStorage.removeItem('amx_user');
    router.push('/login');
  };

  return (
    <div className="flex shrink-0 h-full w-64 flex-col bg-white text-slate-900 border-r border-slate-200 relative z-20 shadow-lg">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5 bg-slate-50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff5a00] to-orange-600 shadow-sm shadow-orange-500/20">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-extrabold tracking-tight leading-none text-slate-900">AMDOX <span className="text-[#ff5a00]">ERP</span></p>
          <p className="text-[10px] text-slate-500 font-medium leading-none mt-1 uppercase tracking-wider">AMX-2026</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto">
        <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Modules
        </p>
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-300 ${
                active
                  ? 'bg-orange-50 text-[#ff5a00] border-l-2 border-[#ff5a00]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-2 border-transparent'
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 shrink-0 transition-colors ${
                  active ? 'text-[#ff5a00]' : 'text-slate-400 group-hover:text-[#ff5a00]'
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 shadow-inner border border-slate-300">
              AD
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">Admin User</p>
              <p className="truncate text-[10px] font-medium text-[#ff5a00] uppercase tracking-wider">Super Admin</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            title="Sign Out"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
