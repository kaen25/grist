import { useState, useEffect } from 'react';
import { AlignJustify, Columns } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DiffHeader } from './DiffHeader';
import { UnifiedDiff } from './UnifiedDiff';
import { SideBySideDiff } from './SideBySideDiff';
import { useUIStore, useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import type { FileDiff } from '@/domain/value-objects';

interface DiffViewerProps {
  path: string;
  staged?: boolean;
  commitHash?: string;
}

export function DiffViewer({ path, staged = false, commitHash }: DiffViewerProps) {
  const { diffMode, setDiffMode } = useUIStore();
  const { currentRepo } = useRepositoryStore();
  const [diff, setDiff] = useState<FileDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDiff() {
      if (!currentRepo) return;

      setLoading(true);
      setError(null);

      try {
        if (commitHash) {
          const diffs = await tauriGitService.getCommitDiff(currentRepo.path, commitHash);
          const fileDiff = diffs.find((d) => d.new_path === path);
          setDiff(fileDiff ?? null);
        } else {
          const fileDiff = await tauriGitService.getFileDiff(currentRepo.path, path, staged);
          setDiff(fileDiff);
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchDiff();
  }, [path, staged, commitHash, currentRepo]);

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-destructive">
        Error loading diff: {error}
      </div>
    );
  }

  if (!diff || diff.hunks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No changes to display
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <DiffHeader diff={diff}>
        <div className="flex items-center gap-1">
          <Button
            variant={diffMode === 'unified' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setDiffMode('unified')}
            title="Unified view"
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
          <Button
            variant={diffMode === 'split' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setDiffMode('split')}
            title="Side-by-side view"
          >
            <Columns className="h-4 w-4" />
          </Button>
        </div>
      </DiffHeader>

      <div className="flex-1 overflow-auto font-mono text-sm">
        {diffMode === 'unified' ? (
          <UnifiedDiff hunks={diff.hunks} />
        ) : (
          <SideBySideDiff hunks={diff.hunks} />
        )}
      </div>
    </div>
  );
}
