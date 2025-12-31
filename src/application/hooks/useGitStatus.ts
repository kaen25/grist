import { useEffect, useCallback, useRef } from 'react';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';

export function useGitStatus(pollInterval = 3000) {
  const { currentRepo, setStatus, setRefreshing } = useRepositoryStore();
  const intervalRef = useRef<number | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!currentRepo) return;

    try {
      setRefreshing(true);
      const status = await tauriGitService.getStatus(currentRepo.path);
      setStatus(status);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setRefreshing(false);
    }
  }, [currentRepo, setStatus, setRefreshing]);

  useEffect(() => {
    fetchStatus();

    // Start polling
    intervalRef.current = window.setInterval(fetchStatus, pollInterval);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        fetchStatus();
        intervalRef.current = window.setInterval(fetchStatus, pollInterval);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchStatus, pollInterval]);

  return { refresh: fetchStatus };
}
