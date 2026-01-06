# Phase 15: Cherry-pick & Revert

## Objectif
Permettre cherry-pick et revert de commits.

---

## Architecture DDD

### Value Objects

| Value Object | Fichier | Description |
|--------------|---------|-------------|
| `CherryPickResult` | `cherry-pick-result.vo.ts` | Résultat (Success, Conflict) |
| `RevertResult` | `revert-result.vo.ts` | Résultat (Success, Conflict) |

### Domain Events

| Event | Fichier | Payload |
|-------|---------|---------|
| `CommitCherryPicked` | `commit-cherry-picked.event.ts` | `{ originalHash: string, newHash: string }` |
| `CommitReverted` | `commit-reverted.event.ts` | `{ revertedHash: string, revertCommitHash: string }` |
| `CherryPickConflict` | `cherry-pick-conflict.event.ts` | `{ conflictedFiles: string[] }` |
| `RevertConflict` | `revert-conflict.event.ts` | `{ conflictedFiles: string[] }` |

### Repository Interface (extension de ICommitRepository)

```typescript
// Extension de src/domain/interfaces/commit.repository.ts
export interface ICommitRepository {
  // ... méthodes existantes
  cherryPick(repoPath: string, hash: string): Promise<CherryPickResult>;
  revert(repoPath: string, hash: string): Promise<RevertResult>;
  abortCherryPick(repoPath: string): Promise<void>;
  abortRevert(repoPath: string): Promise<void>;
}
```

### Application Hooks

- `useCherryPick` - `src/application/hooks/useCherryPick.ts`
- `useRevert` - `src/application/hooks/useRevert.ts`

---

## Tâche 15.1: Commandes cherry-pick/revert (backend)

**Commit**: `feat: add cherry-pick and revert commands`

**Fichiers**:
- `src-tauri/src/git/commit.rs` (mise à jour)
- `src-tauri/src/commands/commit.rs` (mise à jour)

**Actions**:
- [x] Ajouter dans `src-tauri/src/git/commit.rs`:
```rust
pub fn cherry_pick(executor: &GitExecutor, hash: &str) -> Result<(), GitError> {
    let result = executor.execute(&["cherry-pick", hash])?;

    if result.exit_code != 0 {
        if result.stderr.contains("CONFLICT") {
            return Err(GitError::MergeConflict);
        }
        return Err(GitError::CommandFailed {
            code: result.exit_code,
            stderr: result.stderr,
        });
    }

    Ok(())
}

pub fn revert_commit(executor: &GitExecutor, hash: &str) -> Result<(), GitError> {
    let result = executor.execute(&["revert", "--no-edit", hash])?;

    if result.exit_code != 0 {
        if result.stderr.contains("CONFLICT") {
            return Err(GitError::MergeConflict);
        }
        return Err(GitError::CommandFailed {
            code: result.exit_code,
            stderr: result.stderr,
        });
    }

    Ok(())
}

pub fn abort_cherry_pick(executor: &GitExecutor) -> Result<(), GitError> {
    executor.execute_checked(&["cherry-pick", "--abort"])?;
    Ok(())
}

pub fn abort_revert(executor: &GitExecutor) -> Result<(), GitError> {
    executor.execute_checked(&["revert", "--abort"])?;
    Ok(())
}
```
- [x] Ajouter dans `src-tauri/src/commands/commit.rs`:
```rust
#[tauri::command]
pub async fn cherry_pick(repo_path: String, hash: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    commit::cherry_pick(&executor, &hash).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn revert_commit(repo_path: String, hash: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    commit::revert_commit(&executor, &hash).map_err(|e| e.to_string())
}
```
- [x] Ajouter les commandes au `generate_handler![]`
- [x] Ajouter dans `src/infrastructure/services/tauri-git.service.ts`:
```typescript
async cherryPick(hash: string): Promise<void> {
  return invoke('cherry_pick', { repoPath: this.repoPath, hash });
}

async revertCommit(hash: string): Promise<void> {
  return invoke('revert_commit', { repoPath: this.repoPath, hash });
}
```

---

## Tâche 15.2: Actions dans HistoryView

**Commit**: `feat: add cherry-pick and revert to history view`

**Fichiers**:
- `src/components/history/CommitItem.tsx` (mise à jour)

**Actions**:
- [x] Mettre à jour `CommitItem.tsx` pour ajouter context menu:
```typescript
import { CherryIcon, Undo, MoreHorizontal } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useRepositoryStore } from '@/store';
import { GitService } from '@/services/git';
import { toast } from 'sonner';

// Dans le composant CommitItem:
const { currentRepo } = useRepositoryStore();

const handleCherryPick = async () => {
  if (!currentRepo) return;
  try {
    const git = new GitService(currentRepo.path);
    await git.cherryPick(commit.hash);
    toast.success(`Cherry-picked ${commit.short_hash}`);
  } catch (error) {
    if (String(error).includes('conflict')) {
      toast.error('Cherry-pick resulted in conflicts. Please resolve them.');
    } else {
      toast.error(`Cherry-pick failed: ${error}`);
    }
  }
};

const handleRevert = async () => {
  if (!currentRepo) return;
  try {
    const git = new GitService(currentRepo.path);
    await git.revertCommit(commit.hash);
    toast.success(`Reverted ${commit.short_hash}`);
  } catch (error) {
    if (String(error).includes('conflict')) {
      toast.error('Revert resulted in conflicts. Please resolve them.');
    } else {
      toast.error(`Revert failed: ${error}`);
    }
  }
};

// Wrapper le button existant avec ContextMenu:
<ContextMenu>
  <ContextMenuTrigger asChild>
    <button onClick={onSelect} className={...}>
      {/* existing content */}
    </button>
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem onClick={handleCherryPick}>
      <CherryIcon className="h-4 w-4 mr-2" />
      Cherry-pick
    </ContextMenuItem>
    <ContextMenuItem onClick={handleRevert}>
      <Undo className="h-4 w-4 mr-2" />
      Revert
    </ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

Note: Lucide n'a pas de CherryIcon, utiliser un autre icône comme `GitCommit` ou `Copy`.

---

## Progression: 2/2
