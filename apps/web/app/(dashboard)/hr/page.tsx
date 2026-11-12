'use client';

import { useMemo, useState } from 'react';
import { Users, FileText, Clock, CreditCard, Network, Plus, LogIn, LogOut } from 'lucide-react';
import type { Attendance, Employee, LeaveRequest, LeaveType, Payslip, PayrollRun, PayrollRunDetail } from '@repo/types';
import api from '../../../lib/axios';
import { useApi, useMutation } from '../../../lib/useApi';
import { useAuthUser } from '../../../lib/useAuth';
import { can } from '../../../lib/permissions';
import { date, dateTime, money, monthLabel, titleCase, toNumber } from '../../../lib/format';
import {
  Badge, Button, Card, DataState, EmptyState, Field, InlineError, Input, Modal, PageHeader, Pager, Select, StatCard, Table, Tabs, Td,
} from '../../../components/ui';

type Tab = 'directory' | 'leave' | 'attendance' | 'payroll' | 'org';
const TABS = [
  { id: 'directory', label: 'Directory', icon: Users },
  { id: 'leave', label: 'Leave', icon: FileText },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'payroll', label: 'Payroll', icon: CreditCard },
  { id: 'org', label: 'Org Chart', icon: Network },
] as const;

// Same rules as the API (payroll.service.ts)
const TAX_RATE = 0.2;
const INSURANCE_RATE = 0.05;
const round2 = (v: number) => Math.round(v * 100) / 100;

export default function HRPage() {
  const [tab, setTab] = useState<Tab>('directory');
  return (
    <div className="space-y-6">
      <PageHeader title="HR & Payroll" subtitle="Employees, leave, attendance and monthly payroll" />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'directory' && <DirectoryTab />}
      {tab === 'leave' && <LeaveTab />}
      {tab === 'attendance' && <AttendanceTab />}
      {tab === 'payroll' && <PayrollTab />}
      {tab === 'org' && <OrgTab />}
    </div>
  );
}

// ── Directory ─────────────────────────────────────────────────────────────────

function DirectoryTab() {
  const user = useAuthUser();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const q = new URLSearchParams({ page: String(page), limit: '20', sort: 'name', order: 'asc', ...(search && { search }) });
  const employees = useApi<Employee[]>(`/employees?${q}`);

  return (
    <Card
      title="Employee directory"
      actions={
        <div className="flex gap-2">
          <Input placeholder="Search name, email, title" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-60" />
          {can(user, 'HR') && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add employee</Button>}
        </div>
      }
    >
      <DataState state={employees} empty={{ title: 'No employees found' }}>
        {(rows) => (
          <>
            <Table head={['Name', 'Department', 'Title', 'Joined', ...(can(user, 'PAYROLL_VIEW') ? ['Annual salary'] : []), 'Status']}>
              {rows.map((e) => (
                <tr key={e.id}>
                  <Td><div className="font-semibold">{e.name}</div><div className="text-xs text-slate-400">{e.email}</div></Td>
                  <Td>{e.department?.name ?? 'Unassigned'}</Td>
                  <Td>{e.designation ?? '—'}</Td>
                  <Td>{date(e.joinDate)}</Td>
                  {can(user, 'PAYROLL_VIEW') && <Td>{money(e.grossSalary)}</Td>}
                  <Td><Badge>{e.status}</Badge></Td>
                </tr>
              ))}
            </Table>
            <Pager meta={employees.meta} onPage={setPage} />
          </>
        )}
      </DataState>
      <EmployeeModal open={open} onClose={() => setOpen(false)} onSaved={employees.reload} />
    </Card>
  );
}

function EmployeeModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const departments = useApi<Array<{ id: string; name: string }>>(open ? '/employees/departments' : null);
  const blank = { name: '', email: '', designation: '', departmentId: '', grossSalary: '', joinDate: '', status: 'ONBOARDING' };
  const [form, setForm] = useState(blank);
  const save = useMutation(async () => {
    await api.post('/employees', {
      name: form.name, email: form.email, grossSalary: form.grossSalary, joinDate: form.joinDate, status: form.status,
      ...(form.designation && { designation: form.designation }),
      ...(form.departmentId && { departmentId: form.departmentId }),
    });
    onSaved();
    onClose();
    setForm(blank);
  });
  return (
    <Modal title="Add employee" open={open} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void save.run(); }}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Title"><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
          <Field label="Department">
            <Select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">Unassigned</option>
              {departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Annual gross salary"><Input required type="number" min="1" step="0.01" value={form.grossSalary} onChange={(e) => setForm({ ...form, grossSalary: e.target.value })} /></Field>
          <Field label="Join date"><Input required type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} /></Field>
        </div>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="ONBOARDING">Onboarding</option>
            <option value="ACTIVE">Active</option>
          </Select>
        </Field>
        <InlineError message={save.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={save.pending}>{save.pending ? 'Saving…' : 'Add employee'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Leave ─────────────────────────────────────────────────────────────────────

const LEAVE_TYPES: LeaveType[] = ['ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'PATERNITY'];

function LeaveTab() {
  const user = useAuthUser();
  const [status, setStatus] = useState('');
  const leaves = useApi<LeaveRequest[]>(`/leave-requests${status ? `?status=${status}` : ''}`);
  const [form, setForm] = useState({ type: 'ANNUAL', fromDate: '', toDate: '', reason: '' });
  const submit = useMutation(async () => {
    await api.post('/leave-requests', { ...form, reason: form.reason || undefined });
    setForm({ type: 'ANNUAL', fromDate: '', toDate: '', reason: '' });
    leaves.reload();
  });
  const decide = useMutation(async (id: string, action: 'approve' | 'reject') => {
    await api.patch(`/leave-requests/${id}/${action}`, {});
    leaves.reload();
  });
  const isHr = can(user, 'HR');

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card
        title={isHr ? 'Leave requests' : 'My leave requests'}
        actions={
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-36" aria-label="Filter by status">
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        }
        className="lg:col-span-2"
      >
        <InlineError message={decide.error} />
        <DataState state={leaves} empty={{ title: 'No leave requests' }}>
          {(rows) => (
            <Table head={['Employee', 'Type', 'From', 'To', 'Reason', 'Status', '']}>
              {rows.map((l) => (
                <tr key={l.id}>
                  <Td className="font-semibold">{l.employee.name}</Td>
                  <Td>{titleCase(l.type)}</Td>
                  <Td>{date(l.fromDate)}</Td>
                  <Td>{date(l.toDate)}</Td>
                  <Td className="text-slate-500">{l.reason ?? '—'}</Td>
                  <Td><Badge>{l.status}</Badge></Td>
                  <Td>
                    {isHr && l.status === 'PENDING' && l.employeeId !== user?.employee?.id && (
                      <div className="flex gap-1">
                        <Button size="sm" disabled={decide.pending} onClick={() => void decide.run(l.id, 'approve')}>Approve</Button>
                        <Button size="sm" variant="secondary" disabled={decide.pending} onClick={() => void decide.run(l.id, 'reject')}>Reject</Button>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </DataState>
      </Card>
      <Card title="Request leave">
        {!user?.employee ? (
          <EmptyState title="Your account is not linked to an employee record" />
        ) : (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit.run(); }}>
            <Field label="Type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {LEAVE_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From"><Input required type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} /></Field>
              <Field label="To"><Input required type="date" min={form.fromDate} value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} /></Field>
            </div>
            <Field label="Reason (optional)"><Input maxLength={1000} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
            <InlineError message={submit.error} />
            <Button type="submit" disabled={submit.pending || !can(user, 'STAFF')} className="w-full">{submit.pending ? 'Submitting…' : 'Submit request'}</Button>
          </form>
        )}
      </Card>
    </div>
  );
}

// ── Attendance ────────────────────────────────────────────────────────────────

function AttendanceTab() {
  const user = useAuthUser();
  const history = useApi<Attendance[]>(user?.employee || can(user, 'HR') ? '/attendance/history?limit=50' : null);
  const clock = useMutation(async (action: 'clock-in' | 'clock-out') => {
    await api.post(`/attendance/${action}`, {});
    history.reload();
  });
  const open = history.data?.find((a) => a.employeeId === user?.employee?.id && !a.clockOut);

  return (
    <div className="space-y-6">
      {user?.employee && can(user, 'STAFF') && (
        <Card title="Time clock">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {open ? <>Clocked in since <strong>{dateTime(open.clockIn)}</strong></> : 'You are not clocked in.'}
            </p>
            {open ? (
              <Button variant="secondary" disabled={clock.pending} onClick={() => void clock.run('clock-out')}><LogOut className="h-4 w-4" /> Clock out</Button>
            ) : (
              <Button disabled={clock.pending} onClick={() => void clock.run('clock-in')}><LogIn className="h-4 w-4" /> Clock in</Button>
            )}
          </div>
          <div className="mt-2"><InlineError message={clock.error} /></div>
        </Card>
      )}
      <Card title={can(user, 'HR') ? 'Recent attendance (all employees)' : 'My attendance'}>
        {history.data === undefined && !history.loading && !history.error ? (
          <EmptyState title="Your account is not linked to an employee record" />
        ) : (
          <DataState state={history} empty={{ title: 'No attendance records yet' }}>
            {(rows) => (
              <Table head={['Employee', 'Date', 'Clock in', 'Clock out', 'Hours']}>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <Td className="font-semibold">{a.employee.name}</Td>
                    <Td>{date(a.date)}</Td>
                    <Td>{dateTime(a.clockIn)}</Td>
                    <Td>{a.clockOut ? dateTime(a.clockOut) : <Badge tone="info">Working</Badge>}</Td>
                    <Td>{a.hoursWorked != null ? a.hoursWorked.toFixed(2) : '—'}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </DataState>
        )}
      </Card>
    </div>
  );
}

// ── Payroll ───────────────────────────────────────────────────────────────────

function PayrollTab() {
  const user = useAuthUser();
  return can(user, 'PAYROLL_VIEW') ? <PayrollAdmin /> : <MyPayslips />;
}

function PayrollAdmin() {
  const user = useAuthUser();
  const now = new Date();
  const periodKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const runs = useApi<PayrollRun[]>('/payroll');
  const employees = useApi<Employee[]>('/employees?limit=100&sort=name&order=asc');
  const [selected, setSelected] = useState<string | null>(null);
  const detail = useApi<PayrollRunDetail>(selected ? `/payroll/${selected}/payslips` : null);
  const current = runs.data?.find((r) => r.periodStart.startsWith(periodKey));
  const run = useMutation(async () => {
    await api.post('/payroll/run', { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 });
    runs.reload();
  });

  const preview = useMemo(() => (employees.data ?? [])
    .filter((e) => e.status !== 'TERMINATED')
    .map((e) => {
      const gross = round2(toNumber(e.grossSalary) / 12);
      const taxes = round2(gross * TAX_RATE);
      const insurance = round2(gross * INSURANCE_RATE);
      return { id: e.id, name: e.name, title: e.designation, gross, taxes, insurance, net: round2(gross - taxes - insurance) };
    }), [employees.data]);
  const previewTotal = preview.reduce((s, p) => s + p.net, 0);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Payroll cycle · {monthLabel(periodKey)}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {current
                ? <>Confirmed · {current._count?.payslips ?? 0} payslips · net {money(current.totalNet)}</>
                : <>Not run yet · estimated net {money(previewTotal)} for {preview.length} employees</>}
            </p>
            <div className="mt-2"><InlineError message={run.error} /></div>
          </div>
          {can(user, 'HR') && (
            <Button onClick={() => void run.run()} disabled={!!current || run.pending || runs.loading}>
              {run.pending ? 'Processing…' : current ? 'Payroll confirmed' : 'Confirm payroll'}
            </Button>
          )}
        </div>
      </Card>

      {!current && (
        <Card title="Preview (monthly)">
          <DataState state={employees} empty={{ title: 'No employees' }}>
            {() => (
              <Table head={['Employee', 'Title', 'Gross', 'Tax (20%)', 'Insurance (5%)', 'Net']}>
                {preview.map((p) => (
                  <tr key={p.id}>
                    <Td className="font-semibold">{p.name}</Td>
                    <Td>{p.title ?? '—'}</Td>
                    <Td>{money(p.gross)}</Td>
                    <Td className="text-rose-500">−{money(p.taxes)}</Td>
                    <Td className="text-amber-500">−{money(p.insurance)}</Td>
                    <Td className="font-bold text-emerald-600">{money(p.net)}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </DataState>
        </Card>
      )}

      <Card title="Payroll history">
        <DataState state={runs} empty={{ title: 'No payroll runs yet' }}>
          {(rows) => (
            <Table head={['Period', 'Payslips', 'Gross', 'Taxes', 'Net', 'Status', '']}>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td className="font-semibold">{monthLabel(r.periodStart.slice(0, 7))}</Td>
                  <Td>{r._count?.payslips ?? '—'}</Td>
                  <Td>{money(r.totalGross)}</Td>
                  <Td>{money(r.totalTaxes)}</Td>
                  <Td className="font-semibold">{money(r.totalNet)}</Td>
                  <Td><Badge>{r.status}</Badge></Td>
                  <Td><Button size="sm" variant="secondary" onClick={() => setSelected(r.id)}>Payslips</Button></Td>
                </tr>
              ))}
            </Table>
          )}
        </DataState>
      </Card>

      <Modal title={detail.data ? `Payslips · ${monthLabel(detail.data.periodStart.slice(0, 7))}` : 'Payslips'} open={!!selected} onClose={() => setSelected(null)}>
        <DataState state={detail} isEmpty={(d) => d.payslips.length === 0} empty={{ title: 'No payslips in this run' }}>
          {(d) => <PayslipTable slips={d.payslips} />}
        </DataState>
      </Modal>
    </div>
  );
}

function MyPayslips() {
  const user = useAuthUser();
  const slips = useApi<Payslip[]>(user?.employee && can(user, 'STAFF') ? '/payroll/my-payslips' : null);
  if (!user?.employee) return <Card><EmptyState title="Your account is not linked to an employee record" /></Card>;
  return (
    <Card title="My payslips">
      <DataState state={slips} empty={{ title: 'No payslips yet' }}>
        {(rows) => <PayslipTable slips={rows} showPeriod />}
      </DataState>
    </Card>
  );
}

function PayslipTable({ slips, showPeriod }: { slips: Payslip[]; showPeriod?: boolean }) {
  return (
    <Table head={[showPeriod ? 'Period' : 'Employee', 'Gross', 'Taxes', 'Insurance', 'Net']}>
      {slips.map((s) => (
        <tr key={s.id}>
          <Td className="font-semibold">{showPeriod ? monthLabel(s.payrollRun!.periodStart.slice(0, 7)) : s.employee?.name}</Td>
          <Td>{money(s.gross)}</Td>
          <Td>{money(s.taxes)}</Td>
          <Td>{money(s.insurance)}</Td>
          <Td className="font-bold text-emerald-600">{money(s.net)}</Td>
        </tr>
      ))}
    </Table>
  );
}

// ── Org chart ─────────────────────────────────────────────────────────────────

function OrgTab() {
  const employees = useApi<Employee[]>('/employees?limit=100&sort=name&order=asc');
  return (
    <DataState state={employees} empty={{ title: 'No employees' }}>
      {(rows) => {
        const groups = new Map<string, Employee[]>();
        for (const e of rows) {
          const key = e.department?.name ?? 'Unassigned';
          groups.set(key, [...(groups.get(key) ?? []), e]);
        }
        return (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...groups].sort(([a], [b]) => a.localeCompare(b)).map(([dept, members]) => (
              <Card key={dept} title={`${dept} · ${members.length}`}>
                <ul className="space-y-2">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between text-sm">
                      <span><span className="font-semibold text-slate-800 dark:text-slate-100">{m.name}</span> <span className="text-slate-400">· {m.designation ?? 'Employee'}</span></span>
                      {m.status !== 'ACTIVE' && <Badge>{m.status}</Badge>}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        );
      }}
    </DataState>
  );
}
