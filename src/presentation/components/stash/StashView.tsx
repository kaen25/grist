import { useState, useEffect, useCallback } from 'react';
import { Plus, Archive, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StashList } from './StashList';
import { CreateStashDialog } from './CreateStashDialog';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import type { Stash } from '@/domain/entities';

export function StashView() {
  const { currentRepo, triggerRefresh } = useRepositoryStore();
  const [stashes, setStashes] = useState<Stash[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadStashes = useCallback(async () => {
    if (!currentRepo) return;
    setIsLoading(true);
    try {
      const loaded = await tauriGitService.getStashes(currentRepo.path);
      setStashes(loaded);
    } catch (error) {
      console.error('Failed to load stashes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentRepo]);

  useEffect(() => {
    loadStashes();
  }, [loadStashes]);

  const handleStashAction = async () => {
    await loadStashes();
    triggerRefresh();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5" />
          <h2 className="font-semibold">Stash</h2>
          {stashes.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({stashes.length})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={loadStashes}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Stash Changes
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading && stashes.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <StashList stashes={stashes} onAction={handleStashAction} />
        )}
      </div>

      <CreateStashDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={handleStashAction}
      />
    </div>
  );
}
