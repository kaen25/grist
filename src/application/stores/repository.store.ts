import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Repository, Branch, Commit } from '@/domain/entities';
import type { GitStatus } from '@/domain/value-objects';

interface RepositoryState {
  currentRepo: Repository | null;
  recentRepos: Repository[];
  status: GitStatus | null;
  commits: Commit[];
  branches: Branch[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  setCurrentRepo: (repo: Repository | null) => void;
  addRecentRepo: (repo: Repository) => void;
  setStatus: (status: GitStatus | null) => void;
  setCommits: (commits: Commit[]) => void;
  setBranches: (branches: Branch[]) => void;
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setError: (error: string | null) => void;
}

export const useRepositoryStore = create<RepositoryState>()(
  persist(
    (set) => ({
      currentRepo: null,
      recentRepos: [],
      status: null,
      commits: [],
      branches: [],
      isLoading: false,
      isRefreshing: false,
      error: null,

      setCurrentRepo: (repo) => set({ currentRepo: repo }),
      addRecentRepo: (repo) =>
        set((state) => ({
          recentRepos: [
            repo,
            ...state.recentRepos.filter((r) => r.path !== repo.path),
          ].slice(0, 10),
        })),
      setStatus: (status) => set({ status }),
      setCommits: (commits) => set({ commits }),
      setBranches: (branches) => set({ branches }),
      setLoading: (isLoading) => set({ isLoading }),
      setRefreshing: (isRefreshing) => set({ isRefreshing }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'grist-repository',
      partialize: (state) => ({ recentRepos: state.recentRepos }),
    }
  )
);
