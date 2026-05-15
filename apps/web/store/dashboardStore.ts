import { create } from 'zustand';
import type { AuthUser } from '../lib/auth';

interface DashboardState {
  // Tenant
  currentTenantId: string;
  setTenantId: (id: string) => void;

  // Auth User
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;

  // Session timeout
  showSessionWarning: boolean;
  setShowSessionWarning: (v: boolean) => void;

  // Drill-down State
  isDrillDownOpen: boolean;
  drillDownTitle: string;
  drillDownData: { id: string; date: string; desc: string; value: number | string }[];
  openDrillDown: (title: string, data: { id: string; date: string; desc: string; value: number | string }[]) => void;
  closeDrillDown: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  currentTenantId: 'TENANT-001',
  setTenantId: (id) => set({ currentTenantId: id }),

  user: null,
  setUser: (user) => set({ user }),

  showSessionWarning: false,
  setShowSessionWarning: (v) => set({ showSessionWarning: v }),

  isDrillDownOpen: false,
  drillDownTitle: '',
  drillDownData: [],
  openDrillDown: (title, data) => set({ isDrillDownOpen: true, drillDownTitle: title, drillDownData: data }),
  closeDrillDown: () => set({ isDrillDownOpen: false, drillDownTitle: '', drillDownData: [] }),
}));
