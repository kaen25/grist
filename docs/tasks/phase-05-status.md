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
| `StatusEntry` | `status-entry.entity.ts` | Fichier avec ses statuts index/worktree, original_path (pour renames), only_eol_changes |

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
- [x] Créer `src-tauri/src/git/status.rs`:
```rust
use crate::git::error::GitError;
use crate::git::executor::GitExecutor;
use crate::git::types::*;

pub fn get_status(executor: &GitExecutor) -> Result<GitStatus, GitError> {
    // Use --untracked-files=all to show individual files instead of directories
    let output = executor.execute_checked(&["status", "--porcelain=v2", "--branch", "-z", "--untracked-files=all"])?;
    let mut status = parse_status_v2(&output)?;

    // Check for EOL-only changes in modified files
    detect_eol_only_changes(executor, &mut status);

    Ok(status)
}

/// Check if modified files have only line ending changes
fn detect_eol_only_changes(executor: &GitExecutor, status: &mut GitStatus) {
    // Check unstaged modified files
    for entry in &mut status.unstaged {
        if entry.worktree_status == FileStatus::Modified {
            entry.only_eol_changes = is_eol_only_change(executor, &entry.path, false);
        }
    }
    // Check staged modified files
    for entry in &mut status.staged {
        if entry.index_status == FileStatus::Modified {
            entry.only_eol_changes = is_eol_only_change(executor, &entry.path, true);
        }
    }
}

/// Check if a file's changes are only line endings by comparing diff with and without --ignore-cr-at-eol
fn is_eol_only_change(executor: &GitExecutor, path: &str, staged: bool) -> bool {
    let args_with_ignore = if staged {
        vec!["diff", "--cached", "--ignore-cr-at-eol", "--", path]
    } else {
        vec!["diff", "--ignore-cr-at-eol", "--", path]
    };
    match executor.execute_checked(&args_with_ignore) {
        Ok(output) => output.trim().is_empty(),
        Err(_) => false,
    }
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

    // Split by null bytes - for rename entries (type 2), the original path
    // comes as the next entry after the main entry
    let entries: Vec<&str> = output.split('\0').filter(|s| !s.is_empty()).collect();
    let mut i = 0;

    while i < entries.len() {
        let entry = entries[i];

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
        } else if entry.starts_with("1 ") {
            parse_changed_entry(entry, None, &mut status)?;
        } else if entry.starts_with("2 ") {
            // Type 2 = rename/copy - next entry is the original path
            let orig_path = if i + 1 < entries.len() {
                i += 1;
                Some(entries[i].to_string())
            } else {
                None
            };
            parse_changed_entry(entry, orig_path, &mut status)?;
        } else if entry.starts_with("u ") {
            parse_unmerged_entry(entry, &mut status)?;
        } else if entry.starts_with("? ") {
            status.untracked.push(StatusEntry {
                path: entry[2..].to_string(),
                index_status: FileStatus::Untracked,
                worktree_status: FileStatus::Untracked,
                original_path: None,
                only_eol_changes: false,
            });
        }

        i += 1;
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

fn parse_changed_entry(entry: &str, original_path: Option<String>, status: &mut GitStatus) -> Result<(), GitError> {
    let parts: Vec<&str> = entry.split(' ').collect();
    if parts.len() < 9 {
        return Ok(());
    }

    let is_rename = entry.starts_with("2 ");
    let xy = parts[1];

    // For type 2 (rename/copy), the path starts at index 9 (after the score field)
    // For type 1, the path starts at index 8
    let path = if is_rename && parts.len() >= 10 {
        parts[9..].join(" ")
    } else {
        parts[8..].join(" ")
    };

    let index_char = xy.chars().next().unwrap_or('.');
    let worktree_char = xy.chars().nth(1).unwrap_or('.');

    let mut index_status = parse_file_status(index_char);
    let mut worktree_status = parse_file_status(worktree_char);

    // For renames, update the status with the original path
    if let Some(ref orig) = original_path {
        if let FileStatus::Renamed { ref mut from } = index_status {
            *from = orig.clone();
        }
        if let FileStatus::Renamed { ref mut from } = worktree_status {
            *from = orig.clone();
        }
    }

    // Add to staged if index has changes
    if index_char != '.' {
        status.staged.push(StatusEntry {
            path: path.clone(),
            index_status: index_status.clone(),
            worktree_status: FileStatus::Unmodified,
            original_path: original_path.clone(),
            only_eol_changes: false, // Will be set later by detect_eol_only_changes
        });
    }

    // Add to unstaged if worktree has changes
    if worktree_char != '.' {
        status.unstaged.push(StatusEntry {
            path: path.clone(),
            index_status: FileStatus::Unmodified,
            worktree_status: worktree_status.clone(),
            original_path: original_path.clone(),
            only_eol_changes: false, // Will be set later by detect_eol_only_changes
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
        only_eol_changes: false,
    });

    Ok(())
}
```
- [x] Ajouter `pub mod status;` dans `src-tauri/src/git/mod.rs`

---

## Tâche 5.2: Commande get_git_status

**Commit**: `feat: add get_git_status command`

**Fichiers**:
- `src-tauri/src/commands/status.rs`
- `src-tauri/src/commands/mod.rs` (mise à jour)
- `src-tauri/src/lib.rs` (mise à jour)

**Actions**:
- [x] Créer `src-tauri/src/commands/status.rs`:
```rust
use crate::git::{executor::GitExecutor, status, types::GitStatus};

#[tauri::command]
pub async fn get_git_status(repo_path: String) -> Result<GitStatus, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    status::get_status(&executor).map_err(|e| e.to_string())
}
```
- [x] Ajouter dans `src-tauri/src/commands/mod.rs`:
```rust
pub mod status;
```
- [x] Ajouter dans `src-tauri/src/lib.rs`:
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
- [x] Créer `src/domain/interfaces/status.repository.ts`:
```typescript
import type { GitStatus } from '@/domain/value-objects';

export interface IStatusRepository {
  getStatus(repoPath: string): Promise<GitStatus>;
}
```
- [x] Créer `src/infrastructure/repositories/tauri-status.repository.ts`:
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
- [x] Créer `src/infrastructure/repositories/index.ts`:
```typescript
export { TauriRepositoryRepository } from './tauri-repository.repository';
export { TauriStatusRepository } from './tauri-status.repository';
```
- [x] Créer `src/domain/services/status-classifier.service.ts` (voir Architecture DDD)

---

## Tâche 5.4: Hook useGitStatus

**Commit**: `feat: add useGitStatus hook with polling`

**Fichiers**:
- `src/application/hooks/useGitStatus.ts`
- `src/application/hooks/index.ts`

**Actions**:
- [x] Créer le dossier `src/application/hooks/`
- [x] Créer `src/application/hooks/useGitStatus.ts`:
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
- [x] Créer `src/application/hooks/index.ts`:
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
- [x] Créer le dossier `src/presentation/components/status/`
- [x] Créer `src/presentation/components/status/StatusView.tsx`:
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
- [x] Créer `src/presentation/components/status/index.ts`:
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
- [x] Créer `src/presentation/components/status/FileTree.tsx`:
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
- [x] Créer `src/presentation/components/status/FileItem.tsx` avec:
  - Affichage du status, icône et label
  - Support des renames avec affichage `original_path → path`
  - Badge "(EOL)" pour les fichiers avec `only_eol_changes`
  - Context menu pour stage/unstage/discard
  - Multi-sélection (Shift+clic, Ctrl+clic)

```typescript
// FileItem affiche maintenant:
// - Pour les renames: <original_path> → <new_path>
// - Pour EOL-only: opacity-50 et badge "(EOL)"
{entry.original_path ? (
  <>
    <span className="text-muted-foreground">{entry.original_path}</span>
    <span className="mx-1">→</span>
    {entry.path}
  </>
) : (
  <>
    {fileName}
    {dirPath && <span className="text-muted-foreground ml-1 text-xs">{dirPath}</span>}
  </>
)}
{entry.only_eol_changes && (
  <span className="ml-2 text-xs text-muted-foreground italic" title="Only line ending changes (CRLF/LF)">
    (EOL)
  </span>
)}
```
- [x] Mettre à jour `src/App.tsx` pour utiliser `StatusView`:
```typescript
import { StatusView } from '@/presentation/components/status';

// Dans renderView(), remplacer le placeholder:
case 'status':
  return <StatusView />;
```

---

## Progression: 6/6 COMPLETE
