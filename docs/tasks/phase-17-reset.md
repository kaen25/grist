# Phase 17: Reset

## Objectif
Permettre les opérations git reset (soft, mixed, hard) pour corriger l'historique et l'état du working tree.

---

## Architecture DDD

### Value Objects

| Value Object | Fichier | Description |
|--------------|---------|-------------|
| `ResetMode` | `reset-mode.vo.ts` | Enum (Soft, Mixed, Hard) |

### Repository Interface

```typescript
// Extension de src/domain/interfaces/git.repository.ts
export interface IGitRepository {
  // ... méthodes existantes
  reset(repoPath: string, target: string, mode: 'soft' | 'mixed' | 'hard'): Promise<void>;
  resetFile(repoPath: string, filePath: string, commit?: string): Promise<void>;
}
```

---

## Tâche 17.1: Commande reset (backend)

**Commit**: `feat: add git reset command`

**Fichiers**:
- `src-tauri/src/git/reset.rs` (nouveau)
- `src-tauri/src/git/mod.rs` (mise à jour)
- `src-tauri/src/commands/reset.rs` (nouveau)
- `src-tauri/src/commands/mod.rs` (mise à jour)
- `src-tauri/src/lib.rs` (mise à jour)

**Actions**:
- [ ] Créer `src-tauri/src/git/reset.rs`:
```rust
use crate::git::error::GitError;
use crate::git::executor::GitExecutor;

pub fn reset(
    executor: &GitExecutor,
    target: &str,
    mode: &str,
) -> Result<(), GitError> {
    let mode_flag = match mode {
        "soft" => "--soft",
        "mixed" => "--mixed",
        "hard" => "--hard",
        _ => return Err(GitError::CommandFailed {
            code: 1,
            stderr: format!("Invalid reset mode: {}", mode),
        }),
    };

    executor.execute_checked(&["reset", mode_flag, target])?;
    Ok(())
}

/// Reset a single file to a specific commit (or HEAD)
pub fn reset_file(
    executor: &GitExecutor,
    file_path: &str,
    commit: Option<&str>,
) -> Result<(), GitError> {
    let mut args = vec!["checkout"];
    if let Some(c) = commit {
        args.push(c);
    } else {
        args.push("HEAD");
    }
    args.push("--");
    args.push(file_path);

    executor.execute_checked(&args)?;
    Ok(())
}
```
- [ ] Ajouter `pub mod reset;` dans `src-tauri/src/git/mod.rs`
- [ ] Créer `src-tauri/src/commands/reset.rs`:
```rust
use crate::git::{executor::GitExecutor, reset};

#[tauri::command]
pub async fn git_reset(
    repo_path: String,
    target: String,
    mode: String,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    reset::reset(&executor, &target, &mode).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn reset_file(
    repo_path: String,
    file_path: String,
    commit: Option<String>,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    reset::reset_file(&executor, &file_path, commit.as_deref()).map_err(|e| e.to_string())
}
```
- [ ] Ajouter `pub mod reset;` dans `src-tauri/src/commands/mod.rs`
- [ ] Ajouter les commandes au `generate_handler![]`

---

## Tâche 17.2: ResetDialog UI

**Commit**: `feat: add ResetDialog component`

**Fichiers**:
- `src/presentation/components/history/ResetDialog.tsx` (nouveau)
- `src/presentation/components/history/CommitItem.tsx` (mise à jour)
- `src/infrastructure/services/tauri-git.service.ts` (mise à jour)
- `src/domain/interfaces/git.repository.ts` (mise à jour)

**Actions**:
- [ ] Ajouter dans `git.repository.ts`:
```typescript
reset(repoPath: string, target: string, mode: 'soft' | 'mixed' | 'hard'): Promise<void>;
resetFile(repoPath: string, filePath: string, commit?: string): Promise<void>;
```
- [ ] Ajouter dans `tauri-git.service.ts`:
```typescript
async reset(repoPath: string, target: string, mode: 'soft' | 'mixed' | 'hard'): Promise<void> {
  return invoke('git_reset', { repoPath, target, mode });
},
async resetFile(repoPath: string, filePath: string, commit?: string): Promise<void> {
  return invoke('reset_file', { repoPath, filePath, commit });
},
```
- [ ] Créer `ResetDialog.tsx`:
```typescript
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import { toast } from 'sonner';

interface ResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitHash: string;
  commitMessage: string;
  onReset: () => void;
}

type ResetMode = 'soft' | 'mixed' | 'hard';

export function ResetDialog({
  open,
  onOpenChange,
  commitHash,
  commitMessage,
  onReset,
}: ResetDialogProps) {
  const { currentRepo } = useRepositoryStore();
  const [mode, setMode] = useState<ResetMode>('mixed');
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (!currentRepo) return;

    setIsResetting(true);
    try {
      await tauriGitService.reset(currentRepo.path, commitHash, mode);
      toast.success(`Reset to ${commitHash.slice(0, 7)} (${mode})`);
      onOpenChange(false);
      onReset();
    } catch (error) {
      toast.error(`Reset failed: ${error}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset to commit</DialogTitle>
          <DialogDescription>
            <code className="text-xs">{commitHash.slice(0, 7)}</code> - {commitMessage}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as ResetMode)}>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="soft" id="soft" />
              <div>
                <Label htmlFor="soft" className="font-medium">Soft</Label>
                <p className="text-sm text-muted-foreground">
                  Keep all changes staged. Only move HEAD.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="mixed" id="mixed" />
              <div>
                <Label htmlFor="mixed" className="font-medium">Mixed (default)</Label>
                <p className="text-sm text-muted-foreground">
                  Keep changes but unstage them. Move HEAD and reset index.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="hard" id="hard" />
              <div>
                <Label htmlFor="hard" className="font-medium text-destructive">Hard</Label>
                <p className="text-sm text-muted-foreground">
                  Discard all changes. Move HEAD, reset index AND working tree.
                </p>
              </div>
            </div>
          </RadioGroup>

          {mode === 'hard' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Warning: Hard reset will permanently discard all uncommitted changes!
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleReset}
            disabled={isResetting}
            variant={mode === 'hard' ? 'destructive' : 'default'}
          >
            {isResetting ? 'Resetting...' : `Reset (${mode})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
- [ ] Installer radio-group: `pnpm dlx shadcn@latest add radio-group`
- [ ] Ajouter option "Reset to this commit..." dans CommitItem context menu

---

## Progression: 0/2
