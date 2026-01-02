import { useState } from 'react';
import { GitMerge } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { tauriGitService } from '@/infrastructure/services';
import { toast } from 'sonner';

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMerged: () => void;
}

export function MergeDialog({ open, onOpenChange, onMerged }: MergeDialogProps) {
  const { currentRepo, branches, status } = useRepositoryStore();
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [noFf, setNoFf] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  const availableBranches = branches.filter(
    (b) => !b.is_current && !b.is_remote
  );

  const handleMerge = async () => {
    if (!currentRepo || !selectedBranch) return;

    setIsMerging(true);
    try {
      await tauriGitService.mergeBranch(currentRepo.path, selectedBranch, noFf);
      toast.success(`Merged ${selectedBranch} successfully`);
      setSelectedBranch('');
      onOpenChange(false);
      onMerged();
    } catch (error) {
      const errorStr = String(error).toLowerCase();
      if (errorStr.includes('conflict') || errorStr.includes('merge conflict')) {
        toast.error('Merge conflict! Please resolve conflicts and commit.');
        onOpenChange(false);
        onMerged(); // Refresh to show conflicts
      } else {
        toast.error(`Merge failed: ${error}`);
      }
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Merge into {status?.branch ?? 'current branch'}
          </DialogTitle>
          <DialogDescription>
            Select a branch to merge into your current branch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Branch to merge</Label>
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
                    <SelectItem key={branch.name} value={branch.name}>
                      {branch.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="no-ff"
              checked={noFf}
              onCheckedChange={(checked) => setNoFf(checked === true)}
            />
            <Label htmlFor="no-ff" className="cursor-pointer">
              Create merge commit (--no-ff)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleMerge}
            disabled={!selectedBranch || isMerging}
          >
            {isMerging ? 'Merging...' : 'Merge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
