import { useState, useEffect, useCallback, useMemo } from 'react';
import { AlignJustify, Columns, Plus, Minus, Settings2, WrapText, Eye, Image as ImageIcon } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
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
import { IMAGE_EXTENSIONS } from '@/settings';

interface DiffViewerProps {
  path: string;
  staged?: boolean;
  untracked?: boolean;
  onlyEolChanges?: boolean;
  commitHash?: string;
  stashIndex?: number;
}

export function DiffViewer({ path, staged = false, untracked = false, onlyEolChanges = false, commitHash, stashIndex }: DiffViewerProps) {
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

  // Check if file is an image
  const isImage = useMemo(() => {
    const ext = path.toLowerCase().substring(path.lastIndexOf('.'));
    return IMAGE_EXTENSIONS.includes(ext);
  }, [path]);

  // Get image source URL for working tree files
  const workingTreeImageSrc = useMemo(() => {
    if (!isImage || !currentRepo || commitHash) return null;
    // For working tree files, we can display the current version
    const fullPath = `${currentRepo.path}/${path}`;
    return convertFileSrc(fullPath);
  }, [isImage, currentRepo, path, commitHash]);

  // For commit images, load as base64
  const [commitImageSrc, setCommitImageSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!isImage || !currentRepo || !commitHash) {
      setCommitImageSrc(null);
      return;
    }

    async function loadCommitImage() {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const base64: string = await invoke('get_blob_base64', {
          repoPath: currentRepo!.path,
          commitHash,
          filePath: path,
        });
        // Determine MIME type from extension
        const ext = path.toLowerCase().substring(path.lastIndexOf('.') + 1);
        const mimeTypes: Record<string, string> = {
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          gif: 'image/gif',
          svg: 'image/svg+xml',
          webp: 'image/webp',
          avif: 'image/avif',
          ico: 'image/x-icon',
          bmp: 'image/bmp',
          tiff: 'image/tiff',
          tif: 'image/tiff',
        };
        const mime = mimeTypes[ext] || 'application/octet-stream';
        setCommitImageSrc(`data:${mime};base64,${base64}`);
      } catch (err) {
        console.error('Failed to load commit image:', err);
        setCommitImageSrc(null);
      }
    }

    loadCommitImage();
  }, [isImage, currentRepo, commitHash, path]);

  const imageSrc = workingTreeImageSrc || commitImageSrc;

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
        if (stashIndex !== undefined) {
          const diffs = await tauriGitService.getStashDiff(currentRepo.path, stashIndex);
          const fileDiff = diffs.find((d) => d.new_path === path);
          setDiff(fileDiff ?? null);
        } else if (commitHash) {
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
  }, [path, staged, untracked, onlyEolChanges, commitHash, stashIndex, currentRepo]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Handle binary files (including images)
  if (diff?.is_binary) {
    return (
      <div className="flex h-full flex-col">
        <DiffHeader diff={diff}>
          <div />
        </DiffHeader>
        <div className="flex-1 flex items-center justify-center p-4">
          {isImage && imageSrc ? (
            <div className="text-center space-y-4">
              <img
                src={imageSrc}
                alt={path}
                className="max-w-full max-h-[60vh] object-contain rounded border"
              />
              <p className="text-sm text-muted-foreground">{path}</p>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Binary file</p>
              <p className="text-sm">{path}</p>
            </div>
          )}
        </div>
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
