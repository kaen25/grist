import { useCallback } from 'react';
import { tauriGitService } from '@/infrastructure/services';
import { useRepositoryStore } from '@/application/stores';

export function useRepository() {
  const { setCurrentRepo, addRecentRepo, setLoading, setError } = useRepositoryStore();

  const openRepository = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const repo = await tauriGitService.openRepository(path);
      setCurrentRepo(repo);
      addRecentRepo(repo);
      return repo;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setCurrentRepo, addRecentRepo, setLoading, setError]);

  return { openRepository };
}
