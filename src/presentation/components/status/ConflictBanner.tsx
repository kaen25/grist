import { useState } from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';
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
  const [isAborting, setIsAborting] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);

  if (!status || !status.conflicted || status.conflicted.length === 0) {
    return null;
  }

  // Check if all conflicts have been resolved (staged)
  const hasUnresolvedConflicts = status.conflicted.length > 0;

  const handleAbort = async () => {
    if (!currentRepo) return;
    setIsAborting(true);
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
    } finally {
      setIsAborting(false);
    }
  };

  const handleContinue = async () => {
    if (!currentRepo) return;
    setIsContinuing(true);
    try {
      // Try continue merge first (commit), then rebase
      try {
        await tauriGitService.continueMerge(currentRepo.path);
        toast.success('Merge completed');
      } catch {
        await tauriGitService.continueRebase(currentRepo.path);
        toast.success('Rebase continued');
      }
      onResolved?.();
    } catch (error) {
      toast.error(`Failed to continue: ${error}`);
    } finally {
      setIsContinuing(false);
    }
  };

  return (
    <Alert variant="destructive" className="m-2 shrink-0">
      <AlertTriangle className="h-4 w-4" />
      <div className="flex-1">
        <AlertTitle>Merge Conflict</AlertTitle>
        <AlertDescription>
          {status.conflicted.length} file(s) have conflicts.
          Resolve them and stage to continue.
        </AlertDescription>
      </div>
      <div className="flex items-center gap-2 ml-4 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handleContinue}
          disabled={hasUnresolvedConflicts || isContinuing || isAborting}
          title={hasUnresolvedConflicts ? 'Resolve all conflicts first' : 'Continue merge/rebase'}
        >
          <Check className="h-4 w-4 mr-1" />
          {isContinuing ? 'Continuing...' : 'Continue'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAbort}
          disabled={isAborting || isContinuing}
        >
          <X className="h-4 w-4 mr-1" />
          {isAborting ? 'Aborting...' : 'Abort'}
        </Button>
      </div>
    </Alert>
  );
}
