'use client';

import { useState } from 'react';
import {
  Users, Plus, Phone, Mail, Building2, TrendingUp, X,
  MoreHorizontal, Star, Circle, CheckCircle2, Clock, Target,
  DollarSign, Search
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type LeadStage = 'Prospect' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';

interface Lead {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  value: number;       // USD
  stage: LeadStage;
  assignedTo: string;
  lastActivity: string;
  tags: string[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_LEADS: Lead[] = [
  {
    id: 'LD-001', company: 'TechCorp Solutions', contact: 'James Carter',
    email: 'james@techcorp.io', phone: '+1-415-555-0101', value: 120000,
    stage: 'Proposal', assignedTo: 'Alice Johnson', lastActivity: '2026-05-11',
    tags: ['Enterprise', 'Q2 Target'],
  },
  {
    id: 'LD-002', company: 'NovaStar Retail', contact: 'Priya Mehta',
    email: 'priya@novastar.in', phone: '+91-98765-43210', value: 45000,
    stage: 'Qualified', assignedTo: 'Bob Smith', lastActivity: '2026-05-10',
    tags: ['Mid-Market'],
  },
  {
    id: 'LD-003', company: 'BlueWave Logistics', contact: 'Michael Torres',
    email: 'm.torres@bluewavelogistics.com', phone: '+1-312-555-0192', value: 200000,
    stage: 'Negotiation', assignedTo: 'Alice Johnson', lastActivity: '2026-05-12',
    tags: ['Enterprise', 'Priority'],
  },
  {
    id: 'LD-004', company: 'GreenPath Energy', contact: 'Sara Lindqvist',
    email: 'sara@greenpath.se', phone: '+46-70-555-1234', value: 75000,
    stage: 'Prospect', assignedTo: 'Carol White', lastActivity: '2026-05-09',
    tags: ['SMB', 'Sustainability'],
  },
  {
    id: 'LD-005', company: 'Axiom Pharma', contact: 'David Okafor',
    email: 'd.okafor@axiompharma.ng', phone: '+234-810-555-9988', value: 310000,
    stage: 'Won', assignedTo: 'Bob Smith', lastActivity: '2026-05-08',
    tags: ['Enterprise', 'Closed-Won'],
  },
  {
    id: 'LD-006', company: 'PulseFin FinTech', contact: 'Emily Zhang',
    email: 'emily@pulsefin.com', phone: '+65-9123-4567', value: 90000,
    stage: 'Lost', assignedTo: 'Carol White', lastActivity: '2026-05-07',
    tags: ['FinTech'],
  },
];

const STAGES: { stage: LeadStage; color: string; bg: string; icon: any }[] = [
  { stage: 'Prospect',    color: 'text-slate-600',  bg: 'bg-slate-100',  icon: Circle },
  { stage: 'Qualified',   color: 'text-blue-700',   bg: 'bg-blue-100',   icon: Star },
  { stage: 'Proposal',    color: 'text-violet-700', bg: 'bg-violet-100', icon: Target },
  { stage: 'Negotiation', color: 'text-amber-700',  bg: 'bg-amber-100',  icon: Clock },
  { stage: 'Won',         color: 'text-emerald-700',bg: 'bg-emerald-100',icon: CheckCircle2 },
  { stage: 'Lost',        color: 'text-rose-700',   bg: 'bg-rose-100',   icon: X },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: LeadStage }) {
  const s = STAGES.find(x => x.stage === stage)!;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.color}`}>
      <Icon className="h-3 w-3" /> {stage}
    </span>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

// ─── New Lead Modal ────────────────────────────────────────────────────────────

function NewLeadModal({ onClose, onAdd }: { onClose: () => void; onAdd: (l: Lead) => void }) {
  const [form, setForm] = useState({
    company: '', contact: '', email: '', phone: '', value: '', stage: 'Prospect' as LeadStage, assignedTo: '',
  });

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const lead: Lead = {
      id: `LD-${String(Date.now()).slice(-4)}`,
      company: form.company,
      contact: form.contact,
      email: form.email,
      phone: form.phone,
      value: parseFloat(form.value) || 0,
      stage: form.stage,
      assignedTo: form.assignedTo,
      lastActivity: new Date().toISOString().split('T')[0]!,
      tags: [],
    };
    onAdd(lead);
    onClose();
  };

  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#0055A5] focus:ring-1 focus:ring-[#0055A5] outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">New Lead</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Company</label>
              <input required className={inputCls} value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Acme Corp" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Contact Name</label>
              <input required className={inputCls} value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="Jane Doe" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input required type="email" className={inputCls} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@acme.com" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
              <input className={inputCls} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1-555-0100" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Deal Value (USD)</label>
              <input required type="number" min="0" step="1000" className={inputCls} value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="50000" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Pipeline Stage</label>
              <select className={inputCls} value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value as LeadStage })}>
                {STAGES.map(s => <option key={s.stage} value={s.stage}>{s.stage}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Assigned To</label>
            <select className={inputCls} value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
              <option value="">— Select Rep —</option>
              <option>Alice Johnson</option>
              <option>Bob Smith</option>
              <option>Carol White</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="rounded-md bg-[#0055A5] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Add Lead</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({ stage, leads, color, bg, icon: Icon }: {
  stage: LeadStage; leads: Lead[]; color: string; bg: string; icon: any;
}) {
  const total = leads.reduce((s, l) => s + l.value, 0);
  return (
    <div className="flex w-64 shrink-0 flex-col gap-3">
      <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${bg}`}>
        <div className={`flex items-center gap-2 font-semibold text-sm ${color}`}>
          <Icon className="h-4 w-4" /> {stage}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${bg} ${color} border border-current/20`}>{leads.length}</span>
      </div>
      <p className="px-1 text-xs text-gray-400 font-medium">${total.toLocaleString()} pipeline</p>
      {leads.map(lead => (
        <div key={lead.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-[#0055A5]/30 transition-all cursor-pointer group">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-semibold text-gray-900 text-sm leading-tight">{lead.company}</p>
              <p className="text-xs text-gray-500 mt-0.5">{lead.contact}</p>
            </div>
            <button className="text-gray-300 group-hover:text-gray-500 transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          <p className="text-lg font-bold text-[#0055A5]">${lead.value.toLocaleString()}</p>
          <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
            <div className="h-5 w-5 rounded-full bg-[#0055A5] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
              {lead.assignedTo.split(' ').map(n => n[0]).join('')}
            </div>
            <span className="text-xs text-gray-400 truncate">{lead.assignedTo}</span>
            <span className="ml-auto text-xs text-gray-300">{lead.lastActivity}</span>
          </div>
          {lead.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {lead.tags.map(t => (
                <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">{t}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'contacts'>('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const addLead = (l: Lead) => setLeads(prev => [...prev, l]);

  // KPIs
  const pipelineValue = leads.filter(l => !['Won', 'Lost'].includes(l.stage)).reduce((s, l) => s + l.value, 0);
  const wonValue      = leads.filter(l => l.stage === 'Won').reduce((s, l) => s + l.value, 0);
  const winRate       = leads.length > 0
    ? Math.round((leads.filter(l => l.stage === 'Won').length / leads.filter(l => ['Won', 'Lost'].includes(l.stage)).length || 0) * 100)
    : 0;

  // Contacts table
  const filtered = leads.filter(l =>
    l.company.toLowerCase().includes(search.toLowerCase()) ||
    l.contact.toLowerCase().includes(search.toLowerCase()) ||
    l.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">CRM &amp; Sales Pipeline</h2>
          <p className="text-sm text-gray-500">Manage leads, contacts, and deal progression</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-md bg-[#0055A5] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Lead
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard label="Active Pipeline" value={`$${(pipelineValue / 1000).toFixed(0)}K`} sub={`${leads.filter(l => !['Won','Lost'].includes(l.stage)).length} open deals`} color="text-[#0055A5]" />
        <KpiCard label="Total Closed Won" value={`$${(wonValue / 1000).toFixed(0)}K`} sub={`${leads.filter(l => l.stage === 'Won').length} deals closed`} color="text-emerald-600" />
        <KpiCard label="Win Rate" value={`${winRate}%`} sub="Won / (Won + Lost)" color="text-violet-600" />
        <KpiCard label="Total Leads" value={String(leads.length)} sub="Across all stages" color="text-gray-900" />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {([
            { id: 'pipeline', label: 'Kanban Pipeline', Icon: TrendingUp },
            { id: 'contacts', label: 'Contact Directory', Icon: Users },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === id ? 'border-[#0055A5] text-[#0055A5]' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Kanban Pipeline ── */}
      {activeTab === 'pipeline' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {STAGES.map(({ stage, color, bg, icon }) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                leads={leads.filter(l => l.stage === stage)}
                color={color}
                bg={bg}
                icon={icon}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Contact Directory ── */}
      {activeTab === 'contacts' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search company, name, or email…"
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#0055A5] focus:ring-1 focus:ring-[#0055A5]"
              />
            </div>
            <span className="text-sm text-gray-400">{filtered.length} records</span>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Company</th>
                  <th className="px-6 py-3 font-medium">Contact</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Phone</th>
                  <th className="px-6 py-3 text-right font-medium">Deal Value</th>
                  <th className="px-6 py-3 font-medium">Stage</th>
                  <th className="px-6 py-3 font-medium">Assigned To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filtered.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0055A5]/10 text-[#0055A5] text-xs font-bold">
                          {lead.company[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{lead.company}</p>
                          <p className="text-xs text-gray-400">{lead.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{lead.contact}</td>
                    <td className="px-6 py-4">
                      <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-[#0055A5] hover:underline">
                        <Mail className="h-3 w-3" /> {lead.email}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Phone className="h-3 w-3" /> {lead.phone}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      ${lead.value.toLocaleString()}
                    </td>
                    <td className="px-6 py-4"><StageBadge stage={lead.stage} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-[#0055A5] text-white text-[9px] font-bold flex items-center justify-center">
                          {lead.assignedTo.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-gray-600">{lead.assignedTo}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400">No leads match your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && <NewLeadModal onClose={() => setIsModalOpen(false)} onAdd={addLead} />}
    </div>
  );
}
