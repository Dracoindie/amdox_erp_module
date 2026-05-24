'use client';

import { useMemo, useState, useEffect } from 'react';

import {
  Users,
  CreditCard,
  Network,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Plus,
  Filter,
  Download,
  Building2,
  TrendingUp,
  UserCheck,
  Wallet,
} from 'lucide-react';

import type { Employee } from '@repo/types';
import api from '../../../lib/axios';

// ─────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-001',
    name: 'Alice Johnson',
    department: 'Engineering',
    role: 'Frontend Lead',
    status: 'Active',
    grossSalary: 120000,
  },
  {
    id: 'EMP-002',
    name: 'Bob Smith',
    department: 'Engineering',
    role: 'Backend Developer',
    status: 'Active',
    grossSalary: 95000,
  },
  {
    id: 'EMP-003',
    name: 'Carol White',
    department: 'HR',
    role: 'HR Manager',
    status: 'Active',
    grossSalary: 85000,
  },
  {
    id: 'EMP-004',
    name: 'David Lee',
    department: 'Sales',
    role: 'Account Executive',
    status: 'Active',
    grossSalary: 75000,
  },
  {
    id: 'EMP-005',
    name: 'Eve Chen',
    department: 'Finance',
    role: 'Financial Analyst',
    status: 'Active',
    grossSalary: 90000,
  },
];

const MOCK_LEAVE_REQUESTS = [
  {
    id: 'LR-001',
    employee: 'Bob Smith',
    type: 'Annual Leave',
    dates: '2026-06-01 → 2026-06-05',
    days: 5,
    status: 'Pending',
  },
  {
    id: 'LR-002',
    employee: 'Alice Johnson',
    type: 'Sick Leave',
    dates: '2026-05-15',
    days: 1,
    status: 'Approved',
  },
  {
    id: 'LR-003',
    employee: 'David Lee',
    type: 'Personal',
    dates: '2026-05-20',
    days: 1,
    status: 'Rejected',
  },
];

const MOCK_ATTENDANCE = [
  {
    date: '2026-05-13',
    status: 'Present',
    clockIn: '08:55 AM',
    clockOut: '05:05 PM',
    hours: 8.2,
  },
  {
    date: '2026-05-12',
    status: 'Present',
    clockIn: '09:02 AM',
    clockOut: '05:00 PM',
    hours: 7.9,
  },
  {
    date: '2026-05-11',
    status: 'Present',
    clockIn: '08:50 AM',
    clockOut: '05:15 PM',
    hours: 8.4,
  },
];

type Tab =
  | 'directory'
  | 'leave'
  | 'attendance'
  | 'payroll'
  | 'org';

export default function HRPage() {
  const [activeTab, setActiveTab] =
    useState<Tab>('directory');

  const [employees, setEmployees] =
    useState<Employee[]>(MOCK_EMPLOYEES);

  useEffect(() => {
    api.get('/employees').then((res) => {
      if (res.data?.success && Array.isArray(res.data.data)) {
        const fetchedEmployees: Employee[] = res.data.data.map((emp: any) => ({
          id: emp.id,
          name: emp.name,
          department: emp.department?.name || 'Unassigned',
          role: emp.designation || 'Employee',
          status: emp.status === 'TERMINATED' ? 'Terminated' : (emp.status === 'ACTIVE' ? 'Active' : emp.status),
          grossSalary: emp.grossSalary || 0,
        }));
        setEmployees(fetchedEmployees);
      }
    }).catch(err => console.error('Failed to fetch employees', err));
  }, []);

  const [searchQuery, setSearchQuery] =
    useState('');

  const [payrollStatus, setPayrollStatus] =
    useState<'Draft' | 'Confirmed'>(
      'Draft'
    );

  const [isProcessing, setIsProcessing] =
    useState(false);

  const TAX_RATE = 0.2;
  const INSURANCE_RATE = 0.05;

  const totalPayroll = useMemo(() => {
    return employees.reduce(
      (sum, emp) =>
        sum + emp.grossSalary,
      0
    );
  }, [employees]);

  const filteredEmployees =
    employees.filter(
      (e) =>
        e.name
          .toLowerCase()
          .includes(
            searchQuery.toLowerCase()
          ) ||
        e.department
          .toLowerCase()
          .includes(
            searchQuery.toLowerCase()
          )
    );

  const handleConfirmPayroll =
    async () => {
      setIsProcessing(true);

      await new Promise((r) =>
        setTimeout(r, 1500)
      );

      setPayrollStatus('Confirmed');

      setIsProcessing(false);
    };

  const tabs = [
    {
      id: 'directory',
      label: 'Directory',
      icon: Users,
    },
    {
      id: 'leave',
      label: 'Leave',
      icon: FileText,
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: Clock,
    },
    {
      id: 'payroll',
      label: 'Payroll',
      icon: CreditCard,
    },
    {
      id: 'org',
      label: 'Org Chart',
      icon: Network,
    },
  ] as const;

  return (
    <div className="min-h-screen space-y-8 bg-slate-50 p-4 dark:bg-[#020617] md:p-8">

      {/* HEADER */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            HR & Payroll Engine
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Human capital management,
            payroll processing, attendance,
            and organization insights
          </p>
        </div>

        <div className="flex items-center gap-3">

          <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <Filter className="h-4 w-4" />
            Filters
          </button>

          <button className="flex items-center gap-2 rounded-2xl bg-[#ff5a00] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600">
            <Plus className="h-4 w-4" />
            Add Employee
          </button>

        </div>
      </div>

      {/* STATS */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Employees
            </p>

            <Users className="h-5 w-5 text-blue-500" />
          </div>

          <h3 className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
            {employees.length}
          </h3>

          <p className="mt-2 text-sm text-emerald-500">
            +12% growth
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Attendance
            </p>

            <UserCheck className="h-5 w-5 text-emerald-500" />
          </div>

          <h3 className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
            96%
          </h3>

          <p className="mt-2 text-sm text-emerald-500">
            Excellent
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Monthly Payroll
            </p>

            <Wallet className="h-5 w-5 text-orange-500" />
          </div>

          <h3 className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
            $
            {(
              totalPayroll / 1000
            ).toFixed(0)}
            k
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Current cycle
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Retention Rate
            </p>

            <TrendingUp className="h-5 w-5 text-violet-500" />
          </div>

          <h3 className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
            92%
          </h3>

          <p className="mt-2 text-sm text-emerald-500">
            Above industry
          </p>
        </div>

      </div>

      {/* TABS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="flex gap-2 overflow-x-auto">

          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(tab.id)
              }
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#ff5a00] text-white shadow-lg shadow-orange-500/20'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}

        </div>
      </div>

      {/* DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-6">

          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">

            <div className="relative w-full max-w-lg">

              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(
                    e.target.value
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#ff5a00] focus:ring-4 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <button className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Download className="h-4 w-4" />
              Export CSV
            </button>

          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    {[
                      'Employee',
                      'ID',
                      'Department',
                      'Role',
                      'Status',
                      'Actions',
                    ].map((head) => (
                      <th
                        key={head}
                        className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>

                  {filteredEmployees.map(
                    (emp) => (
                      <tr
                        key={emp.id}
                        className="border-t border-slate-100 transition hover:bg-orange-50/30 dark:border-slate-800 dark:hover:bg-slate-800/60"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">

                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 font-bold text-orange-600">
                              {emp.name
                                .split(' ')
                                .map(
                                  (n) =>
                                    n[0]
                                )
                                .join('')}
                            </div>

                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {emp.name}
                              </p>

                              <p className="text-xs text-slate-400">
                                {emp.department}
                              </p>
                            </div>

                          </div>
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">
                          {emp.id}
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">
                          {emp.department}
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">
                          {emp.role}
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                            {emp.status}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <button className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold transition hover:border-[#ff5a00] hover:text-[#ff5a00] dark:border-slate-700 dark:text-slate-300">
                            Manage
                          </button>
                        </td>
                      </tr>
                    )
                  )}

                </tbody>
              </table>

            </div>
          </div>
        </div>
      )}

      {/* LEAVE */}
      {activeTab === 'leave' && (
        <div className="grid gap-6 lg:grid-cols-3">

          {MOCK_LEAVE_REQUESTS.map(
            (req) => (
              <div
                key={req.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between">

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {req.employee}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {req.type}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      req.status ===
                      'Approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : req.status ===
                          'Pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {req.status}
                  </span>

                </div>

                <div className="mt-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <p>
                    <span className="font-semibold">
                      Dates:
                    </span>{' '}
                    {req.dates}
                  </p>

                  <p>
                    <span className="font-semibold">
                      Days:
                    </span>{' '}
                    {req.days}
                  </p>
                </div>

                {req.status ===
                  'Pending' && (
                  <div className="mt-6 flex gap-3">

                    <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600">
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>

                    <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-600">
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>

                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* ATTENDANCE */}
      {activeTab ===
        'attendance' && (
        <div className="space-y-6">

          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Attendance Tracker
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Current Status:
                <span className="ml-2 font-semibold text-rose-500">
                  Not Clocked In
                </span>
              </p>
            </div>

            <button className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600">
              <Clock className="h-5 w-5" />
              Clock In Now
            </button>

          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <table className="w-full">

              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  {[
                    'Date',
                    'Status',
                    'Clock In',
                    'Clock Out',
                    'Hours',
                  ].map((head) => (
                    <th
                      key={head}
                      className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>

                {MOCK_ATTENDANCE.map(
                  (rec, i) => (
                    <tr
                      key={i}
                      className="border-t border-slate-100 transition hover:bg-orange-50/30 dark:border-slate-800 dark:hover:bg-slate-800/60"
                    >
                      <td className="px-6 py-5 font-medium text-slate-900 dark:text-white">
                        {rec.date}
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                          {rec.status}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        {rec.clockIn}
                      </td>

                      <td className="px-6 py-5">
                        {rec.clockOut}
                      </td>

                      <td className="px-6 py-5 font-bold text-slate-900 dark:text-white">
                        {rec.hours}h
                      </td>
                    </tr>
                  )
                )}

              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAYROLL */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">

          <div className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Payroll Cycle · May 2026
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Status:
                <span
                  className={`ml-2 font-bold ${
                    payrollStatus ===
                    'Confirmed'
                      ? 'text-emerald-500'
                      : 'text-amber-500'
                  }`}
                >
                  {payrollStatus}
                </span>
              </p>
            </div>

            <button
              onClick={
                handleConfirmPayroll
              }
              disabled={
                payrollStatus ===
                  'Confirmed' ||
                isProcessing
              }
              className={`rounded-2xl px-6 py-4 text-sm font-bold text-white transition ${
                payrollStatus ===
                'Confirmed'
                  ? 'cursor-not-allowed bg-slate-400'
                  : 'bg-[#ff5a00] hover:bg-orange-600'
              }`}
            >
              {isProcessing
                ? 'Processing...'
                : payrollStatus ===
                  'Confirmed'
                ? 'Payroll Confirmed'
                : 'Confirm Payroll'}
            </button>

          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <table className="w-full">

              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  {[
                    'Employee',
                    'Role',
                    'Gross',
                    'Tax',
                    'Insurance',
                    'Net Pay',
                  ].map((head) => (
                    <th
                      key={head}
                      className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>

                {employees.map((emp) => {
                  const taxes =
                    emp.grossSalary *
                    TAX_RATE;

                  const insurance =
                    emp.grossSalary *
                    INSURANCE_RATE;

                  const net =
                    emp.grossSalary -
                    taxes -
                    insurance;

                  return (
                    <tr
                      key={emp.id}
                      className="border-t border-slate-100 transition hover:bg-orange-50/30 dark:border-slate-800 dark:hover:bg-slate-800/60"
                    >
                      <td className="px-6 py-5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {emp.name}
                        </div>

                        <div className="text-xs text-slate-400">
                          {emp.id}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        {emp.role}
                      </td>

                      <td className="px-6 py-5 font-medium">
                        $
                        {emp.grossSalary.toLocaleString()}
                      </td>

                      <td className="px-6 py-5 text-rose-500">
                        -$
                        {taxes.toLocaleString()}
                      </td>

                      <td className="px-6 py-5 text-amber-500">
                        -$
                        {insurance.toLocaleString()}
                      </td>

                      <td className="px-6 py-5 font-bold text-emerald-500">
                        $
                        {net.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}

              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ORG */}
      {activeTab === 'org' && (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-12 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex min-w-[900px] flex-col items-center">

            <div className="flex h-28 w-72 flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xl">
              <Building2 className="mb-2 h-7 w-7" />

              <h3 className="text-lg font-black">
                CEO
              </h3>

              <p className="text-sm text-slate-300">
                Executive Board
              </p>
            </div>

            <div className="h-10 w-px bg-slate-300 dark:bg-slate-700" />

            <div className="grid grid-cols-3 gap-10">

              {[
                {
                  title:
                    'VP Engineering',
                  dept:
                    'Technology',
                  roles: [
                    'Frontend Lead',
                    'Backend Lead',
                  ],
                },
                {
                  title: 'VP HR',
                  dept:
                    'People Operations',
                  roles: [
                    'HR Manager',
                    'Recruiter',
                  ],
                },
                {
                  title:
                    'VP Finance',
                  dept:
                    'Accounting',
                  roles: [
                    'Controller',
                    'Analyst',
                  ],
                },
              ].map((node) => (
                <div
                  key={node.title}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:border-[#ff5a00] hover:shadow-lg dark:border-slate-800 dark:bg-slate-800"
                >
                  <h4 className="text-center text-lg font-bold text-slate-900 dark:text-white">
                    {node.title}
                  </h4>

                  <p className="mt-1 text-center text-sm text-slate-500">
                    {node.dept}
                  </p>

                  <div className="mt-6 space-y-3">
                    {node.roles.map(
                      (role) => (
                        <div
                          key={role}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        >
                          {role}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}