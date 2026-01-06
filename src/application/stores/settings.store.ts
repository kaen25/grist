import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: Theme;
  diffContextLines: number;
  pollInterval: number;
  gitPath: string;

  setTheme: (theme: Theme) => void;
  setDiffContextLines: (lines: number) => void;
  setPollInterval: (interval: number) => void;
  setGitPath: (path: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      diffContextLines: 3,
      pollInterval: 3000,
      gitPath: '',

      setTheme: (theme) => set({ theme }),
      setDiffContextLines: (diffContextLines) => set({ diffContextLines }),
      setPollInterval: (pollInterval) => set({ pollInterval }),
      setGitPath: (gitPath) => set({ gitPath }),
    }),
    {
      name: 'grist-settings',
    }
  )
);
