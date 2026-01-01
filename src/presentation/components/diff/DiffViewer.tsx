import { useState, useEffect, useCallback } from 'react';
import { AlignJustify, Columns, Plus, Minus, Settings2, WrapText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { DiffHeader } from './DiffHeader';
import { UnifiedDiff } from './UnifiedDiff';
import { SideBySideDiff } from './SideBySideDiff';
import { useUIStore, useRepositoryStore } from '@/application/stores';
import { useDiffLineSelection } from '@/application/hooks';
import { tauriGitService } from '@/infrastructure/services';
import type { FileDiff } from '@/domain/value-objects';

interface DiffViewerProps {
  path: string;
  staged?: boolean;
  untracked?: boolean;
  onlyEolChanges?: boolean;
  commitHash?: string;
}

export function DiffViewer({ path, staged = false, untracked = false, onlyEolChanges = false, commitHash }: DiffViewerProps) {
  const {
    diffMode,
    setDiffMode,
    diffWordWrap,
    toggleDiffWordWrap,
    diffShowWhitespace,
    toggleDiffShowWhitespace,
  } = useUIStore();
  const { currentRepo } = useRepositoryStore();
  const [diff, setDiff] = useState<FileDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lineSelection = useDiffLineSelection();

  // All hooks must be called before any conditional returns
  const handleStageSelectedLines = useCallback(async () => {
    if (!currentRepo || !diff) return;
    const selectedKeys = lineSelection.getSelectedLines();
    if (selectedKeys.length === 0) return;

    try {
      const lineIndicesByHunk: Record<number, number[]> = {};
      for (const key of selectedKeys) {
        if (!lineIndicesByHunk[key.hunkIndex]) {
          lineIndicesByHunk[key.hunkIndex] = [];
        }
        lineIndicesByHunk[key.hunkIndex].push(key.lineIndex);
      }

      await tauriGitService.stageLines(currentRepo.path, path, lineIndicesByHunk);
      lineSelection.clearSelection();
      const fileDiff = await tauriGitService.getFileDiff(currentRepo.path, path, staged);
      setDiff(fileDiff);
    } catch (err) {
      setError(String(err));
    }
  }, [currentRepo, diff, path, staged, lineSelection]);

  const handleUnstageSelectedLines = useCallback(async () => {
    if (!currentRepo || !diff) return;
    const selectedKeys = lineSelection.getSelectedLines();
    if (selectedKeys.length === 0) return;

    try {
      const lineIndicesByHunk: Record<number, number[]> = {};
      for (const key of selectedKeys) {
        if (!lineIndicesByHunk[key.hunkIndex]) {
          lineIndicesByHunk[key.hunkIndex] = [];
        }
        lineIndicesByHunk[key.hunkIndex].push(key.lineIndex);
      }

      await tauriGitService.unstageLines(currentRepo.path, path, lineIndicesByHunk);
      lineSelection.clearSelection();
      const fileDiff = await tauriGitService.getFileDiff(currentRepo.path, path, staged);
      setDiff(fileDiff);
    } catch (err) {
      setError(String(err));
    }
  }, [currentRepo, diff, path, staged, lineSelection]);

  useEffect(() => {
    async function fetchDiff() {
      if (!currentRepo) return;

      setLoading(true);
      setError(null);
      lineSelection.clearSelection();

      try {
        if (commitHash) {
          const diffs = await tauriGitService.getCommitDiff(currentRepo.path, commitHash);
          const fileDiff = diffs.find((d) => d.new_path === path);
          setDiff(fileDiff ?? null);
        } else if (untracked) {
          const fileDiff = await tauriGitService.getUntrackedFileDiff(currentRepo.path, path);
          setDiff(fileDiff);
        } else {
          // Don't ignore CR for EOL-only files so we can see the changes
          const ignoreCr = !onlyEolChanges;
          const fileDiff = await tauriGitService.getFileDiff(currentRepo.path, path, staged, ignoreCr);
          setDiff(fileDiff);
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchDiff();
  }, [path, staged, untracked, onlyEolChanges, commitHash, currentRepo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Conditional returns after all hooks
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

  const selectedCount = lineSelection.selectedCount;

  return (
    <div className="flex h-full flex-col">
      <DiffHeader diff={diff}>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && !staged && (
            <Button
              variant="default"
              size="sm"
              onClick={handleStageSelectedLines}
              title={`Stage ${selectedCount} selected line(s)`}
            >
              <Plus className="h-4 w-4 mr-1" />
              Stage {selectedCount} lines
            </Button>
          )}
          {selectedCount > 0 && staged && (
            <Button
              variant="default"
              size="sm"
              onClick={handleUnstageSelectedLines}
              title={`Unstage ${selectedCount} selected line(s)`}
            >
              <Minus className="h-4 w-4 mr-1" />
              Unstage {selectedCount} lines
            </Button>
          )}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" title="Diff options">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Display options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={diffWordWrap}
                  onCheckedChange={toggleDiffWordWrap}
                >
                  <WrapText className="mr-2 h-4 w-4" />
                  Word wrap
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={diffShowWhitespace}
                  onCheckedChange={toggleDiffShowWhitespace}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Show whitespace
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </DiffHeader>

      <div className="flex-1 overflow-auto font-mono text-sm">
        {diffMode === 'unified' ? (
          <UnifiedDiff
            hunks={diff.hunks}
            lineSelection={lineSelection}
            wordWrap={diffWordWrap}
            showWhitespace={diffShowWhitespace}
          />
        ) : (
          <SideBySideDiff
            hunks={diff.hunks}
            lineSelection={lineSelection}
            wordWrap={diffWordWrap}
            showWhitespace={diffShowWhitespace}
          />
        )}
      </div>
    </div>
  );
}
