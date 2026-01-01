import { useEffect, useCallback } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { CommitListWithGraph } from './CommitListWithGraph';
import { CommitDetails } from './CommitDetails';
import { useUIStore, useRepositoryStore } from '@/application/stores';
import { useHistory, useGitService } from '@/application/hooks';

export function HistoryView() {
  // Prevent native context menu from appearing
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);
  const { commits, isLoading, hasMore, loadMore, refresh } = useHistory();
  const { refreshStatus } = useGitService();
  const { selectedCommit, setSelectedCommit } = useUIStore();
  const { currentRepo } = useRepositoryStore();

  // Refresh both history and status when branch changes
  const handleBranchChange = useCallback(() => {
    refresh();
    if (currentRepo) {
      refreshStatus(currentRepo.path);
    }
  }, [refresh, refreshStatus, currentRepo]);

  const selected = commits.find((c) => c.hash === selectedCommit) ?? null;

  if (!currentRepo) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Open a repository to view commit history
      </div>
    );
  }

  return (
    <ResizablePanelGroup className="h-full">
      <ResizablePanel defaultSize={50} minSize={30}>
        <CommitListWithGraph
          commits={commits}
          selectedHash={selectedCommit}
          onSelect={setSelectedCommit}
          onLoadMore={loadMore}
          isLoading={isLoading}
          hasMore={hasMore}
          onBranchChange={handleBranchChange}
        />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={50}>
        {selected ? (
          <CommitDetails commit={selected} />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Select a commit to view details
          </div>
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
