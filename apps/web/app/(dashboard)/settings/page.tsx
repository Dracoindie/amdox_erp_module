'use client';

import { useState } from 'react';
import { Settings2, Users, Shield, Activity, UserPlus, Copy } from 'lucide-react';
import type { AuditLog, CreatedUser, Role, SystemHealth, User } from '@repo/types';
import api, { API_BASE } from '../../../lib/axios';
import { useApi, useMutation } from '../../../lib/useApi';
import { useAuthUser } from '../../../lib/useAuth';
import { can } from '../../../lib/permissions';
import { date, dateTime, titleCase } from '../../../lib/format';
import {
  Badge, Button, Card, DataState, ErrorState, Field, InlineError, Input, PageHeader, Pager, Select, StatCard, Table, Tabs, Td,
} from '../../../components/ui';

type Tab = 'general' | 'users' | 'audit' | 'health';
const TABS = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'audit', label: 'Audit Log', icon: Shield },
  { id: 'health', label: 'System Health', icon: Activity },
] as const;

const ROLE_OPTIONS: Role[] = ['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'SALES_REP', 'EMPLOYEE', 'READ_ONLY'];

export default function SettingsPage() {
  const user = useAuthUser();
  const [tab, setTab] = useState<Tab>('general');
  const admin = can(user, 'ADMIN');
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Account, users, audit trail and system status" />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'general' && <GeneralTab />}
      {tab !== 'general' && !admin && <Card><ErrorState status={403} message="" /></Card>}
      {tab === 'users' && admin && <UsersTab />}
      {tab === 'audit' && admin && <AuditTab />}
      {tab === 'health' && admin && <HealthTab />}
    </div>
  );
}

function GeneralTab() {
  const user = useAuthUser();
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card title="Your account">
        <dl className="grid grid-cols-3 gap-y-3 text-sm">
          <dt className="text-slate-500">Email</dt><dd className="col-span-2 font-medium">{user?.email}</dd>
          <dt className="text-slate-500">Role</dt><dd className="col-span-2"><Badge tone="info">{user?.role ?? ''}</Badge></dd>
          <dt className="text-slate-500">Employee</dt><dd className="col-span-2">{user?.employee?.name ?? 'Not linked'}</dd>
          <dt className="text-slate-500">Member since</dt><dd className="col-span-2">{date(user?.createdAt)}</dd>
        </dl>
      </Card>
      <Card title="Organisation">
        <dl className="grid grid-cols-3 gap-y-3 text-sm">
          <dt className="text-slate-500">Company</dt><dd className="col-span-2 font-medium">Amdox Technology</dd>
          <dt className="text-slate-500">Deployment</dt><dd className="col-span-2">Single organisation (multi-tenancy is planned)</dd>
          <dt className="text-slate-500">API</dt><dd className="col-span-2 break-all font-mono text-xs">{API_BASE || '/api/v1 (mocked)'}</dd>
        </dl>
      </Card>
    </div>
  );
}

function UsersTab() {
  const me = useAuthUser();
  const [page, setPage] = useState(1);
  const users = useApi<User[]>(`/users?page=${page}&limit=20&sort=email&order=asc`);
  const [form, setForm] = useState({ email: '', role: 'EMPLOYEE' as Role });
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const create = useMutation(async () => {
    const res = await api.post('/users', form);
    setCreatedUser(res.data.data as CreatedUser);
    setForm({ email: '', role: 'EMPLOYEE' });
    users.reload();
  });
  const update = useMutation(async (id: string, patch: { role?: Role; isActive?: boolean }) => {
    await api.patch(`/users/${id}`, patch);
    users.reload();
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card title="Users" className="lg:col-span-2">
        <InlineError message={update.error} />
        <DataState state={users} empty={{ title: 'No users' }}>
          {(rows) => (
            <>
              <Table head={['Email', 'Employee', 'Role', 'Status', 'Created', '']}>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <Td className="font-medium">{u.email}</Td>
                    <Td>{u.employee?.name ?? '—'}</Td>
                    <Td>
                      <Select aria-label={`Role of ${u.email}`} value={u.role} disabled={update.pending || u.id === me?.id} onChange={(e) => void update.run(u.id, { role: e.target.value as Role })} className="w-44 py-1 text-xs">
                        {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{titleCase(r)}</option>)}
                      </Select>
                    </Td>
                    <Td><Badge tone={u.isActive ? 'good' : 'bad'}>{u.isActive ? 'Active' : 'Disabled'}</Badge></Td>
                    <Td>{date(u.createdAt)}</Td>
                    <Td>
                      {u.id !== me?.id && (
                        <Button size="sm" variant="secondary" disabled={update.pending} onClick={() => void update.run(u.id, { isActive: !u.isActive })}>
                          {u.isActive ? 'Disable' : 'Enable'}
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </Table>
              <Pager meta={users.meta} onPage={setPage} />
            </>
          )}
        </DataState>
      </Card>
      <Card title={<span className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Create user</span>}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setCreatedUser(null); void create.run(); }}>
          <Field label="Email"><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{titleCase(r)}</option>)}
            </Select>
          </Field>
          <InlineError message={create.error} />
          <Button type="submit" disabled={create.pending} className="w-full">{create.pending ? 'Creating…' : 'Create user'}</Button>
        </form>
        {createdUser && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="font-semibold text-amber-800 dark:text-amber-300">Temporary password for {createdUser.email}</p>
            <p className="mt-1 flex items-center gap-2 font-mono">
              {createdUser.temporaryPassword}
              <button type="button" aria-label="Copy password" onClick={() => void navigator.clipboard?.writeText(createdUser.temporaryPassword)}>
                <Copy className="h-4 w-4 text-amber-700" />
              </button>
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Shown once. Share it securely; e-mail delivery is not set up yet.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function AuditTab() {
  const [page, setPage] = useState(1);
  const logs = useApi<AuditLog[]>(`/admin/audit-logs?page=${page}&limit=25`);
  return (
    <Card title="Audit log">
      <DataState state={logs} empty={{ title: 'No audit entries yet' }}>
        {(rows) => (
          <>
            <Table head={['When', 'User', 'Action', 'Entity', 'IP']}>
              {rows.map((l) => (
                <tr key={l.id}>
                  <Td className="whitespace-nowrap">{dateTime(l.timestamp)}</Td>
                  <Td>{l.user.email}</Td>
                  <Td><Badge tone={l.action === 'LOGIN' || l.action === 'LOGOUT' ? 'neutral' : 'info'}>{l.action}</Badge></Td>
                  <Td className="font-mono text-xs">{l.entity}{l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ''}</Td>
                  <Td className="font-mono text-xs">{l.ip ?? '—'}</Td>
                </tr>
              ))}
            </Table>
            <Pager meta={logs.meta} onPage={setPage} />
          </>
        )}
      </DataState>
    </Card>
  );
}

function HealthTab() {
  const health = useApi<SystemHealth>('/admin/system-health');
  const ready = useApi<{ database: string }>('/health/ready');
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="API" value={health.error ? 'Down' : health.data ? 'Healthy' : '…'} tone={health.error ? 'bad' : 'good'} />
        <StatCard label="Database" value={ready.error ? 'Unavailable' : ready.data ? 'Connected' : '…'} tone={ready.error ? 'bad' : 'good'} />
        <StatCard label="Checked" value={health.data ? new Date(health.data.timestamp).toLocaleTimeString() : '—'} hint={<button className="underline" onClick={() => { health.reload(); ready.reload(); }}>Refresh</button>} />
      </div>
      <Card title="Record counts">
        <DataState state={health} isEmpty={() => false}>
          {(h) => (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Users" value={h.stats.users} />
              <StatCard label="Active employees" value={h.stats.employees} />
              <StatCard label="Active products" value={h.stats.products} />
            </div>
          )}
        </DataState>
      </Card>
    </div>
  );
}
