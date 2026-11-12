'use client';

import { useState } from 'react';
import { Activity, Check, Copy, Database, RefreshCw, Server, Settings2, Shield, UserPlus, Users } from 'lucide-react';
import type { AuditLog, CreatedUser, Role, SystemHealth, User } from '@repo/types';
import api, { API_BASE } from '../../../lib/axios';
import { useApi, useMutation } from '../../../lib/useApi';
import { useAuthUser } from '../../../lib/useAuth';
import { can } from '../../../lib/permissions';
import { useTheme, type ThemePref } from '../../../lib/theme';
import { CURRENCY, LOCALE, auditPhrase, date, dateTime, roleLabel, time } from '../../../lib/format';
import {
  Alert, Badge, Button, Card, DataState, DataTable, DescriptionList, Field, Form, Input, PageHeader, Pagination,
  Select, StatCard, TabPanel, Tabs, cx, useConfirm, useTabParam, type Column,
} from '../../../components/ui';

const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

const ROLE_OPTIONS: Role[] = ['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'SALES_REP', 'EMPLOYEE', 'READ_ONLY'];

export default function SettingsPage() {
  const user = useAuthUser();
  const admin = can(user, 'ADMIN');
  // Admin-only sections are hidden for other roles instead of showing "no access"
  const tabs = [
    { id: 'general', label: 'General', icon: Settings2 },
    { id: 'users', label: 'Users & roles', icon: Users, hidden: !admin },
    { id: 'audit', label: 'Audit log', icon: Shield, hidden: !admin },
    { id: 'health', label: 'System health', icon: Activity, hidden: !admin },
  ] as const;
  const [tab, setTab] = useTabParam(tabs);
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description={admin ? 'Your account, users, audit trail and system status.' : 'Your account and preferences.'} />
      <Tabs tabs={tabs} active={tab} onChange={setTab} label="Settings sections" />
      <TabPanel id={tab}>
        {tab === 'general' && <GeneralTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'audit' && <AuditTab />}
        {tab === 'health' && <HealthTab />}
      </TabPanel>
    </div>
  );
}

const THEMES: Array<{ id: ThemePref; label: string }> = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'Match system' },
];

function GeneralTab() {
  const user = useAuthUser();
  const { pref, setPref } = useTheme();
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card title="Your account">
        <DescriptionList
          items={[
            { label: 'Email', value: user?.email },
            { label: 'Role', value: user ? <Badge tone="brand" dot={false}>{roleLabel(user.role)}</Badge> : '—' },
            { label: 'Employee record', value: user?.employee?.name ?? <span className="text-fg-subtle">Not linked</span> },
            { label: 'Member since', value: date(user?.createdAt) },
          ]}
        />
      </Card>
      <Card title="Appearance" description="Saved in this browser.">
        <fieldset>
          <legend className="sr-only">Theme</legend>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <label
                key={t.id}
                className={cx(
                  'flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                  pref === t.id ? 'border-primary bg-primary-soft text-primary-soft-fg' : 'border-line-strong text-fg-muted hover:bg-surface-2',
                )}
              >
                <input type="radio" name="theme" value={t.id} checked={pref === t.id} onChange={() => setPref(t.id)} className="sr-only" />
                {pref === t.id && <Check className="h-4 w-4" aria-hidden />}
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>
      <Card title="Organisation" className="xl:col-span-2">
        <DescriptionList
          items={[
            { label: 'Company', value: 'Amdox Technology' },
            { label: 'Deployment', value: 'Single organisation (multi-tenancy is planned)' },
            { label: 'Currency & locale', value: `${CURRENCY} · ${LOCALE}` },
            { label: 'API', value: <span className="break-all font-mono text-xs">{API_BASE || '/api/v1 (mocked)'}</span> },
          ]}
        />
      </Card>
    </div>
  );
}

function UsersTab() {
  const me = useAuthUser();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const users = useApi<User[]>(`/users?page=${page}&limit=20&sort=email&order=asc`);
  const update = useMutation(async (u: User, patch: { role?: Role; isActive?: boolean }) => {
    await api.patch(`/users/${u.id}`, patch);
    users.reload();
    if (patch.role) return `${u.email} is now ${roleLabel(patch.role).toLowerCase()}`;
    return `${u.email} ${patch.isActive ? 'enabled' : 'disabled'}`;
  }, { success: (m) => m, errorToast: true });

  const changeRole = async (u: User, role: Role) => {
    if (role === u.role) return;
    const ok = await confirm({
      title: 'Change role?',
      message: <>Change <strong className="text-fg">{u.email}</strong> from {roleLabel(u.role).toLowerCase()} to <strong className="text-fg">{roleLabel(role).toLowerCase()}</strong>? Their access changes at their next sign-in or token refresh.</>,
      confirmLabel: 'Change role',
    });
    if (ok) await update.run(u, { role });
    else users.reload(); // reset the select
  };
  const toggle = async (u: User) => {
    if (u.isActive && !(await confirm({
      title: `Disable ${u.email}?`,
      message: 'They will be signed out and unable to sign in until an administrator enables the account again.',
      confirmLabel: 'Disable user', tone: 'danger',
    }))) return;
    await update.run(u, { isActive: !u.isActive });
  };

  const columns: Column<User>[] = [
    {
      key: 'email', header: 'User', primary: true,
      cell: (u) => <><span className="block font-medium">{u.email}</span><span className="block text-xs text-fg-subtle">{u.employee?.name ?? 'No employee record'}{u.id === me?.id && ' · you'}</span></>,
    },
    {
      key: 'role', header: 'Role',
      cell: (u) => u.id === me?.id ? <Badge tone="brand" dot={false}>{roleLabel(u.role)}</Badge> : (
        <Select aria-label={`Role of ${u.email}`} value={u.role} disabled={update.pending} onChange={(e) => void changeRole(u, e.target.value as Role)} className="w-48">
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
        </Select>
      ),
    },
    { key: 'status', header: 'Status', cell: (u) => <Badge tone={u.isActive ? 'good' : 'neutral'}>{u.isActive ? 'Active' : 'Disabled'}</Badge> },
    { key: 'created', header: 'Created', cell: (u) => date(u.createdAt), className: 'whitespace-nowrap' },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', mobileLabel: '',
      cell: (u) => u.id === me?.id ? null : (
        <Button size="sm" variant={u.isActive ? 'ghost' : 'secondary'} disabled={update.pending} onClick={() => void toggle(u)}>
          {u.isActive ? 'Disable' : 'Enable'}
        </Button>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card title="Users" flush className="xl:col-span-2">
        <DataState state={users} empty={{ icon: Users, title: 'No users' }}>
          {(rows) => (
            <DataTable caption="Users" columns={columns} rows={rows} rowKey={(u) => u.id} footer={<Pagination meta={users.meta} onPage={setPage} noun="users" />} />
          )}
        </DataState>
      </Card>
      <CreateUserCard onCreated={users.reload} />
    </div>
  );
}

function CreateUserCard({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ email: '', role: 'EMPLOYEE' as Role });
  const [created, setCreated] = useState<CreatedUser | null>(null);
  const [copied, setCopied] = useState(false);
  const create = useMutation(async () => {
    const res = await api.post('/users', form);
    setCreated(res.data.data as CreatedUser);
    setCopied(false);
    setForm({ email: '', role: 'EMPLOYEE' });
    onCreated();
  }, { success: 'User created' });
  const copy = async () => {
    if (!created) return;
    await navigator.clipboard?.writeText(created.temporaryPassword).catch(() => undefined);
    setCopied(true);
  };
  return (
    <Card title="Invite a user" description="A one-time password is generated for the new account." className="self-start">
      <Form onSubmit={() => { setCreated(null); return create.run(); }} errors={create.fieldErrors} error={create.error}>
        <Field label="Email" name="email" required><Input type="email" inputMode="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Role" name="role">
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </Select>
        </Field>
        <Button type="submit" icon={UserPlus} loading={create.pending} className="w-full">Create user</Button>
      </Form>
      {created && (
        <Alert tone="warning" className="mt-4" title={`Temporary password for ${created.email}`}>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-line bg-surface px-2 py-1.5 font-mono text-sm text-fg">{created.temporaryPassword}</code>
            <Button size="sm" variant="secondary" icon={copied ? Check : Copy} onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</Button>
          </div>
          <p className="mt-2 text-xs">Shown once. Share it securely — e-mail delivery isn&apos;t set up yet.</p>
        </Alert>
      )}
    </Card>
  );
}

function AuditTab() {
  const [page, setPage] = useState(1);
  const logs = useApi<AuditLog[]>(`/admin/audit-logs?page=${page}&limit=25`);
  const columns: Column<AuditLog>[] = [
    { key: 'when', header: 'When', cell: (l) => <time dateTime={l.timestamp} className="whitespace-nowrap">{dateTime(l.timestamp)}</time> },
    { key: 'user', header: 'User', primary: true, cell: (l) => <span className="font-medium">{l.user.email}</span> },
    { key: 'action', header: 'Action', cell: (l) => <Badge tone={l.action === 'LOGIN' || l.action === 'LOGOUT' ? 'neutral' : l.action === 'DELETE' ? 'bad' : 'info'} dot={false}>{capitalize(auditPhrase(l.action, l.entity))}</Badge> },
    { key: 'entity', header: 'Record', cell: (l) => <span className="font-mono text-xs">{l.entity}{l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ''}</span> },
    { key: 'ip', header: 'IP address', cell: (l) => <span className="font-mono text-xs text-fg-muted">{l.ip ?? '—'}</span> },
  ];
  return (
    <Card title="Audit log" description="Every sign-in and every change made through the API." flush>
      <DataState state={logs} empty={{ icon: Shield, title: 'No audit entries yet' }}>
        {(rows) => <DataTable caption="Audit log" columns={columns} rows={rows} rowKey={(l) => l.id} footer={<Pagination meta={logs.meta} onPage={setPage} noun="entries" />} />}
      </DataState>
    </Card>
  );
}

function HealthTab() {
  const health = useApi<SystemHealth>('/admin/system-health');
  const ready = useApi<{ database: string }>('/health/ready');
  const refresh = () => { health.reload(); ready.reload(); };
  const status = (s: typeof health | typeof ready, ok: string, bad: string) =>
    s.loading && !s.data ? 'Checking…' : s.error ? bad : ok;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="API" icon={Server} value={status(health, 'Healthy', 'Down')} hint={health.error ?? 'Responding normally'} tone={health.error ? 'bad' : health.data ? 'good' : 'neutral'} />
        <StatCard label="Database" icon={Database} value={status(ready, 'Connected', 'Unavailable')} hint={ready.error ?? 'Accepting queries'} tone={ready.error ? 'bad' : ready.data ? 'good' : 'neutral'} />
        <div className="flex flex-col justify-between rounded-xl border border-line bg-surface p-4 shadow-xs sm:p-5">
          <p className="text-sm font-medium text-fg-muted">Last checked</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-fg">{health.data ? time(health.data.timestamp) : '—'}</p>
          <Button size="sm" variant="secondary" icon={RefreshCw} loading={health.loading || ready.loading} onClick={refresh} className="mt-2 self-start">Check again</Button>
        </div>
      </div>
      <Card title="Record counts">
        <DataState state={health} isEmpty={() => false} skeleton={<div className="h-24 animate-pulse rounded-lg bg-surface-3" />}>
          {(h) => (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[['Users', h.stats.users], ['Active employees', h.stats.employees], ['Active products', h.stats.products]].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-surface-2 p-4">
                  <dt className="text-sm text-fg-muted">{label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-fg">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </DataState>
      </Card>
    </div>
  );
}
