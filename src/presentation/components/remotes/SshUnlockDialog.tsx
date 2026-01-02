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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { tauriGitService } from '@/infrastructure/services';
import { toast } from 'sonner';
import { Key, Loader2 } from 'lucide-react';

interface SshUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyPath: string;
  onUnlocked?: () => void;
  onCancelled?: () => void;
}

export function SshUnlockDialog({
  open,
  onOpenChange,
  keyPath,
  onUnlocked,
  onCancelled,
}: SshUnlockDialogProps) {
  const [passphrase, setPassphrase] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPassphrase('');
      setError(null);
    }
  }, [open]);

  const handleUnlock = async () => {
    if (!passphrase) return;

    setIsUnlocking(true);
    setError(null);

    try {
      await tauriGitService.sshKeyUnlock(keyPath, passphrase);
      toast.success('SSH key unlocked');
      onOpenChange(false);
      onUnlocked?.();
    } catch (err) {
      const errMsg = String(err);
      if (errMsg.includes('Invalid passphrase')) {
        setError('Invalid passphrase');
      } else {
        setError(errMsg);
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    onCancelled?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && passphrase && !isUnlocking) {
      handleUnlock();
    }
  };

  const keyName = keyPath.split('/').pop() || keyPath;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Unlock SSH Key
          </DialogTitle>
          <DialogDescription>
            Enter the passphrase to unlock the SSH key
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Key</Label>
            <div className="text-sm font-mono bg-muted p-2 rounded truncate">
              {keyName}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unlock-passphrase">Passphrase</Label>
            <Input
              id="unlock-passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => {
                setPassphrase(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter passphrase"
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUnlock}
            disabled={isUnlocking || !passphrase}
          >
            {isUnlocking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Unlocking...
              </>
            ) : (
              'Unlock'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper to check if an error indicates a locked SSH key
export function isSshKeyLockedError(error: unknown): string | null {
  const errStr = String(error);
  const prefix = 'SSH_KEY_LOCKED:';
  if (errStr.includes(prefix)) {
    const startIdx = errStr.indexOf(prefix) + prefix.length;
    return errStr.slice(startIdx).trim();
  }
  return null;
}
