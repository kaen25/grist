# Phase 5: Git Status

## Objectif
Afficher l'état des fichiers (staged, unstaged, untracked).

---

## Architecture DDD

### Aggregate: WorkingTree

**Root:** `GitStatus` (représente l'état complet du working tree)

**Entités enfants:** `StatusEntry` (fichiers)

**Invariants:**
- Les fichiers staged ne peuvent pas être simultanément untracked
- Les fichiers conflicted sont prioritaires sur les autres statuts
- Un fichier ne peut avoir qu'un seul statut par zone (index/worktree)

### Entities (utilisées)

| Entity | Fichier | Description |
|--------|---------|-------------|
| `StatusEntry` | `status-entry.entity.ts` | Fichier avec ses statuts index/worktree |

### Value Objects (utilisés)

| Value Object | Fichier | Description |
|--------------|---------|-------------|
| `GitStatus` | `git-status.vo.ts` | État complet du working tree |
| `FileStatus` | `file-status.vo.ts` | Enum des états de fichier |
| `BranchRef` | `branch-ref.vo.ts` | Référence de branche (nouveau) |

```typescript
// src/domain/value-objects/branch-ref.vo.ts
export interface BranchRef {
  readonly name: string | null;  // null si detached HEAD
  readonly upstream: string | null;
  readonly ahead: number;
  readonly behind: number;
}
```

### Domain Events (src/domain/events/)

| Event | Fichier | Payload |
|-------|---------|---------|
| `StatusRefreshed` | `status-refreshed.event.ts` | `{ status: GitStatus, timestamp: Date }` |
| `FileStatusChanged` | `file-status-changed.event.ts` | `{ path: string, oldStatus: FileStatus, newStatus: FileStatus }` |

### Domain Services (src/domain/services/)

```typescript
// src/domain/services/status-classifier.service.ts
import type { FileStatus } from '@/domain/value-objects';

export const StatusClassifier = {
  getIcon(status: FileStatus): string {
    if (status === 'Added' || status === 'Untracked') return 'FilePlus';
    if (status === 'Deleted') return 'FileMinus';
    if (status === 'Modified') return 'FileText';
    if (status === 'Conflicted') return 'FileQuestion';
    return 'File';
  },

  getColor(status: FileStatus): string {
    if (status === 'Added' || status === 'Untracked') return 'text-green-500';
    if (status === 'Deleted') return 'text-red-500';
    if (status === 'Modified') return 'text-yellow-500';
    if (status === 'Conflicted') return 'text-orange-500';
    return 'text-muted-foreground';
  },

  getLabel(status: FileStatus): string {
    if (typeof status === 'object') {
      if ('Renamed' in status) return 'R';
      if ('Copied' in status) return 'C';
    }
    const labels: Record<string, string> = {
      Modified: 'M', Added: 'A', Deleted: 'D',
      Untracked: '?', Conflicted: '!',
    };
    return labels[status as string] ?? '';
  },
};
```

### Repository Interface (src/domain/interfaces/)

```typescript
// src/domain/interfaces/status.repository.ts
import type { GitStatus } from '@/domain/value-objects';

export interface IStatusRepository {
  getStatus(repoPath: string): Promise<GitStatus>;
}
```

### Infrastructure (src/infrastructure/repositories/)

```typescript
// src/infrastructure/repositories/tauri-status.repository.ts
import { invoke } from '@tauri-apps/api/core';
import type { IStatusRepository } from '@/domain/interfaces';
import type { GitStatus } from '@/domain/value-objects';

export class TauriStatusRepository implements IStatusRepository {
  async getStatus(repoPath: string): Promise<GitStatus> {
    return invoke('get_git_status', { repoPath });
  }
}
```

### Application Hooks (src/application/hooks/)

```typescript
// src/application/hooks/useGitStatus.ts
import { useEffect, useCallback, useRef } from 'react';
import { useRepositoryStore } from '@/application/stores';
import { TauriStatusRepository } from '@/infrastructure/repositories';

const statusRepository = new TauriStatusRepository();

export function useGitStatus(pollInterval = 3000) {
  const { currentRepo, setStatus, setRefreshing } = useRepositoryStore();
  // ... implementation avec polling
}
```

### Mapping des chemins (ancien → nouveau)

| Ancien | Nouveau |
|--------|---------|
| `src/services/git/index.ts` | `src/infrastructure/repositories/tauri-status.repository.ts` |
| `src/hooks/useGitStatus.ts` | `src/application/hooks/useGitStatus.ts` |
| `src/hooks/index.ts` | `src/application/hooks/index.ts` |
| `src/components/status/` | `src/presentation/components/status/` |
| `getStatusIcon()` inline | `StatusClassifier.getIcon()` |
| `getStatusColor()` inline | `StatusClassifier.getColor()` |

---

## Tâche 5.1: Parser git status (backend)

**Commit**: `feat: add git status parsing`

**Fichiers**:
- `src-tauri/src/git/status.rs`
- `src-tauri/src/git/mod.rs` (mise à jour)

**Actions**:
- [ ] Créer `src-tauri/src/git/status.rs`:
```rust
use crate::git::error::GitError;
use crate::git::executor::GitExecutor;
use crate::git::types::*;

pub fn get_status(executor: &GitExecutor) -> Result<GitStatus, GitError> {
    let output = executor.execute_checked(&["status", "--porcelain=v2", "--branch", "-z"])?;
    parse_status_v2(&output)
}

fn parse_status_v2(output: &str) -> Result<GitStatus, GitError> {
    let mut status = GitStatus {
        branch: None,
        upstream: None,
        ahead: 0,
        behind: 0,
        staged: Vec::new(),
        unstaged: Vec::new(),
        untracked: Vec::new(),
        conflicted: Vec::new(),
    };

    for entry in output.split('\0').filter(|s| !s.is_empty()) {
        if entry.starts_with("# branch.head ") {
            let branch = entry[14..].to_string();
            status.branch = if branch == "(detached)" { None } else { Some(branch) };
        } else if entry.starts_with("# branch.upstream ") {
            status.upstream = Some(entry[18..].to_string());
        } else if entry.starts_with("# branch.ab ") {
            let parts: Vec<&str> = entry[12..].split_whitespace().collect();
            if parts.len() >= 2 {
                status.ahead = parts[0].trim_start_matches('+').parse().unwrap_or(0);
                status.behind = parts[1].trim_start_matches('-').parse().unwrap_or(0);
            }
        } else if entry.starts_with("1 ") || entry.starts_with("2 ") {
            parse_changed_entry(entry, &mut status)?;
        } else if entry.starts_with("u ") {
            parse_unmerged_entry(entry, &mut status)?;
        } else if entry.starts_with("? ") {
            status.untracked.push(StatusEntry {
                path: entry[2..].to_string(),
                index_status: FileStatus::Untracked,
                worktree_status: FileStatus::Untracked,
                original_path: None,
            });
        }
    }

    Ok(status)
}

fn parse_file_status(c: char) -> FileStatus {
    match c {
        'M' => FileStatus::Modified,
        'T' => FileStatus::TypeChanged,
        'A' => FileStatus::Added,
        'D' => FileStatus::Deleted,
        'R' => FileStatus::Renamed { from: String::new() },
        'C' => FileStatus::Copied { from: String::new() },
        'U' => FileStatus::Conflicted,
        '?' => FileStatus::Untracked,
        '!' => FileStatus::Ignored,
        _ => FileStatus::Unmodified,
    }
}

fn parse_changed_entry(entry: &str, status: &mut GitStatus) -> Result<(), GitError> {
    let parts: Vec<&str> = entry.split(' ').collect();
    if parts.len() < 9 {
        return Ok(());
    }

    let xy = parts[1];
    let path = parts[8..].join(" ");

    let index_char = xy.chars().next().unwrap_or('.');
    let worktree_char = xy.chars().nth(1).unwrap_or('.');

    let index_status = parse_file_status(index_char);
    let worktree_status = parse_file_status(worktree_char);

    // Add to staged if index has changes
    if index_char != '.' {
        status.staged.push(StatusEntry {
            path: path.clone(),
            index_status: index_status.clone(),
            worktree_status: FileStatus::Unmodified,
            original_path: None,
        });
    }

    // Add to unstaged if worktree has changes
    if worktree_char != '.' {
        status.unstaged.push(StatusEntry {
            path: path.clone(),
            index_status: FileStatus::Unmodified,
            worktree_status: worktree_status.clone(),
            original_path: None,
        });
    }

    Ok(())
}

fn parse_unmerged_entry(entry: &str, status: &mut GitStatus) -> Result<(), GitError> {
    let parts: Vec<&str> = entry.split(' ').collect();
    if parts.len() < 11 {
        return Ok(());
    }

    let path = parts[10..].join(" ");

    status.conflicted.push(StatusEntry {
        path,
        index_status: FileStatus::Conflicted,
        worktree_status: FileStatus::Conflicted,
        original_path: None,
    });

    Ok(())
}
```
- [ ] Ajouter `pub mod status;` dans `src-tauri/src/git/mod.rs`

---

## Tâche 5.2: Commande get_git_status

**Commit**: `feat: add get_git_status command`

**Fichiers**:
- `src-tauri/src/commands/status.rs`
- `src-tauri/src/commands/mod.rs` (mise à jour)
- `src-tauri/src/lib.rs` (mise à jour)

**Actions**:
- [ ] Créer `src-tauri/src/commands/status.rs`:
```rust
use crate::git::{executor::GitExecutor, status, types::GitStatus};

#[tauri::command]
pub async fn get_git_status(repo_path: String) -> Result<GitStatus, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    status::get_status(&executor).map_err(|e| e.to_string())
}
```
- [ ] Ajouter dans `src-tauri/src/commands/mod.rs`:
```rust
pub mod status;
```
- [ ] Ajouter dans `src-tauri/src/lib.rs`:
```rust
use commands::status::get_git_status;

// Dans invoke_handler:
.invoke_handler(tauri::generate_handler![open_repository, get_git_status])
```

---

## Tâche 5.3: Créer StatusRepository infrastructure

**Commit**: `feat: add status repository for Tauri IPC`

**Fichiers**:
- `src/domain/interfaces/status.repository.ts`
- `src/infrastructure/repositories/tauri-status.repository.ts`
- `src/infrastructure/repositories/index.ts`
- `src/domain/services/status-classifier.service.ts`

**Actions**:
- [ ] Créer `src/domain/interfaces/status.repository.ts`:
```typescript
import type { GitStatus } from '@/domain/value-objects';

export interface IStatusRepository {
  getStatus(repoPath: string): Promise<GitStatus>;
}
```
- [ ] Créer `src/infrastructure/repositories/tauri-status.repository.ts`:
```typescript
import { invoke } from '@tauri-apps/api/core';
import type { IStatusRepository } from '@/domain/interfaces';
import type { GitStatus } from '@/domain/value-objects';

export class TauriStatusRepository implements IStatusRepository {
  async getStatus(repoPath: string): Promise<GitStatus> {
    return invoke('get_git_status', { repoPath });
  }
}
```
- [ ] Créer `src/infrastructure/repositories/index.ts`:
```typescript
export { TauriRepositoryRepository } from './tauri-repository.repository';
export { TauriStatusRepository } from './tauri-status.repository';
```
- [ ] Créer `src/domain/services/status-classifier.service.ts` (voir Architecture DDD)

---

## Tâche 5.4: Hook useGitStatus

**Commit**: `feat: add useGitStatus hook with polling`

**Fichiers**:
- `src/application/hooks/useGitStatus.ts`
- `src/application/hooks/index.ts`

**Actions**:
- [ ] Créer le dossier `src/application/hooks/`
- [ ] Créer `src/application/hooks/useGitStatus.ts`:
```typescript
import { useEffect, useCallback, useRef } from 'react';
import { useRepositoryStore } from '@/application/stores';
import { TauriStatusRepository } from '@/infrastructure/repositories';

const statusRepository = new TauriStatusRepository();

export function useGitStatus(pollInterval = 3000) {
  const { currentRepo, setStatus, setRefreshing } = useRepositoryStore();
  const intervalRef = useRef<number | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!currentRepo) return;

    try {
      setRefreshing(true);
      const status = await statusRepository.getStatus(currentRepo.path);
      setStatus(status);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setRefreshing(false);
    }
  }, [currentRepo, setStatus, setRefreshing]);

  useEffect(() => {
    fetchStatus();

    // Start polling
    intervalRef.current = window.setInterval(fetchStatus, pollInterval);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        fetchStatus();
        intervalRef.current = window.setInterval(fetchStatus, pollInterval);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchStatus, pollInterval]);

  return { refresh: fetchStatus };
}
```
- [ ] Créer `src/application/hooks/index.ts`:
```typescript
export { useRepository } from './useRepository';
export { useGitStatus } from './useGitStatus';
```

---

## Tâche 5.5: Créer StatusView

**Commit**: `feat: add StatusView component`

**Fichiers**:
- `src/presentation/components/status/StatusView.tsx`
- `src/presentation/components/status/index.ts`

**Actions**:
- [ ] Créer le dossier `src/presentation/components/status/`
- [ ] Créer `src/presentation/components/status/StatusView.tsx`:
```typescript
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileTree } from './FileTree';
import { useRepositoryStore, useUIStore } from '@/application/stores';
import { useGitStatus } from '@/application/hooks';

export function StatusView() {
  const { status } = useRepositoryStore();
  const { selectedFiles } = useUIStore();

  // Start status polling
  useGitStatus();

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Left panel: File lists */}
      <ResizablePanel defaultSize={30} minSize={20}>
        <ScrollArea className="h-full">
          <div className="p-2 space-y-2">
            <FileTree
              title="Staged Changes"
              files={status?.staged ?? []}
              type="staged"
            />
            <FileTree
              title="Changes"
              files={status?.unstaged ?? []}
              type="unstaged"
            />
            <FileTree
              title="Untracked"
              files={status?.untracked ?? []}
              type="untracked"
            />
            {status?.conflicted && status.conflicted.length > 0 && (
              <FileTree
                title="Conflicts"
                files={status.conflicted}
                type="conflicted"
              />
            )}
          </div>
        </ScrollArea>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right panel: Diff viewer placeholder */}
      <ResizablePanel defaultSize={70}>
        <div className="flex h-full items-center justify-center text-muted-foreground">
          {selectedFiles.length > 0
            ? `Selected: ${selectedFiles[0]}`
            : 'Select a file to view changes'}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
```
- [ ] Créer `src/presentation/components/status/index.ts`:
```typescript
export { StatusView } from './StatusView';
export { FileTree } from './FileTree';
export { FileItem } from './FileItem';
```

---

## Tâche 5.6: Créer FileTree

**Commit**: `feat: add FileTree component`

**Fichiers**:
- `src/presentation/components/status/FileTree.tsx`
- `src/presentation/components/status/FileItem.tsx`

**Actions**:
- [ ] Créer `src/presentation/components/status/FileTree.tsx`:
```typescript
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileItem } from './FileItem';
import type { StatusEntry } from '@/domain/entities';

interface FileTreeProps {
  title: string;
  files: StatusEntry[];
  type: 'staged' | 'unstaged' | 'untracked' | 'conflicted';
}

export function FileTree({ title, files, type }: FileTreeProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (files.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 px-2"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="flex-1 text-left">{title}</span>
          <Badge variant="secondary" className="ml-auto">
            {files.length}
          </Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 space-y-0.5">
          {files.map((file) => (
            <FileItem key={file.path} entry={file} type={type} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```
- [ ] Créer `src/presentation/components/status/FileItem.tsx`:
```typescript
import { File, FileText, FilePlus, FileMinus, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/application/stores';
import { StatusClassifier } from '@/domain/services/status-classifier.service';
import { cn } from '@/lib/utils';
import type { StatusEntry, FileStatus } from '@/domain/entities';
import type { FileStatus } from '@/domain/value-objects';

interface FileItemProps {
  entry: StatusEntry;
  type: 'staged' | 'unstaged' | 'untracked' | 'conflicted';
}

const iconMap: Record<string, typeof File> = {
  FilePlus, FileMinus, FileText, FileQuestion, File,
};

function getStatusIcon(status: FileStatus) {
  const iconName = StatusClassifier.getIcon(status);
  return iconMap[iconName] ?? File;
}

export function FileItem({ entry, type }: FileItemProps) {
  const { selectedFiles, toggleFileSelection } = useUIStore();
  const isSelected = selectedFiles.includes(entry.path);

  const status = type === 'staged' ? entry.index_status : entry.worktree_status;
  const Icon = getStatusIcon(status);
  const color = StatusClassifier.getColor(status);
  const label = StatusClassifier.getLabel(status);

  const fileName = entry.path.split('/').pop() ?? entry.path;
  const dirPath = entry.path.includes('/')
    ? entry.path.substring(0, entry.path.lastIndexOf('/'))
    : '';

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'w-full justify-start gap-2 px-2 h-7',
        isSelected && 'bg-accent'
      )}
      onClick={() => toggleFileSelection(entry.path)}
    >
      <span className={cn('w-4 text-center text-xs font-mono', color)}>
        {label}
      </span>
      <Icon className={cn('h-4 w-4 flex-shrink-0', color)} />
      <span className="truncate flex-1 text-left">
        {fileName}
        {dirPath && (
          <span className="text-muted-foreground ml-1 text-xs">
            {dirPath}
          </span>
        )}
      </span>
    </Button>
  );
}
```
- [ ] Mettre à jour `src/App.tsx` pour utiliser `StatusView`:
```typescript
import { StatusView } from '@/presentation/components/status';

// Dans renderView(), remplacer le placeholder:
case 'status':
  return <StatusView />;
```

---

## Progression: 6/6
