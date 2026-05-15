'use client';

import { useState } from 'react';
import { Users, CreditCard, Network, FileText, Clock, CheckCircle, XCircle, Search, Plus, Filter, Download } from 'lucide-react';
import type { Employee } from '@repo/types';

// Mock Data
const MOCK_EMPLOYEES: Employee[] = [
  { id: 'EMP-001', name: 'Alice Johnson', department: 'Engineering', role: 'Frontend Lead', status: 'Active', grossSalary: 120000 },
  { id: 'EMP-002', name: 'Bob Smith', department: 'Engineering', role: 'Backend Developer', status: 'Active', grossSalary: 95000 },
  { id: 'EMP-003', name: 'Carol White', department: 'HR', role: 'HR Manager', status: 'Active', grossSalary: 85000 },
  { id: 'EMP-004', name: 'David Lee', department: 'Sales', role: 'Account Executive', status: 'Active', grossSalary: 75000 },
  { id: 'EMP-005', name: 'Eve Chen', department: 'Finance', role: 'Financial Analyst', status: 'Active', grossSalary: 90000 },
];

const MOCK_LEAVE_REQUESTS = [
  { id: 'LR-001', employee: 'Bob Smith', type: 'Annual Leave', dates: '2026-06-01 to 2026-06-05', days: 5, status: 'Pending' },
  { id: 'LR-002', employee: 'Alice Johnson', type: 'Sick Leave', dates: '2026-05-15', days: 1, status: 'Approved' },
  { id: 'LR-003', employee: 'David Lee', type: 'Personal', dates: '2026-05-20', days: 1, status: 'Rejected' },
];

const MOCK_ATTENDANCE = [
  { date: '2026-05-13', status: 'Present', clockIn: '08:55 AM', clockOut: '05:05 PM', hours: 8.2 },
  { date: '2026-05-12', status: 'Present', clockIn: '09:02 AM', clockOut: '05:00 PM', hours: 7.9 },
  { date: '2026-05-11', status: 'Present', clockIn: '08:50 AM', clockOut: '05:15 PM', hours: 8.4 },
];

type Tab = 'directory' | 'leave' | 'attendance' | 'payroll' | 'org';

export default function HRPage() {
  const [activeTab, setActiveTab] = useState<Tab>('directory');
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Payroll State
  const [payrollStatus, setPayrollStatus] = useState<'Draft' | 'Confirmed'>('Draft');
  const [isProcessing, setIsProcessing] = useState(false);
  const TAX_RATE = 0.20;
  const INSURANCE_RATE = 0.05;

  const handleConfirmPayroll = async () => {
    setIsProcessing(true);
    try {
      // Simulate API call
      await new Promise(r => setTimeout(r, 1000));
      setPayrollStatus('Confirmed');
      alert('Payroll Confirmed! Ledger updated.');
    } catch (err) {
      alert('Failed to confirm payroll');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">HR & Payroll Engine</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Human capital management and payroll processing</p>
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <nav className="-mb-px flex space-x-6 min-w-max">
          {(
            [
              { id: 'directory', label: 'Employee Directory', icon: Users },
              { id: 'leave', label: 'Leave Management', icon: FileText },
              { id: 'attendance', label: 'Attendance', icon: Clock },
              { id: 'payroll', label: 'Payroll Summary', icon: CreditCard },
              { id: 'org', label: 'Org Chart', icon: Network },
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

      {/* Directory Tab */}
      {activeTab === 'directory' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search employees by name or department..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-md border-0 py-2 pl-9 pr-3 text-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-transparent text-slate-900 dark:text-white focus:ring-2 focus:ring-[#ff5a00]"
              />
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Filter className="h-4 w-4" /> Filters
              </button>
              <button className="flex items-center gap-2 rounded-md bg-[#ff5a00] px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors">
                <Plus className="h-4 w-4" /> Add Employee
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">ID</th>
                  <th className="px-6 py-3 font-medium">Department</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{emp.name}</td>
                    <td className="px-6 py-4">{emp.id}</td>
                    <td className="px-6 py-4">{emp.department}</td>
                    <td className="px-6 py-4">{emp.role}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-[#ff5a00] text-xs font-medium">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leave Tab */}
      {activeTab === 'leave' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Leave Requests</h3>
            <button className="flex items-center gap-2 rounded-md bg-[#ff5a00] px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors">
              <Plus className="h-4 w-4" /> Apply Leave
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Employee</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Dates</th>
                  <th className="px-6 py-3 font-medium">Days</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {MOCK_LEAVE_REQUESTS.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{req.employee}</td>
                    <td className="px-6 py-4">{req.type}</td>
                    <td className="px-6 py-4">{req.dates}</td>
                    <td className="px-6 py-4">{req.days}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        req.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      {req.status === 'Pending' && (
                        <>
                          <button className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition-colors"><CheckCircle className="h-4 w-4" /></button>
                          <button className="text-rose-600 hover:bg-rose-50 p-1 rounded transition-colors"><XCircle className="h-4 w-4" /></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">My Attendance</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Current Status: Not Clocked In</p>
            </div>
            <button className="flex items-center gap-2 rounded-md bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 shadow-sm transition-all">
              <Clock className="h-5 w-5" /> Clock In Now
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Clock In</th>
                  <th className="px-6 py-3 font-medium">Clock Out</th>
                  <th className="px-6 py-3 text-right font-medium">Hours Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {MOCK_ATTENDANCE.map((rec, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{rec.date}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{rec.clockIn}</td>
                    <td className="px-6 py-4">{rec.clockOut}</td>
                    <td className="px-6 py-4 text-right font-medium">{rec.hours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payroll Tab */}
      {activeTab === 'payroll' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">Payroll Cycle: May 2026</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Status: <span className={`font-medium ${payrollStatus === 'Confirmed' ? 'text-emerald-600' : 'text-amber-600'}`}>{payrollStatus}</span></p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Download className="h-4 w-4" /> Export CSV
              </button>
              <button
                onClick={handleConfirmPayroll}
                disabled={payrollStatus === 'Confirmed' || isProcessing}
                className={`rounded-md px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all ${
                  payrollStatus === 'Confirmed' 
                  ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' 
                  : 'bg-[#ff5a00] hover:bg-orange-600'
                }`}
              >
                {isProcessing ? 'Processing...' : payrollStatus === 'Confirmed' ? 'Payroll Confirmed' : 'Confirm Payroll'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 font-medium">Employee</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 text-right font-medium">Gross Salary</th>
                    <th className="px-6 py-4 text-right font-medium text-rose-500">Taxes (20%)</th>
                    <th className="px-6 py-4 text-right font-medium text-amber-500">Ins. (5%)</th>
                    <th className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {employees.map((emp) => {
                    const taxes = emp.grossSalary * TAX_RATE;
                    const insurance = emp.grossSalary * INSURANCE_RATE;
                    const net = emp.grossSalary - taxes - insurance;
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900 dark:text-white">{emp.name}</div>
                          <div className="text-xs text-slate-400">{emp.id}</div>
                        </td>
                        <td className="px-6 py-4">{emp.role}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">${emp.grossSalary.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-rose-500">-${taxes.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-amber-500">-${insurance.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">${net.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Org Chart Tab */}
      {activeTab === 'org' && (
        <div className="p-12 flex justify-center overflow-x-auto bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
          <div className="flex flex-col items-center">
            <div className="bg-slate-800 dark:bg-slate-700 text-white p-4 rounded-xl shadow-md w-64 text-center">
              <h4 className="font-bold">CEO</h4>
              <p className="text-sm text-slate-300">Executive Board</p>
            </div>
            <div className="h-8 w-px bg-slate-300 dark:bg-slate-600"></div>
            <div className="w-[600px] h-px bg-slate-300 dark:bg-slate-600"></div>
            <div className="flex justify-between w-[600px]">
              <div className="h-8 w-px bg-slate-300 dark:bg-slate-600"></div>
              <div className="h-8 w-px bg-slate-300 dark:bg-slate-600"></div>
              <div className="h-8 w-px bg-slate-300 dark:bg-slate-600"></div>
            </div>
            <div className="flex justify-between w-[660px] px-[10px]">
              {[
                { title: 'VP Engineering', dept: 'Tech Dept', roles: ['Frontend Lead', 'Backend Dev'] },
                { title: 'VP HR',          dept: 'People Ops',roles: ['HR Manager', 'Recruiter'] },
                { title: 'VP Finance',     dept: 'Accounting',roles: ['Controller', 'Analyst'] }
              ].map((node, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 w-48 text-center hover:border-[#ff5a00] transition-colors relative top-[-1px]">
                  <h4 className="font-bold text-slate-900 dark:text-white">{node.title}</h4>
                  <p className="text-sm text-slate-500">{node.dept}</p>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2">
                    {node.roles.map(r => (
                      <div key={r} className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-300 p-2 rounded border border-slate-100 dark:border-slate-700">{r}</div>
                    ))}
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
