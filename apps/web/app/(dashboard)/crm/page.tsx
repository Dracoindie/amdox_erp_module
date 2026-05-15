'use client';

import { useState } from "react";
import { Users, Kanban, MessageSquare, Briefcase, Plus, Filter, Search, Phone, Mail, FileText, ChevronRight, History } from "lucide-react";
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Mock Data ───────────────────────────────────────────────────────────────
type Stage = 'Lead' | 'Contacted' | 'Negotiation' | 'Closed Won';

interface Lead {
  id: string;
  name: string;
  company: string;
  value: number;
  stage: Stage;
  email: string;
  phone: string;
}

const INITIAL_LEADS: Lead[] = [
  { id: 'LD-001', name: 'John Smith', company: 'TechCorp', value: 45000, stage: 'Lead', email: 'john@techcorp.com', phone: '555-0101' },
  { id: 'LD-002', name: 'Sarah Jones', company: 'Global Solutions', value: 120000, stage: 'Contacted', email: 'sarah@global.com', phone: '555-0102' },
  { id: 'LD-003', name: 'Mike Brown', company: 'Startup Inc', value: 25000, stage: 'Negotiation', email: 'mike@startup.com', phone: '555-0103' },
  { id: 'LD-004', name: 'Emily Davis', company: 'Enterprise LLC', value: 250000, stage: 'Closed Won', email: 'emily@enterprise.com', phone: '555-0104' },
];

const COLUMNS: Stage[] = ['Lead', 'Contacted', 'Negotiation', 'Closed Won'];

const MOCK_SALES_ORDERS = [
  { id: "SO-2026-001", client: "Enterprise LLC", total: 250000, status: "Fulfilled", date: "2026-05-02" },
  { id: "SO-2026-002", client: "Startup Inc", total: 25000, status: "Processing", date: "2026-05-12" },
];

// ── Sortable Item Component ──────────────────────────────────────────────────
function SortableLeadCard({ lead, onSelect }: { lead: Lead, onSelect: (l: Lead) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={() => onSelect(lead)}
      className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing hover:border-[#ff5a00] transition-colors"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{lead.name}</h4>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">${(lead.value / 1000).toFixed(0)}k</span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{lead.company}</p>
    </div>
  );
}

export default function CRMPage() {
  const [activeTab, setActiveTab] = useState<"pipeline" | "contacts" | "orders">("pipeline");
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // DnD Setup
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropping over a column or another card
    const isColumn = COLUMNS.includes(overId as Stage);

    setLeads(prev => {
      const oldIndex = prev.findIndex(l => l.id === activeId);
      const activeLead = prev[oldIndex];
      if (!activeLead) return prev;
      
      let newStage = activeLead.stage;

      if (isColumn) {
         newStage = overId as Stage;
      } else {
         const overLead = prev.find(l => l.id === overId);
         if (overLead) newStage = overLead.stage;
      }

      if (activeLead.stage !== newStage) {
        const updated = [...prev];
        updated[oldIndex] = { ...activeLead, stage: newStage };
        return updated;
      }
      return prev;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">CRM & Sales</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage leads, opportunities, and sales orders</p>
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <nav className="-mb-px flex space-x-6 min-w-max">
          {(
            [
              { id: 'pipeline', label: 'Sales Pipeline', icon: Kanban },
              { id: 'contacts', label: 'Contacts', icon: Users },
              { id: 'orders', label: 'Sales Orders', icon: Briefcase },
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

      {activeTab === "pipeline" && (
        <div className="flex gap-6 h-[calc(100vh-250px)] animate-in fade-in">
          {/* Kanban Board */}
          <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
              {COLUMNS.map(column => {
                const columnLeads = leads.filter(l => l.stage === column);
                const colTotal = columnLeads.reduce((s, l) => s + l.value, 0);

                return (
                  <div key={column} className="flex-1 min-w-[280px] flex flex-col bg-slate-100 dark:bg-slate-900/50 rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-900 dark:text-white">{column}</h3>
                      <span className="text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-full">${(colTotal / 1000).toFixed(0)}k</span>
                    </div>
                    
                    {/* Sortable Context for Column */}
                    <div className="flex-1 flex flex-col gap-3 min-h-[150px]">
                      <SortableContext id={column} items={columnLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                         {columnLeads.map(lead => (
                            <SortableLeadCard key={lead.id} lead={lead} onSelect={setSelectedLead} />
                         ))}
                      </SortableContext>
                    </div>
                  </div>
                );
              })}
            </DndContext>
          </div>

          {/* Lead Details / Timeline Slide-out */}
          {selectedLead && (
            <div className="w-80 shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm flex flex-col animate-in slide-in-from-right-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{selectedLead.name}</h3>
                  <p className="text-sm text-slate-500">{selectedLead.company}</p>
                </div>
                <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-slate-600">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center"><Mail className="h-4 w-4"/></div>
                  {selectedLead.email}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center"><Phone className="h-4 w-4"/></div>
                  {selectedLead.phone}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="h-8 w-8 rounded-full bg-[#ff5a00]/10 text-[#ff5a00] flex items-center justify-center"><Briefcase className="h-4 w-4"/></div>
                  <span className="font-bold">${selectedLead.value.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-4 flex items-center gap-2"><History className="h-4 w-4"/> Timeline & Notes</h4>
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  <div className="border-l-2 border-slate-200 dark:border-slate-700 pl-4 py-1 relative">
                    <div className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-[#ff5a00]"></div>
                    <p className="text-xs text-slate-500 mb-1">May 13, 10:00 AM</p>
                    <p className="text-sm text-slate-800 dark:text-slate-200">Moved to {selectedLead.stage}</p>
                  </div>
                  <div className="border-l-2 border-slate-200 dark:border-slate-700 pl-4 py-1 relative">
                    <div className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                    <p className="text-xs text-slate-500 mb-1">May 10, 2:30 PM</p>
                    <p className="text-sm text-slate-800 dark:text-slate-200">Initial call completed. Sent pricing deck.</p>
                  </div>
                </div>
                
                <div className="relative">
                  <textarea 
                    placeholder="Add a note..." 
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 text-sm resize-none focus:outline-none focus:border-[#ff5a00] focus:ring-1 focus:ring-[#ff5a00]"
                    rows={3}
                  ></textarea>
                  <button className="absolute bottom-3 right-3 bg-[#ff5a00] text-white p-1.5 rounded-lg hover:bg-orange-600 transition-colors">
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "orders" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-medium text-slate-900 dark:text-white">Sales Orders</h3>
            <button className="flex items-center gap-2 rounded-md bg-[#ff5a00] px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors">
              <Plus className="h-4 w-4" /> Create Order
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Order ID</th>
                  <th className="px-6 py-3 font-medium">Client</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {MOCK_SALES_ORDERS.map(so => (
                  <tr key={so.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{so.id}</td>
                    <td className="px-6 py-4">{so.client}</td>
                    <td className="px-6 py-4">{so.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        so.status === 'Fulfilled' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {so.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">${so.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contacts tab omitted for brevity, similar list to employees */}
    </div>
  );
}
