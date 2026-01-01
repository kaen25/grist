import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BranchList } from './BranchList';
import { CreateBranchDialog } from './CreateBranchDialog';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import type { Branch } from '@/domain/entities';

export function BranchesView() {
  const { currentRepo } = useRepositoryStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadBranches = useCallback(async () => {
    if (!currentRepo) return;
    setIsLoading(true);
    try {
      const loadedBranches = await tauriGitService.getBranches(currentRepo.path);
      setBranches(loadedBranches);
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentRepo]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  if (!currentRepo) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Open a repository to view branches
      </div>
    );
  }

  const localBranches = branches.filter((b) => !b.is_remote);
  const remoteBranches = branches.filter((b) => b.is_remote);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Branches</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={loadBranches}
            disabled={isLoading}
            title="Refresh branches"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Branch
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        <BranchList
          title="Local Branches"
          branches={localBranches}
          onRefresh={loadBranches}
        />
        <BranchList
          title="Remote Branches"
          branches={remoteBranches}
          onRefresh={loadBranches}
        />

        {branches.length === 0 && !isLoading && (
          <div className="text-center text-muted-foreground py-8">
            No branches found
          </div>
        )}
      </div>

      <CreateBranchDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={loadBranches}
      />
    </div>
  );
}
