import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import { toast } from 'sonner';

interface ConflictBannerProps {
  onResolved?: () => void;
}

export function ConflictBanner({ onResolved }: ConflictBannerProps) {
  const { currentRepo, status } = useRepositoryStore();

  if (!status || !status.conflicted || status.conflicted.length === 0) {
    return null;
  }

  const handleAbort = async () => {
    if (!currentRepo) return;
    try {
      // Try abort merge first, then rebase
      try {
        await tauriGitService.abortMerge(currentRepo.path);
        toast.success('Merge aborted');
      } catch {
        await tauriGitService.abortRebase(currentRepo.path);
        toast.success('Rebase aborted');
      }
      onResolved?.();
    } catch (error) {
      toast.error(`Failed to abort: ${error}`);
    }
  };

  return (
    <Alert variant="destructive" className="m-2 flex-shrink-0">
      <AlertTriangle className="h-4 w-4" />
      <div className="flex-1">
        <AlertTitle>Merge Conflict</AlertTitle>
        <AlertDescription>
          {status.conflicted.length} file(s) have conflicts.
          Resolve them and stage to continue.
        </AlertDescription>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleAbort}
        className="ml-4 flex-shrink-0"
      >
        <X className="h-4 w-4 mr-1" />
        Abort
      </Button>
    </Alert>
  );
}
