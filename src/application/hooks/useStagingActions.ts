import { useCallback } from 'react';
import { tauriGitService } from '@/infrastructure/services';
import { useRepositoryStore } from '@/application/stores';
import { toast } from 'sonner';

export function useStagingActions() {
  const { currentRepo } = useRepositoryStore();

  const stageFile = useCallback(async (path: string) => {
    if (!currentRepo) return;
    try {
      await tauriGitService.stageFile(currentRepo.path, path);
    } catch (error) {
      toast.error('Failed to stage file', { description: String(error) });
    }
  }, [currentRepo]);

  const stageAll = useCallback(async () => {
    if (!currentRepo) return;
    try {
      await tauriGitService.stageAll(currentRepo.path);
    } catch (error) {
      toast.error('Failed to stage all', { description: String(error) });
    }
  }, [currentRepo]);

  const unstageFile = useCallback(async (path: string) => {
    if (!currentRepo) return;
    try {
      await tauriGitService.unstageFile(currentRepo.path, path);
    } catch (error) {
      toast.error('Failed to unstage file', { description: String(error) });
    }
  }, [currentRepo]);

  const unstageAll = useCallback(async () => {
    if (!currentRepo) return;
    try {
      await tauriGitService.unstageAll(currentRepo.path);
    } catch (error) {
      toast.error('Failed to unstage all', { description: String(error) });
    }
  }, [currentRepo]);

  const discardChanges = useCallback(async (path: string, isUntracked: boolean) => {
    if (!currentRepo) return;
    try {
      await tauriGitService.discardChanges(currentRepo.path, path, isUntracked);
      toast.success('Changes discarded');
    } catch (error) {
      toast.error('Failed to discard changes', { description: String(error) });
    }
  }, [currentRepo]);

  return { stageFile, stageAll, unstageFile, unstageAll, discardChanges };
}
