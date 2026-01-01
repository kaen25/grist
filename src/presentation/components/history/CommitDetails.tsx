import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DiffViewer } from '../diff';
import { GravatarAvatar } from '../common';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import { cn } from '@/lib/utils';
import type { Commit } from '@/domain/entities';
import type { FileDiff } from '@/domain/value-objects';

interface CommitDetailsProps {
  commit: Commit;
}

export function CommitDetails({ commit }: CommitDetailsProps) {
  const { currentRepo } = useRepositoryStore();
  const [copied, setCopied] = useState(false);
  const [files, setFiles] = useState<FileDiff[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDiff() {
      if (!currentRepo) return;

      setLoading(true);
      try {
        const diffs = await tauriGitService.getCommitDiff(currentRepo.path, commit.hash);
        setFiles(diffs);
        if (diffs.length > 0) {
          setSelectedFile(diffs[0].new_path);
        } else {
          setSelectedFile(null);
        }
      } catch (error) {
        console.error('Failed to load commit diff:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDiff();
  }, [commit.hash, currentRepo]);

  const handleCopyHash = async () => {
    await navigator.clipboard.writeText(commit.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = format(new Date(commit.date), 'PPpp');

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-none max-h-48 p-4 border-b">
        <div className="space-y-3">
          {/* Hash */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">{commit.hash}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCopyHash}
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>

          {/* Refs */}
          {commit.refs.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {commit.refs.map((ref) => (
                <Badge key={ref} variant="secondary">
                  {ref}
                </Badge>
              ))}
            </div>
          )}

          {/* Subject and body */}
          <div>
            <h3 className="font-semibold">{commit.subject}</h3>
            {commit.body && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {commit.body}
              </p>
            )}
          </div>

          {/* Author and date */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <GravatarAvatar
              email={commit.author_email}
              name={commit.author_name}
              size={32}
              fallback="identicon"
            />
            <div>
              <div className="text-foreground font-medium">{commit.author_name}</div>
              <div>{formattedDate}</div>
            </div>
          </div>

          {/* Parent commits */}
          {commit.parent_hashes.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Parents: </span>
              {commit.parent_hashes.map((hash, i) => (
                <span key={hash}>
                  {i > 0 && ', '}
                  <span className="font-mono">{hash.substring(0, 7)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Files changed */}
      <div className="flex-1 min-h-0 flex">
        {/* File list */}
        <div className="w-56 border-r flex flex-col">
          <div className="px-3 py-2 border-b flex-shrink-0">
            <h4 className="text-xs font-medium text-muted-foreground">
              Files changed ({files.length})
            </h4>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
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
        </div>

        {/* Diff viewer */}
        <div className="flex-1">
          {selectedFile ? (
            <DiffViewer path={selectedFile} commitHash={commit.hash} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              Select a file to view diff
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
