import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewType = 'status' | 'history' | 'branches' | 'stash' | 'settings';
export type DiffMode = 'unified' | 'split';

interface UIState {
  currentView: ViewType;
  selectedFiles: string[];
  lastSelectedFile: string | null;
  selectedCommit: string | null;
  sidebarCollapsed: boolean;
  diffMode: DiffMode;
  diffContext: number;
  diffWordWrap: boolean;
  diffShowWhitespace: boolean;
  hideEolOnlyFiles: boolean;

  setCurrentView: (view: ViewType) => void;
  setSelectedFiles: (files: string[]) => void;
  toggleFileSelection: (file: string) => void;
  selectFileRange: (file: string, allFiles: string[]) => void;
  clearSelection: () => void;
  setSelectedCommit: (hash: string | null) => void;
  toggleSidebar: () => void;
  setDiffMode: (mode: DiffMode) => void;
  setDiffContext: (lines: number) => void;
  toggleDiffWordWrap: () => void;
  toggleDiffShowWhitespace: () => void;
  toggleHideEolOnlyFiles: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      currentView: 'status',
      selectedFiles: [],
      lastSelectedFile: null,
      selectedCommit: null,
      sidebarCollapsed: false,
      diffMode: 'unified',
      diffContext: 3,
      diffWordWrap: false,
      diffShowWhitespace: false,
      hideEolOnlyFiles: true,

      setCurrentView: (currentView) => set({ currentView, selectedFiles: [], lastSelectedFile: null, selectedCommit: null }),
      setSelectedFiles: (selectedFiles) => set((state) => ({
        selectedFiles,
        lastSelectedFile: selectedFiles.length === 1 ? selectedFiles[0] : state.lastSelectedFile
      })),
      toggleFileSelection: (file) =>
        set((state) => ({
          selectedFiles: state.selectedFiles.includes(file)
            ? state.selectedFiles.filter((f) => f !== file)
            : [...state.selectedFiles, file],
          lastSelectedFile: file,
        })),
      selectFileRange: (file, allFiles) =>
        set((state) => {
          if (!state.lastSelectedFile) {
            return { selectedFiles: [file], lastSelectedFile: file };
          }
          const lastIdx = allFiles.indexOf(state.lastSelectedFile);
          const currentIdx = allFiles.indexOf(file);
          if (lastIdx === -1 || currentIdx === -1) {
            return { selectedFiles: [file], lastSelectedFile: file };
          }
          const start = Math.min(lastIdx, currentIdx);
          const end = Math.max(lastIdx, currentIdx);
          const rangeFiles = allFiles.slice(start, end + 1);
          const newSelection = new Set([...state.selectedFiles, ...rangeFiles]);
          return { selectedFiles: Array.from(newSelection) };
        }),
      clearSelection: () => set({ selectedFiles: [], lastSelectedFile: null }),
      setSelectedCommit: (selectedCommit) => set({ selectedCommit }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setDiffMode: (diffMode) => set({ diffMode }),
      setDiffContext: (diffContext) => set({ diffContext }),
      toggleDiffWordWrap: () => set((s) => ({ diffWordWrap: !s.diffWordWrap })),
      toggleDiffShowWhitespace: () => set((s) => ({ diffShowWhitespace: !s.diffShowWhitespace })),
      toggleHideEolOnlyFiles: () => set((s) => ({ hideEolOnlyFiles: !s.hideEolOnlyFiles })),
    }),
    {
      name: 'grist-ui',
      partialize: (state) => ({
        diffMode: state.diffMode,
        diffContext: state.diffContext,
        diffWordWrap: state.diffWordWrap,
        diffShowWhitespace: state.diffShowWhitespace,
        hideEolOnlyFiles: state.hideEolOnlyFiles,
      }),
    }
  )
);
