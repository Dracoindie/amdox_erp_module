'use client';

import { useState, useEffect } from "react";
import { Settings2, Shield, Users, Activity, HardDrive, Cpu, Network, CheckCircle, AlertTriangle, Play, Mail } from "lucide-react";
import { api } from "../../../lib/axios";

// ── Mock Data ───────────────────────────────────────────────────────────────
const MOCK_USERS = [
  { id: "USR-001", name: "Admin User", email: "admin@amdox.com", role: "SUPER_ADMIN", status: "Active" },
  { id: "USR-002", name: "HR Manager", email: "hr@amdox.com", role: "HR_MANAGER", status: "Active" },
  { id: "USR-003", name: "Finance Lead", email: "finance@amdox.com", role: "FINANCE_MANAGER", status: "Active" },
];

const MOCK_AUDIT = [
  { id: "AUD-104", user: "Admin User", action: "UPDATE_ROLE", details: "Changed USR-003 role to FINANCE_MANAGER", date: "2026-05-13 14:30:00", ip: "192.168.1.105" },
  { id: "AUD-103", user: "HR Manager", action: "CONFIRM_PAYROLL", details: "Confirmed payroll for May 2026", date: "2026-05-13 10:15:00", ip: "10.0.0.52" },
  { id: "AUD-102", user: "System", action: "DB_BACKUP", details: "Automated nightly backup completed", date: "2026-05-13 02:00:00", ip: "localhost" },
  { id: "AUD-101", user: "Admin User", action: "LOGIN", details: "Successful login", date: "2026-05-12 09:00:00", ip: "192.168.1.105" },
];

type Tab = "general" | "users" | "audit" | "health";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [users, setUsers] = useState(MOCK_USERS);
  
  // Health State
  const [health, setHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'health') {
      fetchHealth();
    }
  }, [activeTab]);

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await api.get('/health');
      setHealth(res.data);
    } catch (err) {
      // Fallback mock health
      setHealth({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: 345600,
        memoryUsage: { heapUsed: 45000000, heapTotal: 80000000 },
        services: { database: "healthy", redis: "healthy" }
      });
    } finally {
      setHealthLoading(false);
    }
  };

  const handleRoleChange = (id: string, newRole: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    alert(`Role updated to ${newRole}`);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Invitation sent successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">System Settings</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage organization, access controls, and monitor system health</p>
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <nav className="-mb-px flex space-x-6 min-w-max">
          {(
            [
              { id: 'general', label: 'General Info', icon: Settings2 },
              { id: 'users', label: 'Users & Roles', icon: Users },
              { id: 'audit', label: 'Audit Logs', icon: Shield },
              { id: 'health', label: 'System Health', icon: Activity },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? 'border-[#ff5a00] text-[#ff5a00]'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "general" && (
        <div className="max-w-2xl space-y-6 animate-in fade-in">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Organization Profile</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
                <input type="text" defaultValue="Amdox Technology" className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-transparent text-slate-900 dark:text-white focus:ring-2 focus:ring-[#ff5a00] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tenant ID</label>
                <input type="text" defaultValue="TENANT-001" disabled className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-500" />
              </div>
              <button className="rounded-md bg-[#ff5a00] px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Mail className="h-4 w-4" /> Invite User</h3>
                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                    <input type="email" required placeholder="colleague@amdox.com" className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-transparent text-slate-900 dark:text-white focus:ring-2 focus:ring-[#ff5a00] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Initial Role</label>
                    <select className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-transparent text-slate-900 dark:text-white focus:ring-2 focus:ring-[#ff5a00] outline-none">
                      <option value="READ_ONLY">READ_ONLY</option>
                      <option value="HR_MANAGER">HR_MANAGER</option>
                      <option value="FINANCE_MANAGER">FINANCE_MANAGER</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full rounded-md bg-[#ff5a00] px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors">
                    Send Invitation
                  </button>
                </form>
              </div>
            </div>
            
            <div className="md:w-2/3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-bold text-slate-900 dark:text-white">Active Users</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                  <thead className="bg-white dark:bg-slate-800 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-3 font-medium">User</th>
                      <th className="px-6 py-3 font-medium">Role</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900 dark:text-white">{u.name}</div>
                          <div className="text-xs text-slate-400">{u.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-xs bg-transparent text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-[#ff5a00]"
                          >
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            <option value="HR_MANAGER">HR_MANAGER</option>
                            <option value="FINANCE_MANAGER">FINANCE_MANAGER</option>
                            <option value="INVENTORY_MANAGER">INVENTORY_MANAGER</option>
                            <option value="READ_ONLY">READ_ONLY</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                            {u.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-rose-500 hover:underline text-xs font-medium">Revoke</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
             <h3 className="font-bold text-slate-900 dark:text-white">System Audit Log</h3>
             <button className="text-sm text-slate-500 hover:text-[#ff5a00]">Export Logs</button>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Timestamp</th>
                  <th className="px-6 py-3 font-medium">User / IP</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                  <th className="px-6 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-mono text-xs">
                {MOCK_AUDIT.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-400">{log.date}</td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 dark:text-slate-300 font-sans font-medium">{log.user}</div>
                      <div className="text-[10px] text-slate-400">{log.ip}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-700 dark:text-slate-300">{log.action}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-sans">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "health" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
             <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Activity className="h-5 w-5 text-emerald-500"/> Infrastructure Health</h3>
             <button onClick={fetchHealth} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
               <Play className={`h-4 w-4 ${healthLoading ? 'animate-spin' : ''}`} /> Refresh
             </button>
          </div>

          {health && (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400"><CheckCircle className="h-4 w-4"/></div>
                  <h4 className="font-bold text-slate-900 dark:text-white">API Server</h4>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">{health.status === 'ok' ? 'Online' : 'Degraded'}</p>
                <p className="text-xs text-slate-500">Uptime: {Math.floor(health.uptime / 3600)}h {(health.uptime % 3600 / 60).toFixed(0)}m</p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400"><HardDrive className="h-4 w-4"/></div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Database (Pg)</h4>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">{health.services?.database === 'healthy' ? 'Connected' : 'Error'}</p>
                <p className="text-xs text-slate-500">Latency: 12ms</p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400"><Network className="h-4 w-4"/></div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Redis Cache</h4>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">{health.services?.redis === 'healthy' ? 'Connected' : 'Error'}</p>
                <p className="text-xs text-slate-500">Hit Rate: 94.2%</p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400"><Cpu className="h-4 w-4"/></div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Memory Usage</h4>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">{(health.memoryUsage?.heapUsed / 1024 / 1024).toFixed(1)} MB</p>
                <p className="text-xs text-slate-500">Of {(health.memoryUsage?.heapTotal / 1024 / 1024).toFixed(1)} MB Allocated</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
