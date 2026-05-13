import { create } from 'zustand';

interface DashboardState {
  currentTenantId: string;
  setTenantId: (id: string) => void;
  
  // Drill-down State
  isDrillDownOpen: boolean;
  drillDownTitle: string;
  drillDownData: any[];
  openDrillDown: (title: string, data: any[]) => void;
  closeDrillDown: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  currentTenantId: 'TENANT-001', // Default mock tenant
  setTenantId: (id) => set({ currentTenantId: id }),
  
  isDrillDownOpen: false,
  drillDownTitle: '',
  drillDownData: [],
  openDrillDown: (title, data) => set({ isDrillDownOpen: true, drillDownTitle: title, drillDownData: data }),
  closeDrillDown: () => set({ isDrillDownOpen: false, drillDownTitle: '', drillDownData: [] })
}));
