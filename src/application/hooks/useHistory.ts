import { useState, useCallback, useEffect } from 'react';
import { tauriGitService } from '@/infrastructure/services';
import { useRepositoryStore } from '@/application/stores';

const PAGE_SIZE = 100;

export function useHistory() {
  const { currentRepo, commits, setCommits } = useRepositoryStore();
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInitialCommits = useCallback(async () => {
    if (!currentRepo) return;

    setIsLoading(true);
    setError(null);
    try {
      const loadedCommits = await tauriGitService.getCommitLog(
        currentRepo.path,
        PAGE_SIZE,
        0
      );
      setCommits(loadedCommits);
      setHasMore(loadedCommits.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [currentRepo, setCommits]);

  const loadMore = useCallback(async () => {
    if (!currentRepo || isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const moreCommits = await tauriGitService.getCommitLog(
        currentRepo.path,
        PAGE_SIZE,
        commits.length
      );
      setCommits([...commits, ...moreCommits]);
      setHasMore(moreCommits.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [currentRepo, commits, isLoading, hasMore, setCommits]);

  // Load initial commits when repo changes
  useEffect(() => {
    if (currentRepo) {
      loadInitialCommits();
    }
  }, [currentRepo?.path]); // Only reload when path changes

  return {
    commits,
    isLoading,
    hasMore,
    error,
    loadMore,
    refresh: loadInitialCommits,
  };
}
