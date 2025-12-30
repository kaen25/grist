# Phase 9: History & Log

## Objectif
Afficher l'historique des commits avec liste virtualisée.

---

## Tâche 9.1: Parser git log (backend)

**Commit**: `feat: add git log parser`

**Fichiers**:
- `src-tauri/src/git/log.rs`
- `src-tauri/src/git/mod.rs` (mise à jour)

**Actions**:
- [ ] Créer `src-tauri/src/git/log.rs`:
```rust
use crate::git::error::GitError;
use crate::git::executor::GitExecutor;
use crate::git::types::Commit;

const LOG_FORMAT: &str = "%H%x00%h%x00%an%x00%ae%x00%aI%x00%at%x00%s%x00%b%x00%P%x00%D%x00---END---";

pub fn get_commit_log(
    executor: &GitExecutor,
    count: u32,
    skip: u32,
) -> Result<Vec<Commit>, GitError> {
    let output = executor.execute_checked(&[
        "log",
        &format!("--format={}", LOG_FORMAT),
        "-n",
        &count.to_string(),
        "--skip",
        &skip.to_string(),
    ])?;

    parse_log(&output)
}

fn parse_log(output: &str) -> Result<Vec<Commit>, GitError> {
    let mut commits = Vec::new();

    for entry in output.split("---END---").filter(|s| !s.trim().is_empty()) {
        let parts: Vec<&str> = entry.trim().split('\0').collect();
        if parts.len() < 10 {
            continue;
        }

        let parent_hashes: Vec<String> = parts[8]
            .split_whitespace()
            .map(|s| s.to_string())
            .collect();

        let refs: Vec<String> = parts[9]
            .split(", ")
            .filter(|s| !s.is_empty())
            .map(|s| s.trim().to_string())
            .collect();

        commits.push(Commit {
            hash: parts[0].to_string(),
            short_hash: parts[1].to_string(),
            author_name: parts[2].to_string(),
            author_email: parts[3].to_string(),
            date: parts[4].to_string(),
            timestamp: parts[5].parse().unwrap_or(0),
            subject: parts[6].to_string(),
            body: parts[7].to_string(),
            parent_hashes,
            refs,
        });
    }

    Ok(commits)
}
```
- [ ] Ajouter `pub mod log;` dans `src-tauri/src/git/mod.rs`

---

## Tâche 9.2: Commande get_commit_log

**Commit**: `feat: add get_commit_log command`

**Fichiers**:
- `src-tauri/src/commands/log.rs`
- `src-tauri/src/commands/mod.rs` (mise à jour)
- `src-tauri/src/lib.rs` (mise à jour)

**Actions**:
- [ ] Créer `src-tauri/src/commands/log.rs`:
```rust
use crate::git::{executor::GitExecutor, log, types::Commit};

#[tauri::command]
pub async fn get_commit_log(
    repo_path: String,
    count: u32,
    skip: u32,
) -> Result<Vec<Commit>, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    log::get_commit_log(&executor, count, skip).map_err(|e| e.to_string())
}
```
- [ ] Ajouter `pub mod log;` dans `src-tauri/src/commands/mod.rs`
- [ ] Ajouter la commande au `generate_handler![]`
- [ ] Ajouter dans `src/services/git/index.ts`:
```typescript
async getCommitLog(count: number = 100, skip: number = 0): Promise<Commit[]> {
  return invoke('get_commit_log', {
    repoPath: this.repoPath,
    count,
    skip
  });
}
```

---

## Tâche 9.3: Créer HistoryView

**Commit**: `feat: add HistoryView component`

**Fichiers**:
- `src/components/history/HistoryView.tsx`
- `src/components/history/index.ts`

**Actions**:
- [ ] Créer le dossier `src/components/history/`
- [ ] Créer `src/components/history/HistoryView.tsx`:
```typescript
import { useState, useEffect } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { CommitList } from './CommitList';
import { CommitDetails } from './CommitDetails';
import { useRepositoryStore, useUIStore } from '@/store';
import { GitService } from '@/services/git';
import type { Commit } from '@/types/git';

export function HistoryView() {
  const { currentRepo, commits, setCommits } = useRepositoryStore();
  const { selectedCommit, setSelectedCommit } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    async function loadCommits() {
      if (!currentRepo) return;

      setIsLoading(true);
      try {
        const git = new GitService(currentRepo.path);
        const loadedCommits = await git.getCommitLog(100, 0);
        setCommits(loadedCommits);
        setHasMore(loadedCommits.length === 100);
      } catch (error) {
        console.error('Failed to load commits:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCommits();
  }, [currentRepo, setCommits]);

  const loadMore = async () => {
    if (!currentRepo || isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const git = new GitService(currentRepo.path);
      const moreCommits = await git.getCommitLog(100, commits.length);
      setCommits([...commits, ...moreCommits]);
      setHasMore(moreCommits.length === 100);
    } catch (error) {
      console.error('Failed to load more commits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selected = commits.find((c) => c.hash === selectedCommit) ?? null;

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={50} minSize={30}>
        <CommitList
          commits={commits}
          selectedHash={selectedCommit}
          onSelect={setSelectedCommit}
          onLoadMore={loadMore}
          isLoading={isLoading}
          hasMore={hasMore}
        />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={50}>
        {selected ? (
          <CommitDetails commit={selected} />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Select a commit to view details
          </div>
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
```
- [ ] Créer `src/components/history/index.ts`:
```typescript
export { HistoryView } from './HistoryView';
export { CommitList } from './CommitList';
export { CommitItem } from './CommitItem';
export { CommitDetails } from './CommitDetails';
```

---

## Tâche 9.4: Créer CommitList virtualisé

**Commit**: `feat: add virtualized CommitList`

**Fichiers**:
- `src/components/history/CommitList.tsx`
- `src/components/history/CommitItem.tsx`

**Actions**:
- [ ] Créer `src/components/history/CommitList.tsx`:
```typescript
import { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CommitItem } from './CommitItem';
import type { Commit } from '@/types/git';

interface CommitListProps {
  commits: Commit[];
  selectedHash: string | null;
  onSelect: (hash: string | null) => void;
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
}

const ROW_HEIGHT = 60;

export function CommitList({
  commits,
  selectedHash,
  onSelect,
  onLoadMore,
  isLoading,
  hasMore,
}: CommitListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: commits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  // Load more when scrolling near the end
  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;

    if (
      lastItem.index >= commits.length - 10 &&
      hasMore &&
      !isLoading
    ) {
      onLoadMore();
    }
  }, [virtualizer.getVirtualItems(), commits.length, hasMore, isLoading, onLoadMore]);

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const commit = commits[virtualRow.index];
          return (
            <div
              key={commit.hash}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <CommitItem
                commit={commit}
                isSelected={commit.hash === selectedHash}
                onSelect={() => onSelect(commit.hash)}
              />
            </div>
          );
        })}
      </div>
      {isLoading && (
        <div className="text-center py-2 text-sm text-muted-foreground">
          Loading more commits...
        </div>
      )}
    </div>
  );
}
```
- [ ] Créer `src/components/history/CommitItem.tsx`:
```typescript
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Commit } from '@/types/git';

interface CommitItemProps {
  commit: Commit;
  isSelected: boolean;
  onSelect: () => void;
}

export function CommitItem({ commit, isSelected, onSelect }: CommitItemProps) {
  const timeAgo = formatDistanceToNow(new Date(commit.date), { addSuffix: true });

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-2 border-b hover:bg-accent/50 transition-colors',
        isSelected && 'bg-accent'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-foreground">
              {commit.short_hash}
            </span>
            {commit.refs.length > 0 && (
              <div className="flex gap-1">
                {commit.refs.slice(0, 2).map((ref) => (
                  <Badge key={ref} variant="secondary" className="text-xs">
                    {ref.replace('HEAD -> ', '')}
                  </Badge>
                ))}
                {commit.refs.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{commit.refs.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="font-medium truncate">{commit.subject}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {commit.author_name} • {timeAgo}
          </div>
        </div>
      </div>
    </button>
  );
}
```

---

## Tâche 9.5: Créer CommitDetails

**Commit**: `feat: add CommitDetails component`

**Fichiers**:
- `src/components/history/CommitDetails.tsx`

**Actions**:
- [ ] Créer `src/components/history/CommitDetails.tsx`:
```typescript
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DiffViewer } from '@/components/diff';
import { useRepositoryStore } from '@/store';
import { GitService } from '@/services/git';
import type { Commit, FileDiff } from '@/types/git';

interface CommitDetailsProps {
  commit: Commit;
}

export function CommitDetails({ commit }: CommitDetailsProps) {
  const { currentRepo } = useRepositoryStore();
  const [copied, setCopied] = useState(false);
  const [files, setFiles] = useState<FileDiff[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    async function loadDiff() {
      if (!currentRepo) return;

      try {
        const git = new GitService(currentRepo.path);
        const diffs = await git.getCommitDiff(commit.hash);
        setFiles(diffs);
        if (diffs.length > 0) {
          setSelectedFile(diffs[0].new_path);
        }
      } catch (error) {
        console.error('Failed to load commit diff:', error);
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
      <ScrollArea className="flex-none max-h-48 p-4">
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
          <div className="text-sm text-muted-foreground">
            <div>{commit.author_name} &lt;{commit.author_email}&gt;</div>
            <div>{formattedDate}</div>
          </div>
        </div>
      </ScrollArea>

      <Separator />

      {/* Files changed */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* File list */}
          <div className="w-48 border-r">
            <ScrollArea className="h-full">
              <div className="p-2">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Files changed ({files.length})
                </h4>
                {files.map((file) => (
                  <button
                    key={file.new_path}
                    onClick={() => setSelectedFile(file.new_path)}
                    className={cn(
                      'w-full text-left text-xs p-1 rounded truncate',
                      selectedFile === file.new_path
                        ? 'bg-accent'
                        : 'hover:bg-accent/50'
                    )}
                  >
                    {file.new_path.split('/').pop()}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Diff viewer */}
          <div className="flex-1">
            {selectedFile && (
              <DiffViewer path={selectedFile} commitHash={commit.hash} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
```
- [ ] Mettre à jour `src/App.tsx` pour utiliser `HistoryView`:
```typescript
import { HistoryView } from '@/components/history';

case 'history':
  return <HistoryView />;
```

---

## Progression: 0/5
