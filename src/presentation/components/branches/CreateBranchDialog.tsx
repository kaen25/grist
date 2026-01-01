import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import { toast } from 'sonner';

interface CreateBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateBranchDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateBranchDialogProps) {
  const { currentRepo } = useRepositoryStore();
  const [name, setName] = useState('');
  const [checkoutAfter, setCheckoutAfter] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!currentRepo || !name.trim()) return;

    setIsCreating(true);
    try {
      await tauriGitService.createBranch(currentRepo.path, name.trim());

      if (checkoutAfter) {
        await tauriGitService.checkoutBranch(currentRepo.path, name.trim());
      }

      toast.success(`Created branch ${name}`);
      setName('');
      onOpenChange(false);
      onCreated();
    } catch (error) {
      toast.error(`Failed to create branch: ${error}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim() && !isCreating) {
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Branch</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="branch-name">Branch Name</Label>
            <Input
              id="branch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="feature/my-feature"
              disabled={isCreating}
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="checkout-after"
              checked={checkoutAfter}
              onCheckedChange={(checked) => setCheckoutAfter(checked === true)}
              disabled={isCreating}
            />
            <Label htmlFor="checkout-after" className="cursor-pointer">
              Checkout after creation
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
