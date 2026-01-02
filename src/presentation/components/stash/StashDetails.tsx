import { useState, useEffect } from 'react';
import { Archive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DiffViewer } from '../diff';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import { cn } from '@/lib/utils';
import type { Stash } from '@/domain/entities';
import type { FileDiff } from '@/domain/value-objects';

interface StashDetailsProps {
  stash: Stash;
}

export function StashDetails({ stash }: StashDetailsProps) {
  const { currentRepo } = useRepositoryStore();
  const [files, setFiles] = useState<FileDiff[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDiff() {
      if (!currentRepo) return;

      setLoading(true);
      try {
        const diffs = await tauriGitService.getStashDiff(currentRepo.path, stash.index);
        setFiles(diffs);
        if (diffs.length > 0) {
          setSelectedFile(diffs[0].new_path);
        } else {
          setSelectedFile(null);
        }
      } catch (error) {
        console.error('Failed to load stash diff:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDiff();
  }, [stash.index, currentRepo]);

  // Format the date if available
  const formatDate = (dateStr: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Stash header */}
      <div className="flex-none border-b p-4">
        <div className="flex items-center gap-3">
          <Archive className="h-5 w-5 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                stash@{`{${stash.index}}`}
              </code>
              {stash.branch && (
                <Badge variant="outline" className="text-xs">
                  {stash.branch}
                </Badge>
              )}
              {stash.date && (
                <span className="text-xs text-muted-foreground">
                  {formatDate(stash.date)}
                </span>
              )}
            </div>
            <div className="font-medium mt-1">{stash.message || 'WIP'}</div>
          </div>
        </div>
      </div>

      {/* Files changed */}
      <div className="flex-1 min-h-0 flex">
        {/* File list */}
        <div className="w-56 border-r flex flex-col">
          <div className="px-3 py-2 border-b flex-shrink-0">
            <h4 className="text-xs font-medium text-muted-foreground">
              Files changed ({files.length})
            </h4>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {loading ? (
                <div className="text-xs text-muted-foreground px-2">Loading...</div>
              ) : files.length === 0 ? (
                <div className="text-xs text-muted-foreground px-2">No files changed</div>
              ) : (
                files.map((file) => (
                  <button
                    key={file.new_path}
                    onClick={() => setSelectedFile(file.new_path)}
                    className={cn(
                      'w-full text-left text-xs px-2 py-1 rounded truncate',
                      selectedFile === file.new_path
                        ? 'bg-accent'
                        : 'hover:bg-accent/50'
                    )}
                    title={file.new_path}
                  >
                    {file.new_path.split('/').pop()}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Diff viewer */}
        <div className="flex-1">
          {selectedFile ? (
            <DiffViewer path={selectedFile} stashIndex={stash.index} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              {loading ? 'Loading...' : 'Select a file to view diff'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
