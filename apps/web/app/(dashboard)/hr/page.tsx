'use client';

import { useState } from "react";
import { Users, CreditCard, Network, CheckCircle, ChevronRight, Calculator } from "lucide-react";
import type { Employee } from "@repo/types";

// Mock Data
const MOCK_EMPLOYEES: Employee[] = [
  { id: "EMP-001", name: "Alice Johnson", department: "Engineering", role: "Frontend Lead", status: "Active", grossSalary: 120000 },
  { id: "EMP-002", name: "Bob Smith", department: "Engineering", role: "Backend Developer", status: "Active", grossSalary: 95000 },
  { id: "EMP-003", name: "Carol White", department: "HR", role: "HR Manager", status: "Active", grossSalary: 85000 },
];

export default function HRPage() {
  const [activeTab, setActiveTab] = useState<"onboarding" | "payroll" | "org">("payroll");
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);

  // Onboarding State
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1);
  const [newEmployee, setNewEmployee] = useState({ name: "", department: "", role: "", salary: 0 });

  // Payroll State
  const [payrollStatus, setPayrollStatus] = useState<"Draft" | "Confirmed">("Draft");
  const [isProcessing, setIsProcessing] = useState(false);

  // Constants
  const TAX_RATE = 0.20;
  const INSURANCE_RATE = 0.05;

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (onboardingStep < 3) setOnboardingStep((s) => (s + 1) as 1 | 2 | 3);
    else {
      // Submit
      const emp: Employee = {
        id: `EMP-00${employees.length + 1}`,
        name: newEmployee.name,
        department: newEmployee.department,
        role: newEmployee.role,
        status: "Active",
        grossSalary: newEmployee.salary
      };
      setEmployees([...employees, emp]);
      setOnboardingStep(1);
      setNewEmployee({ name: "", department: "", role: "", salary: 0 });
      alert("Employee Onboarded Successfully!");
      setActiveTab("payroll");
    }
  };

  const handleConfirmPayroll = async () => {
    setIsProcessing(true);
    const totals = employees.reduce((acc, emp) => {
      const taxes = emp.grossSalary * TAX_RATE;
      const net = emp.grossSalary - taxes - (emp.grossSalary * INSURANCE_RATE);
      return {
        gross: acc.gross + emp.grossSalary,
        taxes: acc.taxes + taxes,
        net: acc.net + net
      };
    }, { gross: 0, taxes: 0, net: 0 });

    try {
      await fetch('/api/payroll/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalGross: totals.gross,
          totalTaxes: totals.taxes,
          totalNet: totals.net
        })
      });
      setPayrollStatus("Confirmed");
      alert("Payroll Confirmed! Ledger updated via MSW Event.");
    } catch (err) {
      console.error(err);
      alert("Failed to confirm payroll");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">HR & Payroll Engine</h2>
          <p className="text-sm text-gray-500">Human capital management and payroll processing</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("payroll")}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "payroll" ? "border-[#0055A5] text-[#0055A5]" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <Calculator className="h-4 w-4" /> Gross-to-Net Dashboard
          </button>
          <button
            onClick={() => setActiveTab("onboarding")}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "onboarding" ? "border-[#0055A5] text-[#0055A5]" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <Users className="h-4 w-4" /> Onboarding Flow
          </button>
          <button
            onClick={() => setActiveTab("org")}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "org" ? "border-[#0055A5] text-[#0055A5]" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <Network className="h-4 w-4" /> Org Chart
          </button>
        </nav>
      </div>

      {activeTab === "payroll" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Payroll Cycle: May 2026</h3>
              <p className="text-sm text-gray-500">Status: <span className={`font-medium ${payrollStatus === "Confirmed" ? "text-emerald-600" : "text-amber-600"}`}>{payrollStatus}</span></p>
            </div>
            <button
              onClick={handleConfirmPayroll}
              disabled={payrollStatus === "Confirmed" || isProcessing}
              className={`rounded-md px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all ${
                payrollStatus === "Confirmed" 
                ? "bg-gray-300 cursor-not-allowed" 
                : "bg-[#0055A5] hover:bg-blue-700"
              }`}
            >
              {isProcessing ? "Processing..." : payrollStatus === "Confirmed" ? "Payroll Confirmed" : "Confirm Payroll"}
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs uppercase text-gray-700 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-medium">Employee</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 text-right font-medium">Gross Salary</th>
                    <th className="px-6 py-4 text-right font-medium text-rose-600">Taxes (20%)</th>
                    <th className="px-6 py-4 text-right font-medium text-amber-600">Insurance (5%)</th>
                    <th className="px-6 py-4 text-right font-medium text-emerald-600">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {employees.map((emp) => {
                    const taxes = emp.grossSalary * TAX_RATE;
                    const insurance = emp.grossSalary * INSURANCE_RATE;
                    const net = emp.grossSalary - taxes - insurance;
                    return (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{emp.name}</div>
                          <div className="text-xs text-gray-400">{emp.id}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{emp.role}</td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900">${emp.grossSalary.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-rose-600">-${taxes.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-amber-600">-${insurance.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600">${net.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "onboarding" && (
        <div className="max-w-2xl mx-auto rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mt-8">
          <div className="border-b border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">New Employee Onboarding</h3>
            <div className="text-sm font-medium text-gray-500">Step {onboardingStep} of 3</div>
          </div>
          
          <div className="p-6">
            <div className="flex justify-between mb-8 relative">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10 -translate-y-1/2"></div>
              {[
                { step: 1, label: "Personal" },
                { step: 2, label: "Role & Salary" },
                { step: 3, label: "Banking" }
              ].map((s) => (
                <div key={s.step} className="flex flex-col items-center bg-white px-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    onboardingStep >= s.step ? "bg-[#0055A5] text-white" : "bg-gray-200 text-gray-500"
                  }`}>
                    {onboardingStep > s.step ? <CheckCircle className="h-4 w-4" /> : s.step}
                  </div>
                  <span className="mt-2 text-xs font-medium text-gray-500">{s.label}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleNextStep} className="space-y-6">
              {onboardingStep === 1 && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input required type="text" value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#0055A5] focus:ring-1 focus:ring-[#0055A5]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input required type="email" className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#0055A5] focus:ring-1 focus:ring-[#0055A5]" />
                  </div>
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                      <input required type="text" value={newEmployee.department} onChange={e => setNewEmployee({...newEmployee, department: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#0055A5] focus:ring-1 focus:ring-[#0055A5]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <input required type="text" value={newEmployee.role} onChange={e => setNewEmployee({...newEmployee, role: e.target.value})} className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#0055A5] focus:ring-1 focus:ring-[#0055A5]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Annual Gross Salary ($)</label>
                    <input required type="number" min="0" value={newEmployee.salary || ""} onChange={e => setNewEmployee({...newEmployee, salary: parseInt(e.target.value) || 0})} className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#0055A5] focus:ring-1 focus:ring-[#0055A5]" />
                  </div>
                </div>
              )}

              {onboardingStep === 3 && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <input required type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#0055A5] focus:ring-1 focus:ring-[#0055A5]" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Routing Number</label>
                      <input required type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#0055A5] focus:ring-1 focus:ring-[#0055A5]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      <input required type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#0055A5] focus:ring-1 focus:ring-[#0055A5]" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-6">
                <button type="submit" className="flex items-center gap-2 rounded-md bg-[#0055A5] px-6 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  {onboardingStep === 3 ? "Complete Onboarding" : "Next Step"} <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === "org" && (
        <div className="p-12 flex justify-center overflow-x-auto">
          <div className="flex flex-col items-center">
            <div className="bg-[#0055A5] text-white p-4 rounded-xl shadow-md w-64 text-center border-2 border-[#003d7a]">
              <h4 className="font-bold">CEO</h4>
              <p className="text-sm opacity-90">Executive Board</p>
            </div>
            <div className="h-8 w-px bg-gray-400"></div>
            <div className="w-[600px] h-px bg-gray-400"></div>
            <div className="flex justify-between w-[600px]">
              <div className="h-8 w-px bg-gray-400"></div>
              <div className="h-8 w-px bg-gray-400"></div>
              <div className="h-8 w-px bg-gray-400"></div>
            </div>
            <div className="flex justify-between w-[660px] px-[10px]">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 w-48 text-center hover:border-[#0055A5] transition-colors cursor-pointer relative top-[-1px]">
                <h4 className="font-bold text-gray-900">VP Engineering</h4>
                <p className="text-sm text-gray-500">Tech Dept</p>
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
                  <div className="bg-gray-50 text-xs p-2 rounded border border-gray-100">Frontend Lead</div>
                  <div className="bg-gray-50 text-xs p-2 rounded border border-gray-100">Backend Dev</div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 w-48 text-center hover:border-[#0055A5] transition-colors cursor-pointer relative top-[-1px]">
                <h4 className="font-bold text-gray-900">VP HR</h4>
                <p className="text-sm text-gray-500">People Ops</p>
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
                  <div className="bg-gray-50 text-xs p-2 rounded border border-gray-100">HR Manager</div>
                  <div className="bg-gray-50 text-xs p-2 rounded border border-gray-100">Recruiter</div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 w-48 text-center hover:border-[#0055A5] transition-colors cursor-pointer relative top-[-1px]">
                <h4 className="font-bold text-gray-900">VP Finance</h4>
                <p className="text-sm text-gray-500">Accounting</p>
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
                  <div className="bg-gray-50 text-xs p-2 rounded border border-gray-100">Controller</div>
                  <div className="bg-gray-50 text-xs p-2 rounded border border-gray-100">Analyst</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
