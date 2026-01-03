import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Trash2, Globe, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import { AddRemoteDialog } from './AddRemoteDialog';
import { RemoteConfigDialog } from './RemoteConfigDialog';
import type { Remote } from '@/domain/entities';
import { toast } from 'sonner';

export function RemotesView() {
  const { currentRepo } = useRepositoryStore();
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [remoteToDelete, setRemoteToDelete] = useState<Remote | null>(null);
  const [remoteToConfig, setRemoteToConfig] = useState<Remote | null>(null);

  const loadRemotes = useCallback(async () => {
    if (!currentRepo) return;
    setIsLoading(true);
    try {
      const loadedRemotes = await tauriGitService.getRemotes(currentRepo.path);
      setRemotes(loadedRemotes);
    } catch (error) {
      console.error('Failed to load remotes:', error);
      toast.error('Failed to load remotes');
    } finally {
      setIsLoading(false);
    }
  }, [currentRepo]);

  useEffect(() => {
    loadRemotes();
  }, [loadRemotes]);

  const handleDeleteRemote = async () => {
    if (!currentRepo || !remoteToDelete) return;
    try {
      await tauriGitService.removeRemote(currentRepo.path, remoteToDelete.name);
      toast.success(`Remote "${remoteToDelete.name}" deleted`);
      setRemoteToDelete(null);
      loadRemotes();
    } catch (error) {
      toast.error(`Failed to delete remote: ${error}`);
    }
  };

  if (!currentRepo) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Open a repository to view remotes
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Remotes</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={loadRemotes}
            disabled={isLoading}
            title="Refresh remotes"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Remote
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {remotes.length === 0 && !isLoading ? (
          <div className="text-center text-muted-foreground py-8">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No remotes configured</p>
            <p className="text-sm mt-1">Add a remote to sync with external repositories</p>
          </div>
        ) : (
          <div className="space-y-2">
            {remotes.map((remote) => (
              <div
                key={remote.name}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{remote.name}</div>
                    <div className="text-sm text-muted-foreground truncate" title={remote.fetch_url}>
                      {remote.fetch_url}
                    </div>
                    {remote.push_url !== remote.fetch_url && (
                      <div className="text-xs text-muted-foreground truncate" title={`Push: ${remote.push_url}`}>
                        Push: {remote.push_url}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRemoteToConfig(remote)}
                    title="Configure authentication"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setRemoteToDelete(remote)}
                    title="Delete remote"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddRemoteDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onCreated={loadRemotes}
      />

      <AlertDialog open={!!remoteToDelete} onOpenChange={(open) => !open && setRemoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Remote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the remote "{remoteToDelete?.name}"?
              This will only remove the remote reference, not any remote branches.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRemote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RemoteConfigDialog
        open={!!remoteToConfig}
        onOpenChange={(open) => !open && setRemoteToConfig(null)}
        remote={remoteToConfig}
      />
    </div>
  );
}
