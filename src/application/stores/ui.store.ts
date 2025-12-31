import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewType = 'status' | 'history' | 'branches' | 'stash' | 'settings';
export type DiffMode = 'unified' | 'split';

interface UIState {
  currentView: ViewType;
  selectedFiles: string[];
  selectedCommit: string | null;
  sidebarCollapsed: boolean;
  diffMode: DiffMode;
  diffContext: number;

  setCurrentView: (view: ViewType) => void;
  setSelectedFiles: (files: string[]) => void;
  toggleFileSelection: (file: string) => void;
  setSelectedCommit: (hash: string | null) => void;
  toggleSidebar: () => void;
  setDiffMode: (mode: DiffMode) => void;
  setDiffContext: (lines: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      currentView: 'status',
      selectedFiles: [],
      selectedCommit: null,
      sidebarCollapsed: false,
      diffMode: 'unified',
      diffContext: 3,

      setCurrentView: (currentView) => set({ currentView, selectedFiles: [], selectedCommit: null }),
      setSelectedFiles: (selectedFiles) => set({ selectedFiles }),
      toggleFileSelection: (file) =>
        set((state) => ({
          selectedFiles: state.selectedFiles.includes(file)
            ? state.selectedFiles.filter((f) => f !== file)
            : [...state.selectedFiles, file],
        })),
      setSelectedCommit: (selectedCommit) => set({ selectedCommit }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setDiffMode: (diffMode) => set({ diffMode }),
      setDiffContext: (diffContext) => set({ diffContext }),
    }),
    {
      name: 'grist-ui',
      partialize: (state) => ({
        diffMode: state.diffMode,
        diffContext: state.diffContext,
      }),
    }
  )
);
