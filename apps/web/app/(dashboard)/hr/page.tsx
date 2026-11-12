'use client';

import { useMemo, useState } from 'react';
import { Clock, CreditCard, FileText, IdCard, LogIn, LogOut, Network, UserPlus, Users } from 'lucide-react';
import type { Attendance, Employee, LeaveRequest, LeaveType, Payslip, PayrollRun, PayrollRunDetail } from '@repo/types';
import api from '../../../lib/axios';
import { useApi, useMutation } from '../../../lib/useApi';
import { useAuthUser } from '../../../lib/useAuth';
import { useDebounced } from '../../../lib/useDebounced';
import { can, canRead, hasSelfService } from '../../../lib/permissions';
import { CURRENCY_SYMBOL, date, dec, initials, money, monthLabel, time, titleCase, todayISO, toNumber } from '../../../lib/format';
import {
  Alert, Badge, Button, Card, DataState, DataTable, DescriptionList, Field, Form, FormActions, Input, Modal, PageHeader,
  Pagination, SearchInput, Select, Skeleton, TabPanel, Tabs, Textarea, cx, useConfirm, useTabParam,
  type Column, type SortState,
} from '../../../components/ui';

// Same rules as the API (payroll.service.ts)
const TAX_RATE = 0.2;
const INSURANCE_RATE = 0.05;
const round2 = (v: number) => Math.round(v * 100) / 100;

export default function HRPage() {
  const user = useAuthUser();
  const directory = canRead(user, 'PEOPLE');
  const self = hasSelfService(user);
  const records = canRead(user, 'PEOPLE_RECORDS');
  const payroll = canRead(user, 'PAYROLL');
  // Tabs follow read access (lib/permissions.ts); self-service needs a linked employee record
  const tabs = [
    { id: 'directory', label: 'Directory', icon: Users, hidden: !directory },
    { id: 'profile', label: 'My profile', icon: IdCard, hidden: directory || !user?.employee },
    { id: 'leave', label: records ? 'Leave' : 'My leave', icon: FileText, hidden: !records && !self },
    { id: 'attendance', label: records ? 'Attendance' : 'My attendance', icon: Clock, hidden: !records && !self },
    { id: 'payroll', label: payroll ? 'Payroll' : 'My payslips', icon: CreditCard, hidden: !payroll && !self },
    { id: 'org', label: 'Org chart', icon: Network, hidden: !directory },
  ] as const;
  const [tab, setTab] = useTabParam(tabs);
  return (
    <div className="space-y-6">
      <PageHeader title="HR & Payroll" description="Employees, leave, attendance and monthly payroll." />
      <Tabs tabs={tabs} active={tab} onChange={setTab} label="HR sections" />
      <TabPanel id={tab}>
        {tab === 'directory' && <DirectoryTab />}
        {tab === 'profile' && <ProfileTab />}
        {tab === 'leave' && <LeaveTab />}
        {tab === 'attendance' && <AttendanceTab />}
        {tab === 'payroll' && (payroll ? <PayrollAdmin /> : <MyPayslips />)}
        {tab === 'org' && <OrgTab />}
      </TabPanel>
    </div>
  );
}

function Person({ name, sub }: { name: string; sub?: string | null }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-fg-muted" aria-hidden>{initials(name)}</span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-fg">{name}</span>
        {sub && <span className="block truncate text-xs text-fg-subtle">{sub}</span>}
      </span>
    </span>
  );
}

// ── Directory ─────────────────────────────────────────────────────────────────

function DirectoryTab() {
  const user = useAuthUser();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'name', order: 'asc' });
  const [open, setOpen] = useState(false);
  const q = useDebounced(search);
  const params = new URLSearchParams({ page: String(page), limit: '20', sort: sort.key, order: sort.order, ...(q && { search: q }) });
  const employees = useApi<Employee[]>(`/employees?${params}`);
  const showSalary = canRead(user, 'PAYROLL');
  const isHr = can(user, 'HR');

  const columns: Column<Employee>[] = [
    { key: 'name', header: 'Name', primary: true, sortKey: 'name', cell: (e) => <Person name={e.name} sub={e.email} /> },
    { key: 'department', header: 'Department', cell: (e) => e.department?.name ?? <span className="text-fg-subtle">Unassigned</span> },
    { key: 'title', header: 'Title', cell: (e) => e.designation ?? '—' },
    { key: 'joined', header: 'Joined', sortKey: 'joinDate', cell: (e) => date(e.joinDate), className: 'whitespace-nowrap' },
    ...(showSalary ? [{ key: 'salary', header: 'Annual salary', numeric: true, sortKey: 'grossSalary', cell: (e: Employee) => money(e.grossSalary) }] : []),
    { key: 'status', header: 'Status', cell: (e) => <Badge>{e.status}</Badge> },
  ];

  return (
    <Card
      title="Employee directory"
      flush
      actions={
        <>
          <SearchInput label="Search name, email or title" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          {isHr && <Button icon={UserPlus} onClick={() => setOpen(true)}>Add employee</Button>}
        </>
      }
    >
      <DataState
        state={employees}
        empty={{
          icon: Users,
          title: q ? 'No employees match your search' : 'No employees yet',
          action: !q && isHr ? <Button icon={UserPlus} onClick={() => setOpen(true)}>Add employee</Button> : undefined,
        }}
      >
        {(rows) => (
          <DataTable
            caption="Employees"
            columns={columns}
            rows={rows}
            rowKey={(e) => e.id}
            sort={sort}
            onSortChange={(s) => { setSort(s); setPage(1); }}
            footer={<Pagination meta={employees.meta} onPage={setPage} noun="employees" />}
          />
        )}
      </DataState>
      <Modal title="Add employee" open={open} onClose={() => setOpen(false)}>
        <EmployeeForm onDone={() => { setOpen(false); employees.reload(); }} onCancel={() => setOpen(false)} />
      </Modal>
    </Card>
  );
}

function EmployeeForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const departments = useApi<Array<{ id: string; name: string }>>('/employees/departments');
  const [form, setForm] = useState({ name: '', email: '', designation: '', departmentId: '', grossSalary: '', joinDate: todayISO(), status: 'ONBOARDING' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const save = useMutation(async () => {
    await api.post('/employees', {
      name: form.name, email: form.email, grossSalary: form.grossSalary, joinDate: form.joinDate, status: form.status,
      ...(form.designation && { designation: form.designation }),
      ...(form.departmentId && { departmentId: form.departmentId }),
    });
    onDone();
  }, { success: `${form.name || 'Employee'} added` });
  return (
    <Form onSubmit={save.run} errors={save.fieldErrors} error={save.error}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" name="name" required><Input autoComplete="off" value={form.name} onChange={set('name')} /></Field>
        <Field label="Work email" name="email" required><Input type="email" autoComplete="off" value={form.email} onChange={set('email')} /></Field>
        <Field label="Job title" name="designation" optional><Input value={form.designation} onChange={set('designation')} /></Field>
        <Field label="Department" name="departmentId" optional>
          <Select value={form.departmentId} onChange={set('departmentId')}>
            <option value="">Unassigned</option>
            {departments.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Annual gross salary" name="grossSalary" required>
          <Input type="number" inputMode="decimal" min="1" step="0.01" prefix={CURRENCY_SYMBOL} value={form.grossSalary} onChange={set('grossSalary')} />
        </Field>
        <Field label="Start date" name="joinDate" required><Input type="date" value={form.joinDate} onChange={set('joinDate')} /></Field>
        <Field label="Status" name="status">
          <Select value={form.status} onChange={set('status')}>
            <option value="ONBOARDING">Onboarding</option>
            <option value="ACTIVE">Active</option>
          </Select>
        </Field>
      </div>
      <FormActions>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={save.pending}>Add employee</Button>
      </FormActions>
    </Form>
  );
}

// ── My profile (employees without directory access) ───────────────────────────

function ProfileTab() {
  const user = useAuthUser();
  const profile = useApi<Employee>(user?.employee ? `/employees/${user.employee.id}` : null);
  return (
    <Card title="My profile" description="Ask HR if any of these details are wrong.">
      <DataState state={profile} isEmpty={() => false} skeleton={<div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-6" />)}</div>}>
        {(e) => (
          <DescriptionList
            items={[
              { label: 'Name', value: e.name },
              { label: 'Work email', value: e.email },
              { label: 'Job title', value: e.designation ?? '—' },
              { label: 'Department', value: e.department?.name ?? 'Unassigned' },
              { label: 'Start date', value: date(e.joinDate) },
              { label: 'Status', value: <Badge>{e.status}</Badge> },
              ...(e.grossSalary ? [{ label: 'Annual salary (CTC)', value: <span className="tabular-nums">{money(e.grossSalary)}</span> }] : []),
            ]}
          />
        )}
      </DataState>
    </Card>
  );
}

// ── Leave ─────────────────────────────────────────────────────────────────────

const LEAVE_TYPES: LeaveType[] = ['ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'PATERNITY'];

function days(from: string, to: string) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1;
}

function LeaveTab() {
  const user = useAuthUser();
  const [status, setStatus] = useState('');
  const leaves = useApi<LeaveRequest[]>(`/leave-requests${status ? `?status=${status}` : ''}`);
  const isHr = can(user, 'HR');
  const allRecords = canRead(user, 'PEOPLE_RECORDS');
  const decide = useMutation(async (l: LeaveRequest, action: 'approve' | 'reject') => {
    await api.patch(`/leave-requests/${l.id}/${action}`, {});
    leaves.reload();
    return `Leave for ${l.employee.name} ${action === 'approve' ? 'approved' : 'rejected'}`;
  }, { success: (m) => m, errorToast: true });

  const columns: Column<LeaveRequest>[] = [
    { key: 'employee', header: 'Employee', primary: true, cell: (l) => <Person name={l.employee.name} sub={titleCase(l.type)} /> },
    {
      key: 'dates', header: 'Dates',
      cell: (l) => {
        const d = days(l.fromDate, l.toDate);
        return (
          <>
            <span className="block whitespace-nowrap">{date(l.fromDate)} – {date(l.toDate)}</span>
            <span className="block text-xs text-fg-subtle">{d > 0 ? `${d} day${d === 1 ? '' : 's'}` : 'End date is before start date'}</span>
          </>
        );
      },
    },
    // Reason only on wide screens so the approve/reject actions fit on tablets
    { key: 'reason', header: 'Reason', hideBelow: 'xl', cell: (l) => <span className="text-fg-muted">{l.reason ?? '—'}</span> },
    { key: 'status', header: 'Status', cell: (l) => <Badge>{l.status}</Badge> },
    ...(isHr ? [{
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right' as const, mobileLabel: '',
      cell: (l: LeaveRequest) => l.status === 'PENDING' && l.employeeId !== user?.employee?.id ? (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" disabled={decide.pending} onClick={() => void decide.run(l, 'reject')}>Reject</Button>
          <Button size="sm" disabled={decide.pending} onClick={() => void decide.run(l, 'approve')}>Approve</Button>
        </div>
      ) : null,
    }] : []),
  ];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card
        title={allRecords ? 'Leave requests' : 'My leave requests'}
        flush
        className={hasSelfService(user) ? 'xl:col-span-2' : 'xl:col-span-3'}
        actions={
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-40" aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        }
      >
        <DataState state={leaves} empty={{ icon: FileText, title: status ? `No ${status.toLowerCase()} requests` : 'No leave requests yet' }}>
          {(rows) => <DataTable caption="Leave requests" columns={columns} rows={rows} rowKey={(l) => l.id} />}
        </DataState>
      </Card>
      {hasSelfService(user) && <LeaveForm onSaved={leaves.reload} />}
    </div>
  );
}

function LeaveForm({ onSaved }: { onSaved: () => void }) {
  const blank = { type: 'ANNUAL', fromDate: '', toDate: '', reason: '' };
  const [form, setForm] = useState(blank);
  const submit = useMutation(async () => {
    await api.post('/leave-requests', { ...form, reason: form.reason || undefined });
    setForm(blank);
    onSaved();
  }, { success: 'Leave request sent to HR' });
  const count = form.fromDate && form.toDate && form.toDate >= form.fromDate ? days(form.fromDate, form.toDate) : null;
  return (
    <Card title="Request leave" className="self-start">
      <Form onSubmit={submit.run} errors={submit.fieldErrors} error={submit.error}>
        <Field label="Type" name="type">
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {LEAVE_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From" name="fromDate" required><Input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} /></Field>
          <Field label="To" name="toDate" required><Input type="date" min={form.fromDate || undefined} value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} /></Field>
        </div>
        {count !== null && <p className="text-sm text-fg-muted">{count} calendar day{count === 1 ? '' : 's'}</p>}
        <Field label="Reason" name="reason" optional>
          <Textarea maxLength={1000} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </Field>
        <Button type="submit" loading={submit.pending} className="w-full">Submit request</Button>
      </Form>
    </Card>
  );
}

// ── Attendance ────────────────────────────────────────────────────────────────

function AttendanceTab() {
  const user = useAuthUser();
  const allRecords = canRead(user, 'PEOPLE_RECORDS');
  const history = useApi<Attendance[]>(user?.employee || allRecords ? '/attendance/history?limit=50' : null);
  const clock = useMutation(async (action: 'clock-in' | 'clock-out') => {
    await api.post(`/attendance/${action}`, {});
    history.reload();
    return action === 'clock-in' ? 'Clocked in' : 'Clocked out';
  }, { success: (m) => m, errorToast: true });
  const open = history.data?.find((a) => a.employeeId === user?.employee?.id && !a.clockOut);

  const columns: Column<Attendance>[] = [
    { key: 'employee', header: 'Employee', primary: true, cell: (a) => <Person name={a.employee.name} /> },
    { key: 'date', header: 'Date', cell: (a) => date(a.date), className: 'whitespace-nowrap' },
    { key: 'in', header: 'Clock in', cell: (a) => time(a.clockIn) },
    { key: 'out', header: 'Clock out', cell: (a) => (a.clockOut ? time(a.clockOut) : <Badge tone="info">Working</Badge>) },
    { key: 'hours', header: 'Hours', numeric: true, cell: (a) => dec(a.hoursWorked) },
  ];

  return (
    <div className="space-y-6">
      {hasSelfService(user) && (
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className={cx('flex h-10 w-10 items-center justify-center rounded-full', open ? 'bg-success-soft text-success' : 'bg-surface-2 text-fg-subtle')}>
                <Clock className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium text-fg">{open ? 'You are clocked in' : 'You are not clocked in'}</p>
                <p className="text-sm text-fg-muted">{open ? `Since ${time(open.clockIn)} · ${date(open.clockIn)}` : 'Clock in when you start work.'}</p>
              </div>
            </div>
            {history.loading && !history.data ? <Skeleton className="h-9 w-28" /> : open ? (
              <Button variant="secondary" icon={LogOut} loading={clock.pending} onClick={() => void clock.run('clock-out')}>Clock out</Button>
            ) : (
              <Button icon={LogIn} loading={clock.pending} onClick={() => void clock.run('clock-in')}>Clock in</Button>
            )}
          </div>
        </Card>
      )}
      <Card title={allRecords ? 'Recent attendance · all employees' : 'My attendance'} flush>
        <DataState state={history} empty={{ icon: Clock, title: 'No attendance records yet' }}>
          {(rows) => <DataTable caption="Attendance" columns={columns} rows={rows} rowKey={(a) => a.id} />}
        </DataState>
      </Card>
    </div>
  );
}

// ── Payroll ───────────────────────────────────────────────────────────────────

function PayrollAdmin() {
  const user = useAuthUser();
  const confirm = useConfirm();
  const now = new Date();
  const periodKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const runs = useApi<PayrollRun[]>('/payroll');
  const employees = useApi<Employee[]>('/employees?limit=100&sort=name&order=asc');
  const [selected, setSelected] = useState<PayrollRun | null>(null);
  const current = runs.data?.find((r) => r.periodStart.startsWith(periodKey));
  const run = useMutation(async () => {
    await api.post('/payroll/run', { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 });
    runs.reload();
  }, { success: `Payroll for ${monthLabel(periodKey)} confirmed`, errorToast: true });

  const preview = useMemo(() => (employees.data ?? [])
    .filter((e) => e.status !== 'TERMINATED')
    .map((e) => {
      const gross = round2(toNumber(e.grossSalary) / 12);
      const taxes = round2(gross * TAX_RATE);
      const insurance = round2(gross * INSURANCE_RATE);
      return { id: e.id, name: e.name, title: e.designation, gross, taxes, insurance, net: round2(gross - taxes - insurance) };
    }), [employees.data]);
  const previewTotal = preview.reduce((s, p) => s + p.net, 0);

  const startRun = async () => {
    const ok = await confirm({
      title: `Run payroll for ${monthLabel(periodKey)}?`,
      message: (
        <>
          This creates payslips for <strong className="text-fg">{preview.length} employees</strong> with a total net pay of{' '}
          <strong className="text-fg">{money(previewTotal)}</strong> and notifies each employee. A period can only be run once.
        </>
      ),
      confirmLabel: 'Run payroll',
    });
    if (ok) await run.run();
  };

  type Row = (typeof preview)[number];
  const previewColumns: Column<Row>[] = [
    { key: 'name', header: 'Employee', primary: true, cell: (p) => <Person name={p.name} sub={p.title} /> },
    { key: 'gross', header: 'Gross', numeric: true, cell: (p) => money(p.gross) },
    { key: 'tax', header: 'Tax (20%)', numeric: true, cell: (p) => <span className="text-fg-muted">−{money(p.taxes)}</span> },
    { key: 'ins', header: 'Insurance (5%)', numeric: true, cell: (p) => <span className="text-fg-muted">−{money(p.insurance)}</span> },
    { key: 'net', header: 'Net', numeric: true, cell: (p) => <span className="font-semibold">{money(p.net)}</span> },
  ];
  const runColumns: Column<PayrollRun>[] = [
    { key: 'period', header: 'Period', primary: true, cell: (r) => <span className="font-medium">{monthLabel(r.periodStart.slice(0, 7))}</span> },
    { key: 'slips', header: 'Payslips', numeric: true, cell: (r) => r._count?.payslips ?? '—' },
    { key: 'gross', header: 'Gross', numeric: true, cell: (r) => money(r.totalGross) },
    { key: 'taxes', header: 'Taxes', numeric: true, cell: (r) => money(r.totalTaxes) },
    { key: 'net', header: 'Net', numeric: true, cell: (r) => <span className="font-medium">{money(r.totalNet)}</span> },
    { key: 'status', header: 'Status', cell: (r) => <Badge>{r.status}</Badge> },
    { key: 'view', header: <span className="sr-only">Payslips</span>, align: 'right', mobileLabel: '', cell: (r) => <Button size="sm" variant="secondary" onClick={() => setSelected(r)}>View payslips</Button> },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-fg-muted">Payroll cycle</p>
            <h2 className="text-lg font-semibold text-fg">{monthLabel(periodKey)}</h2>
            <p className="mt-1 text-sm text-fg-muted">
              {runs.loading && !runs.data ? 'Checking…' : current
                ? <>Confirmed · {current._count?.payslips ?? 0} payslips · net <span className="font-medium text-fg tabular-nums">{money(current.totalNet)}</span></>
                : <>Not run yet · estimated net <span className="font-medium text-fg tabular-nums">{money(previewTotal)}</span> for {preview.length} employees</>}
            </p>
          </div>
          {can(user, 'HR') && (
            current ? <Badge tone="good">Payroll confirmed</Badge> : (
              <Button onClick={() => void startRun()} loading={run.pending} disabled={runs.loading || employees.loading || preview.length === 0}>
                Run payroll…
              </Button>
            )
          )}
        </div>
        {!can(user, 'HR') && !current && <Alert tone="info" className="mt-4">Only HR can run payroll. Finance can review the preview and history.</Alert>}
      </Card>

      {!current && (
        <Card title="Preview" description="Monthly amounts from annual salaries, before the run is confirmed." flush>
          <DataState state={employees} empty={{ title: 'No employees to pay' }}>
            {() => (
              <DataTable
                caption="Payroll preview"
                columns={previewColumns}
                rows={preview}
                rowKey={(p) => p.id}
                footer={
                  <div className="flex justify-between border-t border-line px-4 py-3 text-sm sm:px-5">
                    <span className="font-medium text-fg">Total net pay</span>
                    <span className="font-semibold tabular-nums text-fg">{money(previewTotal)}</span>
                  </div>
                }
              />
            )}
          </DataState>
        </Card>
      )}

      <Card title="Payroll history" flush>
        <DataState state={runs} empty={{ icon: CreditCard, title: 'No payroll runs yet' }}>
          {(rows) => <DataTable caption="Payroll runs" columns={runColumns} rows={rows} rowKey={(r) => r.id} />}
        </DataState>
      </Card>

      <Modal title={selected ? `Payslips · ${monthLabel(selected.periodStart.slice(0, 7))}` : 'Payslips'} open={!!selected} onClose={() => setSelected(null)} size="lg">
        {selected && <RunPayslips id={selected.id} />}
      </Modal>
    </div>
  );
}

function RunPayslips({ id }: { id: string }) {
  const detail = useApi<PayrollRunDetail>(`/payroll/${id}/payslips`);
  return (
    <DataState state={detail} isEmpty={(d) => d.payslips.length === 0} empty={{ title: 'No payslips in this run' }}>
      {(d) => <div className="-mx-5"><PayslipTable slips={d.payslips} /></div>}
    </DataState>
  );
}

function MyPayslips() {
  const slips = useApi<Payslip[]>('/payroll/my-payslips');
  return (
    <Card title="My payslips" flush>
      <DataState state={slips} empty={{ icon: CreditCard, title: 'No payslips yet', description: 'Payslips appear here after each monthly payroll run.' }}>
        {(rows) => <PayslipTable slips={rows} showPeriod />}
      </DataState>
    </Card>
  );
}

function PayslipTable({ slips, showPeriod }: { slips: Payslip[]; showPeriod?: boolean }) {
  const columns: Column<Payslip>[] = [
    {
      key: 'who', header: showPeriod ? 'Period' : 'Employee', primary: true,
      cell: (s) => <span className="font-medium">{showPeriod ? monthLabel(s.payrollRun!.periodStart.slice(0, 7)) : s.employee?.name}</span>,
    },
    { key: 'gross', header: 'Gross', numeric: true, cell: (s) => money(s.gross) },
    { key: 'taxes', header: 'Taxes', numeric: true, cell: (s) => money(s.taxes) },
    { key: 'insurance', header: 'Insurance', numeric: true, cell: (s) => money(s.insurance) },
    { key: 'net', header: 'Net pay', numeric: true, cell: (s) => <span className="font-semibold">{money(s.net)}</span> },
  ];
  return <DataTable caption="Payslips" columns={columns} rows={slips} rowKey={(s) => s.id} />;
}

// ── Org chart ─────────────────────────────────────────────────────────────────

function OrgTab() {
  const employees = useApi<Employee[]>('/employees?limit=100&sort=name&order=asc');
  return (
    <DataState
      state={employees}
      empty={{ icon: Network, title: 'No employees yet' }}
      skeleton={<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>}
    >
      {(rows) => {
        const groups = new Map<string, Employee[]>();
        for (const e of rows) {
          const key = e.department?.name ?? 'Unassigned';
          groups.set(key, [...(groups.get(key) ?? []), e]);
        }
        return (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...groups].sort(([a], [b]) => a.localeCompare(b)).map(([dept, members]) => (
              <Card key={dept} title={dept} description={`${members.length} ${members.length === 1 ? 'person' : 'people'}`} flush>
                <ul className="divide-y divide-line">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm sm:px-5">
                      <Person name={m.name} sub={m.designation ?? 'Employee'} />
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

