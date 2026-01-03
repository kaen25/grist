import { Plus, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStagingActions } from '@/application/hooks';
import { useUIStore, useRepositoryStore } from '@/application/stores';
import { useMemo } from 'react';

export function SelectionActionBar() {
  const { selectedFiles, clearSelection } = useUIStore();
  const { status } = useRepositoryStore();
  const { stageFile, unstageFile } = useStagingActions();

  // Categorize selected files
  const { stagedSelected, unstagedSelected } = useMemo(() => {
    if (!status) return { stagedSelected: [], unstagedSelected: [] };

    const stagedPaths = new Set(status.staged.map((f) => f.path));
    const unstagedPaths = new Set([
      ...status.unstaged.map((f) => f.path),
      ...status.untracked.map((f) => f.path),
    ]);

    return {
      stagedSelected: selectedFiles.filter((f) => stagedPaths.has(f)),
      unstagedSelected: selectedFiles.filter((f) => unstagedPaths.has(f)),
    };
  }, [selectedFiles, status]);

  if (selectedFiles.length <= 1) return null;

  const handleStageSelected = async () => {
    for (const path of unstagedSelected) {
      await stageFile(path);
    }
    clearSelection();
  };

  const handleUnstageSelected = async () => {
    for (const path of stagedSelected) {
      await unstageFile(path);
    }
    clearSelection();
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t bg-muted/50 shrink-0">
      <span className="text-sm text-muted-foreground flex-1">
        {selectedFiles.length} selected
      </span>

      {unstagedSelected.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1"
          onClick={handleStageSelected}
        >
          <Plus className="h-3 w-3" />
          Stage {unstagedSelected.length}
        </Button>
      )}

      {stagedSelected.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1"
          onClick={handleUnstageSelected}
        >
          <Minus className="h-3 w-3" />
          Unstage {stagedSelected.length}
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={clearSelection}
        title="Clear selection"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
