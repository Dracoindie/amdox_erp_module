'use client';

import { useState } from 'react';
import {
  Building2, Users, Bell, Activity, Save, Plus, Trash2,
  CheckCircle, Shield, Mail, Globe, Clock
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type Role = 'Super Admin' | 'HR Manager' | 'Finance Manager' | 'Inventory Manager' | 'Sales Rep' | 'Read-Only';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'Active' | 'Pending' | 'Disabled';
  lastLogin: string;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_USERS: UserRow[] = [
  { id: 'U-001', name: 'Admin User',     email: 'admin@amdox.com',    role: 'Super Admin',       status: 'Active',  lastLogin: '2026-05-12' },
  { id: 'U-002', name: 'Carol White',    email: 'carol@amdox.com',    role: 'HR Manager',        status: 'Active',  lastLogin: '2026-05-11' },
  { id: 'U-003', name: 'David Okafor',   email: 'david@amdox.com',    role: 'Finance Manager',   status: 'Active',  lastLogin: '2026-05-10' },
  { id: 'U-004', name: 'Sarah Lindqvist',email: 'sarah@amdox.com',    role: 'Inventory Manager', status: 'Active',  lastLogin: '2026-05-09' },
  { id: 'U-005', name: 'Bob Smith',      email: 'bob@amdox.com',      role: 'Sales Rep',         status: 'Active',  lastLogin: '2026-05-08' },
  { id: 'U-006', name: 'New Analyst',    email: 'analyst@amdox.com',  role: 'Read-Only',         status: 'Pending', lastLogin: 'Never' },
];

const ROLE_COLORS: Record<Role, string> = {
  'Super Admin':       'bg-[#0055A5]/10 text-[#0055A5]',
  'HR Manager':        'bg-emerald-100 text-emerald-700',
  'Finance Manager':   'bg-violet-100 text-violet-700',
  'Inventory Manager': 'bg-amber-100 text-amber-700',
  'Sales Rep':         'bg-blue-100 text-blue-700',
  'Read-Only':         'bg-gray-100 text-gray-600',
};

const MODULE_STATUS = [
  { name: 'Financial Ledger', route: '/finance', built: true  },
  { name: 'HR & Payroll',     route: '/hr',      built: true  },
  { name: 'Supply Chain',     route: '/scm',     built: true  },
  { name: 'CRM & Sales',      route: '/crm',     built: true  },
  { name: 'Business Intel.',  route: '/bi',      built: true  },
  { name: 'API Backend',      route: 'apps/api', built: false },
  { name: 'Auth (JWT)',        route: '/auth',    built: false },
  { name: 'PDF Export',       route: 'Phase 3',  built: false },
];

// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'org',      label: 'Organisation',   icon: Building2 },
  { id: 'users',    label: 'User Management',icon: Users     },
  { id: 'notifs',   label: 'Notifications',  icon: Bell      },
  { id: 'system',   label: 'System Info',    icon: Activity  },
] as const;
type Tab = typeof TABS[number]['id'];

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#0055A5] focus:ring-1 focus:ring-[#0055A5] outline-none';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('org');
  const [users, setUsers] = useState<UserRow[]>(MOCK_USERS);
  const [saved, setSaved] = useState(false);

  const [org, setOrg] = useState({
    name: 'Amdox Technology',
    domain: 'amdox.com',
    timezone: 'Asia/Kolkata',
    fiscalYear: 'April – March',
    currency: 'USD',
  });

  const [notifs, setNotifs] = useState({
    lowStock: true,
    payrollReminder: true,
    newLead: true,
    leaveRequest: true,
    invoiceOverdue: true,
    systemAlerts: false,
  });

  const handleSaveOrg = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteUser = (id: string) => {
    setUsers(u => u.filter(x => x.id !== id));
  };

  const toggle = (k: keyof typeof notifs) => setNotifs(n => ({ ...n, [k]: !n[k] }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Manage organisation profile, users, roles, and system preferences</p>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                tab === id
                  ? 'border-[#0055A5] text-[#0055A5]'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Organisation Profile ── */}
      {tab === 'org' && (
        <div className="max-w-2xl space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-base font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#0055A5]" /> Organisation Details
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Organisation Name</label>
                  <input className={inputCls} value={org.name} onChange={e => setOrg({ ...org, name: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Domain</label>
                  <div className="relative">
                    <Globe className="pointer-events-none absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input className={`${inputCls} pl-9`} value={org.domain} onChange={e => setOrg({ ...org, domain: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Timezone</label>
                  <div className="relative">
                    <Clock className="pointer-events-none absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select className={`${inputCls} pl-9`} value={org.timezone} onChange={e => setOrg({ ...org, timezone: e.target.value })}>
                      <option>Asia/Kolkata</option>
                      <option>America/New_York</option>
                      <option>Europe/London</option>
                      <option>Asia/Singapore</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Fiscal Year</label>
                  <select className={inputCls} value={org.fiscalYear} onChange={e => setOrg({ ...org, fiscalYear: e.target.value })}>
                    <option>April – March</option>
                    <option>January – December</option>
                    <option>July – June</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Default Currency</label>
                <select className="w-48 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#0055A5] focus:ring-1 focus:ring-[#0055A5] outline-none" value={org.currency} onChange={e => setOrg({ ...org, currency: e.target.value })}>
                  <option>USD</option>
                  <option>EUR</option>
                  <option>INR</option>
                  <option>GBP</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveOrg}
              className="flex items-center gap-2 rounded-md bg-[#0055A5] px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm"
            >
              <Save className="h-4 w-4" /> Save Changes
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
                <CheckCircle className="h-4 w-4" /> Saved!
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── User Management ── */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{users.length} users · manage roles and access</p>
            <button className="flex items-center gap-2 rounded-md bg-[#0055A5] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm">
              <Plus className="h-4 w-4" /> Invite User
            </button>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Last Login</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0055A5]/10 text-[#0055A5] text-xs font-bold">
                          {u.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                        <Shield className="h-3 w-3" /> {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        u.status === 'Active'  ? 'bg-emerald-100 text-emerald-700' :
                        u.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{u.status}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{u.lastLogin}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="inline-flex items-center gap-1 rounded border border-rose-200 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Disable user"
                      >
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Notification Preferences ── */}
      {tab === 'notifs' && (
        <div className="max-w-xl">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-1">
            <h3 className="mb-4 text-base font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="h-5 w-5 text-[#0055A5]" /> Email Notification Preferences
            </h3>
            {(Object.entries(notifs) as [keyof typeof notifs, boolean][]).map(([key, val]) => {
              const labels: Record<keyof typeof notifs, string> = {
                lowStock:         'Low-stock alert (SCM)',
                payrollReminder:  'Payroll cycle reminder (HR)',
                newLead:          'New lead created (CRM)',
                leaveRequest:     'Leave request approval (HR)',
                invoiceOverdue:   'Invoice overdue (Finance)',
                systemAlerts:     'System-level alerts',
              };
              return (
                <div key={key} className="flex items-center justify-between rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors">
                  <span className="text-sm text-gray-700">{labels[key]}</span>
                  <button
                    onClick={() => toggle(key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                      val ? 'bg-[#0055A5]' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
                      val ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── System Info ── */}
      {tab === 'system' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#0055A5]" /> Stack Versions
              </h3>
              <dl className="space-y-3 text-sm">
                {[
                  ['Next.js',      '16.2.0'],
                  ['React',        '19.2.0'],
                  ['TypeScript',   '5.9.2'],
                  ['Tailwind CSS', '4.x'],
                  ['Zustand',      '4.5.0'],
                  ['Recharts',     '2.12.0'],
                  ['MSW',          '2.6.4'],
                  ['Turborepo',    'latest'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-gray-50 pb-2">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="font-mono font-medium text-gray-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-gray-900">Module Build Status</h3>
              <ul className="space-y-2">
                {MODULE_STATUS.map(m => (
                  <li key={m.name} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{m.name}</span>
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-500">{m.route}</code>
                      {m.built
                        ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle className="h-3.5 w-3.5" /> Live</span>
                        : <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">Planned</span>
                      }
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

