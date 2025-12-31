# Phase 6: Staging Operations

## Objectif
Permettre de stage/unstage/discard des fichiers.

---

## Architecture DDD

### Domain Events (src/domain/events/)

| Event | Fichier | Payload |
|-------|---------|---------|
| `FileStaged` | `file-staged.event.ts` | `{ path: string, timestamp: Date }` |
| `FileUnstaged` | `file-unstaged.event.ts` | `{ path: string, timestamp: Date }` |
| `ChangesDiscarded` | `changes-discarded.event.ts` | `{ path: string, wasUntracked: boolean }` |

### Repository Interface (src/domain/interfaces/)

```typescript
// src/domain/interfaces/staging.repository.ts
export interface IStagingRepository {
  stageFile(repoPath: string, filePath: string): Promise<void>;
  stageAll(repoPath: string): Promise<void>;
  unstageFile(repoPath: string, filePath: string): Promise<void>;
  unstageAll(repoPath: string): Promise<void>;
  discardChanges(repoPath: string, filePath: string, isUntracked: boolean): Promise<void>;
}
```

### Infrastructure (src/infrastructure/repositories/)

```typescript
// src/infrastructure/repositories/tauri-staging.repository.ts
import { invoke } from '@tauri-apps/api/core';
import type { IStagingRepository } from '@/domain/interfaces';

export class TauriStagingRepository implements IStagingRepository {
  async stageFile(repoPath: string, filePath: string): Promise<void> {
    return invoke('stage_file', { repoPath, filePath });
  }
  async stageAll(repoPath: string): Promise<void> {
    return invoke('stage_all', { repoPath });
  }
  async unstageFile(repoPath: string, filePath: string): Promise<void> {
    return invoke('unstage_file', { repoPath, filePath });
  }
  async unstageAll(repoPath: string): Promise<void> {
    return invoke('unstage_all', { repoPath });
  }
  async discardChanges(repoPath: string, filePath: string, isUntracked: boolean): Promise<void> {
    return invoke('discard_changes', { repoPath, filePath, isUntracked });
  }
}
```

### Application Hooks (src/application/hooks/)

```typescript
// src/application/hooks/useStagingActions.ts
import { TauriStagingRepository } from '@/infrastructure/repositories';
import { useRepositoryStore } from '@/application/stores';

const stagingRepository = new TauriStagingRepository();

export function useStagingActions() {
  const { currentRepo } = useRepositoryStore();

  const stageFile = async (path: string) => {
    if (!currentRepo) return;
    await stagingRepository.stageFile(currentRepo.path, path);
  };

  const unstageFile = async (path: string) => {
    if (!currentRepo) return;
    await stagingRepository.unstageFile(currentRepo.path, path);
  };

  const discardChanges = async (path: string, isUntracked: boolean) => {
    if (!currentRepo) return;
    await stagingRepository.discardChanges(currentRepo.path, path, isUntracked);
  };

  return { stageFile, unstageFile, discardChanges };
}
```

### Mapping des chemins (ancien → nouveau)

| Ancien | Nouveau |
|--------|---------|
| `src/services/git/index.ts` (staging) | `src/infrastructure/repositories/tauri-staging.repository.ts` |
| `GitService.stageFile()` | `useStagingActions().stageFile()` |
| `src/components/common/` | `src/presentation/components/common/` |

---

## Tâche 6.1: Commandes stage/unstage (backend)

**Commit**: `feat: add stage and unstage commands`

**Fichiers**:
- `src-tauri/src/commands/status.rs`
- `src-tauri/src/lib.rs` (mise à jour)

**Actions**:
- [ ] Ajouter dans `src-tauri/src/commands/status.rs`:
```rust
#[tauri::command]
pub async fn stage_file(repo_path: String, file_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    executor
        .execute_checked(&["add", "--", &file_path])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn stage_all(repo_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    executor
        .execute_checked(&["add", "-A"])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn unstage_file(repo_path: String, file_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    executor
        .execute_checked(&["reset", "HEAD", "--", &file_path])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn unstage_all(repo_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    executor
        .execute_checked(&["reset", "HEAD"])
        .map_err(|e| e.to_string())?;
    Ok(())
}
```
- [ ] Mettre à jour `src-tauri/src/lib.rs`:
```rust
use commands::status::{get_git_status, stage_file, stage_all, unstage_file, unstage_all};

.invoke_handler(tauri::generate_handler![
    open_repository,
    get_git_status,
    stage_file,
    stage_all,
    unstage_file,
    unstage_all,
])
```

---

## Tâche 6.2: Commande discard_changes

**Commit**: `feat: add discard changes command`

**Fichiers**:
- `src-tauri/src/commands/status.rs`
- `src-tauri/src/lib.rs` (mise à jour)

**Actions**:
- [ ] Ajouter dans `src-tauri/src/commands/status.rs`:
```rust
#[tauri::command]
pub async fn discard_changes(repo_path: String, file_path: String, is_untracked: bool) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;

    if is_untracked {
        // For untracked files, use clean
        executor
            .execute_checked(&["clean", "-f", "--", &file_path])
            .map_err(|e| e.to_string())?;
    } else {
        // For tracked files, checkout from HEAD
        executor
            .execute_checked(&["checkout", "HEAD", "--", &file_path])
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
```
- [ ] Ajouter `discard_changes` au `generate_handler![]` dans `lib.rs`

---

## Tâche 6.3: Actions staging UI

**Commit**: `feat: add staging actions to file tree`

**Fichiers**:
- `src/services/git/index.ts` (mise à jour)
- `src/components/status/FileItem.tsx` (mise à jour)
- `src/components/status/FileTree.tsx` (mise à jour)

**Actions**:
- [ ] Ajouter dans `src/services/git/index.ts`:
```typescript
async stageFile(path: string): Promise<void> {
  return invoke('stage_file', { repoPath: this.repoPath, filePath: path });
}

async stageAll(): Promise<void> {
  return invoke('stage_all', { repoPath: this.repoPath });
}

async unstageFile(path: string): Promise<void> {
  return invoke('unstage_file', { repoPath: this.repoPath, filePath: path });
}

async unstageAll(): Promise<void> {
  return invoke('unstage_all', { repoPath: this.repoPath });
}

async discardChanges(path: string, isUntracked: boolean): Promise<void> {
  return invoke('discard_changes', {
    repoPath: this.repoPath,
    filePath: path,
    isUntracked
  });
}
```
- [ ] Mettre à jour `FileItem.tsx` pour ajouter actions au context menu:
```typescript
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Plus, Minus, Undo } from 'lucide-react';
import { GitService } from '@/services/git';
import { useRepositoryStore } from '@/store';

// Dans le composant:
const { currentRepo } = useRepositoryStore();

const handleStage = async () => {
  if (!currentRepo) return;
  const git = new GitService(currentRepo.path);
  await git.stageFile(entry.path);
};

const handleUnstage = async () => {
  if (!currentRepo) return;
  const git = new GitService(currentRepo.path);
  await git.unstageFile(entry.path);
};

// Wrapper le Button avec ContextMenu
<ContextMenu>
  <ContextMenuTrigger asChild>
    <Button ...>...</Button>
  </ContextMenuTrigger>
  <ContextMenuContent>
    {type === 'staged' ? (
      <ContextMenuItem onClick={handleUnstage}>
        <Minus className="mr-2 h-4 w-4" />
        Unstage
      </ContextMenuItem>
    ) : (
      <ContextMenuItem onClick={handleStage}>
        <Plus className="mr-2 h-4 w-4" />
        Stage
      </ContextMenuItem>
    )}
    {type !== 'staged' && (
      <ContextMenuItem onClick={() => {/* TODO: show confirm */}}>
        <Undo className="mr-2 h-4 w-4" />
        Discard changes
      </ContextMenuItem>
    )}
  </ContextMenuContent>
</ContextMenu>
```
- [ ] Ajouter boutons "Stage all" / "Unstage all" dans `FileTree.tsx`

---

## Tâche 6.4: Confirmation discard

**Commit**: `feat: add discard confirmation dialog`

**Fichiers**:
- `src/components/common/ConfirmDialog.tsx`
- `src/components/common/index.ts`

**Actions**:
- [ ] Créer le dossier `src/components/common/`
- [ ] Créer `src/components/common/ConfirmDialog.tsx`:
```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: 'default' | 'destructive';
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'default',
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```
- [ ] Créer `src/components/common/index.ts`:
```typescript
export { ConfirmDialog } from './ConfirmDialog';
```
- [ ] Installer le composant shadcn `alert-dialog`:
```bash
pnpm dlx shadcn@latest add alert-dialog
```
- [ ] Utiliser `ConfirmDialog` dans `FileItem.tsx` pour confirmer discard

---

## Progression: 0/4
