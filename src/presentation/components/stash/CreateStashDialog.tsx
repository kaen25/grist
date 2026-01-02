import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Archive, Loader2 } from 'lucide-react';

interface CreateStashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateStashDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateStashDialogProps) {
  const { currentRepo } = useRepositoryStore();
  const [message, setMessage] = useState('');
  const [includeUntracked, setIncludeUntracked] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setMessage('');
      setIncludeUntracked(false);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!currentRepo) return;

    setIsCreating(true);
    try {
      await tauriGitService.createStash(
        currentRepo.path,
        message || undefined,
        includeUntracked
      );
      toast.success('Changes stashed');
      onOpenChange(false);
      onCreated();
    } catch (error) {
      const errStr = String(error);
      if (errStr.includes('No local changes to save')) {
        toast.error('No changes to stash');
      } else {
        toast.error(`Failed to create stash: ${error}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating) {
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Stash Changes
          </DialogTitle>
          <DialogDescription>
            Save your uncommitted changes temporarily
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="stash-message">Message (optional)</Label>
            <Input
              id="stash-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="WIP: describe your changes..."
              disabled={isCreating}
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="include-untracked"
              checked={includeUntracked}
              onCheckedChange={(checked) => setIncludeUntracked(checked === true)}
              disabled={isCreating}
            />
            <Label htmlFor="include-untracked" className="cursor-pointer text-sm">
              Include untracked files
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Stashing...
              </>
            ) : (
              'Stash'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
