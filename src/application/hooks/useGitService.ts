import { useCallback } from 'react';
import { tauriGitService } from '@/infrastructure/services';
import { useRepositoryStore } from '@/application/stores';

export function useGitService() {
  const {
    setCurrentRepo,
    addRecentRepo,
    setStatus,
    setBranches,
    setCommits,
    setLoading,
    setRefreshing,
    setError,
  } = useRepositoryStore();

  const openRepository = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const repo = await tauriGitService.getRepositoryInfo(path);
      setCurrentRepo(repo);
      addRecentRepo(repo);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setCurrentRepo, addRecentRepo, setLoading, setError]);

  const refreshStatus = useCallback(async (repoPath: string) => {
    setRefreshing(true);
    try {
      const status = await tauriGitService.getStatus(repoPath);
      setStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }, [setStatus, setRefreshing, setError]);

  const loadBranches = useCallback(async (repoPath: string) => {
    try {
      const branches = await tauriGitService.getBranches(repoPath);
      setBranches(branches);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [setBranches, setError]);

  const loadCommits = useCallback(async (repoPath: string, limit = 100) => {
    try {
      const commits = await tauriGitService.getCommits(repoPath, limit);
      setCommits(commits);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [setCommits, setError]);

  const getGitVersion = useCallback(async () => {
    return tauriGitService.getVersion();
  }, []);

  const isGitRepository = useCallback(async (path: string) => {
    return tauriGitService.isGitRepository(path);
  }, []);

  return {
    openRepository,
    refreshStatus,
    loadBranches,
    loadCommits,
    getGitVersion,
    isGitRepository,
  };
}
