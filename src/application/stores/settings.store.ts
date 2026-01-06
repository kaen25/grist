import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: Theme;
  fontSize: number;
  diffContextLines: number;
  pollInterval: number;

  setTheme: (theme: Theme) => void;
  setFontSize: (size: number) => void;
  setDiffContextLines: (lines: number) => void;
  setPollInterval: (interval: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      fontSize: 13,
      diffContextLines: 3,
      pollInterval: 3000,

      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setDiffContextLines: (diffContextLines) => set({ diffContextLines }),
      setPollInterval: (pollInterval) => set({ pollInterval }),
    }),
    {
      name: 'grist-settings',
    }
  )
);
