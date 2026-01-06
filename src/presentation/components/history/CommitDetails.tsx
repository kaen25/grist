import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DiffViewer } from '../diff';
import { GravatarAvatar, CommitHashLink } from '../common';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import { cleanRef, cn, isRemoteRef, isTagRef } from '@/lib/utils';
import type { Commit } from '@/domain/entities';
import type { FileDiff } from '@/domain/value-objects';
import { ButtonCopy } from '@/components/atom/button-copy';
import { Tag } from '@/components/atom/tag';

interface CommitDetailsProps {
  commit: Commit;
}

export function CommitDetails({ commit }: CommitDetailsProps) {
  const { currentRepo, commits } = useRepositoryStore();
  const [files, setFiles] = useState<FileDiff[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Compute children (commits that have this commit as a parent)
  const childHashes = useMemo(() => {
    return commits
      .filter((c) => c.parent_hashes.includes(commit.hash))
      .map((c) => c.hash);
  }, [commits, commit.hash]);

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

  const authorDate = format(new Date(commit.author_date), 'PPpp');
  const committerDate = format(new Date(commit.committer_date), 'PPpp');

  // Check if author and committer are different
  const isDifferentCommitter =
    commit.author_name !== commit.committer_name ||
    commit.author_email !== commit.committer_email;

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-none border-b">
        <div className="p-4">
          {/* Two-column responsive grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
            {/* Left: Commit Message */}
            <div className="min-w-0 flex flex-col gap-1">
              <h3 className="font-semibold text-base leading-tight">{commit.subject}</h3>
              <Separator />
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted/60 dark:bg-muted/20 rounded-xl px-4 py-1 leading-relaxed font-sans min-h-32 max-h-32 overflow-y-scroll flex-1">
              {commit.body ? commit.body : ''}
              </pre>
            </div>
            {/* Right: Meta info */}
            <div className="lg:w-80 lg:border-l lg:pl-4 space-y-2 text-sm">
              {/* SHA */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-20 shrink-0">SHA</span>
                <ButtonCopy textToCopy={commit.hash} />
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded truncate">
                  {commit.short_hash}
                </code>
              </div>

              {/* Parents */}
              {commit.parent_hashes.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-20 shrink-0">
                    {commit.parent_hashes.length > 1 ? 'Parents' : 'Parent'}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {commit.parent_hashes.map((hash) => (
                      <CommitHashLink key={hash} hash={hash} isCopyable={true} />
                    ))}
                  </div>
                </div>
              )}

              {/* Children */}
              {childHashes.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-20 shrink-0">
                    {childHashes.length > 1 ? 'Children' : 'Child'}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {childHashes.map((hash) => (
                      <CommitHashLink key={hash} hash={hash} isCopyable={true}  />
                    ))}
                  </div>
                </div>
              )}

              {/* Refs */}
              {commit.refs.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-20 shrink-0">Refs</span>
                  <div className="flex flex-wrap gap-1">
                    {commit.refs.map((ref) => {
                      const isTag = isTagRef(ref)
                      const isRemote = isRemoteRef(ref)
                      const label = cleanRef(ref)

                      let color = 'border-amber-500 text-amber-600'
                      if(!isTag && isRemote) {
                        color = 'border-red-500 text-red-600'
                      } else if (!isTag && !isRemote) {
                        color = 'border-green-500 text-green-600'
                      }

                      return (
                        <Tag
                          key={ref}
                          className={color}
                        >
                          {label}
                        </Tag>
                      );
                    })}
                  </div>
                </div>
              )}

              <Separator className="my-2" />

              {/* Author */}
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground w-20 shrink-0">Author</span>
                <div className="flex items-center gap-2 min-w-0">
                  <GravatarAvatar
                    email={commit.author_email}
                    name={commit.author_name}
                    size={20}
                    fallback="identicon"
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="truncate">
                      <span className="font-medium">{commit.author_name} &lt;<a href={`mailto:${commit.author_email}`}>{commit.author_email}</a>&gt;</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{authorDate}</div>
                  </div>
                </div>
              </div>

              {/* Committer (only show if different from author) */}
              {isDifferentCommitter && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-20 shrink-0">Committer</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <GravatarAvatar
                      email={commit.committer_email}
                      name={commit.committer_name}
                      size={20}
                      fallback="identicon"
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="truncate">
                        <span className="font-medium">{commit.committer_name} &lt;<a href={`mailto:${commit.committer_email}`}>{commit.committer_email}</a>&gt;</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{committerDate}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Show commit date if same person but different dates */}
              {!isDifferentCommitter && commit.author_date !== commit.committer_date && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20 hrink-0">Committed</span>
                  <span className="text-xs text-muted-foreground">{committerDate}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Files changed */}
      <div className="flex-1 min-h-0 flex">
        {/* File list */}
        <div className="w-56 border-r flex flex-col">
          <div className="px-3 py-2 border-b shrink-0">
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
