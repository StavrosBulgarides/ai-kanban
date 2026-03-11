import { create } from 'zustand';

type ViewMode = 'kanban' | 'list';

interface FilterState {
  search: string;
  priorities: string[];
  tagIds: string[];
}

interface UIState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedWorkItemId: string | null;
  setSelectedWorkItemId: (id: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  settingsTab: string;
  setSettingsTab: (tab: string) => void;
}

const defaultFilters: FilterState = { search: '', priorities: [], tagIds: [] };

export const useUIStore = create<UIState>((set) => ({
  viewMode: 'kanban',
  setViewMode: (mode) => set({ viewMode: mode }),
  selectedWorkItemId: null,
  setSelectedWorkItemId: (id) => set({ selectedWorkItemId: id }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  filters: defaultFilters,
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: defaultFilters }),
  settingsTab: 'drives',
  setSettingsTab: (tab) => set({ settingsTab: tab }),
}));
