import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import { toast } from 'sonner';

interface AddRemoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function AddRemoteDialog({ open, onOpenChange, onCreated }: AddRemoteDialogProps) {
  const { currentRepo } = useRepositoryStore();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRepo || !name.trim() || !url.trim()) return;

    setIsSubmitting(true);
    try {
      await tauriGitService.addRemote(currentRepo.path, name.trim(), url.trim());
      toast.success(`Remote "${name}" added`);
      setName('');
      setUrl('');
      onOpenChange(false);
      onCreated();
    } catch (error) {
      toast.error(`Failed to add remote: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName('');
      setUrl('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Remote</DialogTitle>
          <DialogDescription>
            Add a new remote repository to sync with
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="remote-name">Name</Label>
              <Input
                id="remote-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="origin"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remote-url">URL</Label>
              <Input
                id="remote-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
              />
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
              disabled={!name.trim() || !url.trim() || isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Remote'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
