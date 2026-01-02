import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRepositoryStore } from '@/application/stores';
import { useGitService } from '@/application/hooks';
import { tauriGitService } from '@/infrastructure/services';
import type { Remote, Branch } from '@/domain/entities';
import { toast } from 'sonner';
import { Download } from 'lucide-react';

interface PullDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PullDialog({ open, onOpenChange, onSuccess }: PullDialogProps) {
  const { currentRepo } = useRepositoryStore();
  const { refreshStatus } = useGitService();
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedRemote, setSelectedRemote] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [rebase, setRebase] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sshKeyPath, setSshKeyPath] = useState<string | undefined>();

  useEffect(() => {
    if (open && currentRepo) {
      loadData();
    }
  }, [open, currentRepo]);

  // Load SSH key path when remote changes
  useEffect(() => {
    const loadAuthConfig = async () => {
      if (!currentRepo || !selectedRemote) {
        setSshKeyPath(undefined);
        return;
      }
      try {
        const config = await tauriGitService.getRemoteAuthConfig(currentRepo.path, selectedRemote);
        setSshKeyPath(config.auth_type === 'ssh-key' ? config.ssh_key_path : undefined);
      } catch {
        setSshKeyPath(undefined);
      }
    };
    loadAuthConfig();
  }, [currentRepo, selectedRemote]);

  const loadData = async () => {
    if (!currentRepo) return;
    setIsLoading(true);
    try {
      const [loadedRemotes, loadedBranches] = await Promise.all([
        tauriGitService.getRemotes(currentRepo.path),
        tauriGitService.getBranches(currentRepo.path),
      ]);
      setRemotes(loadedRemotes);
      setBranches(loadedBranches.filter(b => !b.is_remote));

      // Default to origin if available
      const origin = loadedRemotes.find(r => r.name === 'origin');
      setSelectedRemote(origin?.name || loadedRemotes[0]?.name || '');

      // Default to current branch
      const currentBranch = loadedBranches.find(b => b.is_current && !b.is_remote);
      setSelectedBranch(currentBranch?.name || '');
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load remotes and branches');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRepo || !selectedRemote) return;

    setIsSubmitting(true);
    try {
      await tauriGitService.pull(
        currentRepo.path,
        selectedRemote,
        selectedBranch || undefined,
        rebase,
        sshKeyPath
      );
      toast.success('Pull successful');
      onOpenChange(false);
      refreshStatus(currentRepo.path);
      onSuccess?.();
    } catch (error) {
      toast.error(`Pull failed: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setRebase(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Pull from Remote
          </DialogTitle>
          <DialogDescription>
            Fetch and integrate remote changes
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pull-remote">Remote</Label>
              <Select
                value={selectedRemote}
                onValueChange={setSelectedRemote}
                disabled={isLoading}
              >
                <SelectTrigger id="pull-remote">
                  <SelectValue placeholder="Select remote" />
                </SelectTrigger>
                <SelectContent>
                  {remotes.map((remote) => (
                    <SelectItem key={remote.name} value={remote.name}>
                      {remote.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pull-branch">Branch</Label>
              <Select
                value={selectedBranch}
                onValueChange={setSelectedBranch}
                disabled={isLoading}
              >
                <SelectTrigger id="pull-branch">
                  <SelectValue placeholder="Current branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.name} value={branch.name}>
                      {branch.name}
                      {branch.is_current && ' (current)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="rebase"
                checked={rebase}
                onCheckedChange={(checked) => setRebase(checked === true)}
              />
              <Label htmlFor="rebase" className="font-normal cursor-pointer">
                Rebase instead of merge (--rebase)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedRemote || isSubmitting || isLoading}
            >
              {isSubmitting ? 'Pulling...' : 'Pull'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
