import { useState } from 'react';
import { GitBranch, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import { toast } from 'sonner';

interface RebaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRebased: () => void;
}

export function RebaseDialog({ open, onOpenChange, onRebased }: RebaseDialogProps) {
  const { currentRepo, branches, status } = useRepositoryStore();
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isRebasing, setIsRebasing] = useState(false);

  const availableBranches = branches.filter((b) => !b.is_current);

  const handleRebase = async () => {
    if (!currentRepo || !selectedBranch) return;

    setIsRebasing(true);
    try {
      await tauriGitService.rebaseBranch(currentRepo.path, selectedBranch);
      toast.success(`Rebased onto ${selectedBranch} successfully`);
      setSelectedBranch('');
      onOpenChange(false);
      onRebased();
    } catch (error) {
      const errorStr = String(error).toLowerCase();
      if (errorStr.includes('conflict') || errorStr.includes('merge conflict')) {
        toast.error('Rebase conflict! Please resolve conflicts and continue rebase.');
        onOpenChange(false);
        onRebased(); // Refresh to show conflicts
      } else {
        toast.error(`Rebase failed: ${error}`);
      }
    } finally {
      setIsRebasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Rebase {status?.branch ?? 'current branch'}
          </DialogTitle>
          <DialogDescription>
            Rebase your current branch onto another branch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status && status.ahead > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Warning: You have {status.ahead} unpushed commit(s).
                Rebasing will rewrite history. Force push will be required.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Rebase onto</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {availableBranches.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No branches available
                  </div>
                ) : (
                  availableBranches.map((branch) => (
                    <SelectItem
                      key={`${branch.remote_name ?? ''}-${branch.name}`}
                      value={branch.is_remote ? `${branch.remote_name}/${branch.name}` : branch.name}
                    >
                      {branch.is_remote
                        ? `${branch.remote_name}/${branch.name}`
                        : branch.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRebase}
            disabled={!selectedBranch || isRebasing}
            variant="destructive"
          >
            {isRebasing ? 'Rebasing...' : 'Rebase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
