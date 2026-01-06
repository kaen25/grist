# Phase 18: Interactive Rebase

## Objectif
Permettre le rebase interactif pour réorganiser, squasher, et modifier l'historique des commits.

---

## Architecture DDD

### Value Objects

| Value Object | Fichier | Description |
|--------------|---------|-------------|
| `RebaseAction` | `rebase-action.vo.ts` | Enum (Pick, Reword, Edit, Squash, Fixup, Drop) |
| `RebaseTodoItem` | `rebase-todo-item.vo.ts` | { action, hash, message } |

### Notes techniques

Le rebase interactif (`git rebase -i`) est normalement interactif via un éditeur.
Pour l'automatiser, on utilise `GIT_SEQUENCE_EDITOR` pour injecter notre todo list.

---

## Tâche 18.1: Backend rebase interactif

**Commit**: `feat: add interactive rebase backend`

**Fichiers**:
- `src-tauri/src/git/rebase.rs` (nouveau)
- `src-tauri/src/git/mod.rs` (mise à jour)
- `src-tauri/src/commands/rebase.rs` (nouveau)
- `src-tauri/src/commands/mod.rs` (mise à jour)
- `src-tauri/src/lib.rs` (mise à jour)

**Actions**:
- [ ] Créer `src-tauri/src/git/rebase.rs`:
```rust
use crate::git::error::GitError;
use crate::git::executor::GitExecutor;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RebaseTodoItem {
    pub action: String,  // pick, reword, edit, squash, fixup, drop
    pub hash: String,
    pub message: String,
}

/// Get commits that would be included in an interactive rebase
pub fn get_rebase_commits(
    executor: &GitExecutor,
    onto: &str,
) -> Result<Vec<RebaseTodoItem>, GitError> {
    // Get commits from HEAD to onto (exclusive)
    let output = executor.execute_checked(&[
        "log",
        "--reverse",
        "--format=%H %s",
        &format!("{}..HEAD", onto),
    ])?;

    let commits: Vec<RebaseTodoItem> = output
        .lines()
        .filter(|line| !line.is_empty())
        .map(|line| {
            let (hash, message) = line.split_once(' ').unwrap_or((line, ""));
            RebaseTodoItem {
                action: "pick".to_string(),
                hash: hash.to_string(),
                message: message.to_string(),
            }
        })
        .collect();

    Ok(commits)
}

/// Execute interactive rebase with custom todo list
pub fn interactive_rebase(
    executor: &GitExecutor,
    onto: &str,
    todo_items: &[RebaseTodoItem],
) -> Result<(), GitError> {
    // Create temp file with rebase commands
    let temp_dir = std::env::temp_dir();
    let todo_path = temp_dir.join(format!("grist_rebase_todo_{}", std::process::id()));

    let todo_content: String = todo_items
        .iter()
        .map(|item| format!("{} {} {}", item.action, &item.hash[..7.min(item.hash.len())], item.message))
        .collect::<Vec<_>>()
        .join("\n");

    fs::write(&todo_path, &todo_content)
        .map_err(|e| GitError::IoError { message: e.to_string() })?;

    // Create a script that just copies our todo file
    let script_path = temp_dir.join(format!("grist_rebase_script_{}", std::process::id()));

    #[cfg(unix)]
    {
        let script_content = format!(
            "#!/bin/sh\ncat '{}' > \"$1\"\n",
            todo_path.display()
        );
        fs::write(&script_path, &script_content)
            .map_err(|e| GitError::IoError { message: e.to_string() })?;

        // Make executable
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&script_path)
            .map_err(|e| GitError::IoError { message: e.to_string() })?
            .permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&script_path, perms)
            .map_err(|e| GitError::IoError { message: e.to_string() })?;
    }

    #[cfg(windows)]
    {
        let script_content = format!(
            "@echo off\ncopy /Y \"{}\" \"%1\" >nul\n",
            todo_path.display()
        );
        let script_path = script_path.with_extension("cmd");
        fs::write(&script_path, &script_content)
            .map_err(|e| GitError::IoError { message: e.to_string() })?;
    }

    // Run rebase with our custom sequence editor
    let mut env = std::collections::HashMap::new();
    env.insert(
        "GIT_SEQUENCE_EDITOR".to_string(),
        script_path.to_string_lossy().to_string(),
    );

    let result = executor.execute_with_env(&["rebase", "-i", onto], &env)?;

    // Cleanup
    let _ = fs::remove_file(&todo_path);
    let _ = fs::remove_file(&script_path);

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

/// Skip current commit during rebase
pub fn skip_rebase(executor: &GitExecutor) -> Result<(), GitError> {
    executor.execute_checked(&["rebase", "--skip"])?;
    Ok(())
}
```
- [ ] Créer `src-tauri/src/commands/rebase.rs`:
```rust
use crate::git::{executor::GitExecutor, rebase::{self, RebaseTodoItem}};

#[tauri::command]
pub async fn get_rebase_commits(
    repo_path: String,
    onto: String,
) -> Result<Vec<RebaseTodoItem>, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    rebase::get_rebase_commits(&executor, &onto).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn interactive_rebase(
    repo_path: String,
    onto: String,
    todo_items: Vec<RebaseTodoItem>,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    rebase::interactive_rebase(&executor, &onto, &todo_items).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn skip_rebase(repo_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    rebase::skip_rebase(&executor).map_err(|e| e.to_string())
}
```
- [ ] Ajouter modules et commandes

---

## Tâche 18.2: InteractiveRebaseDialog UI

**Commit**: `feat: add interactive rebase dialog`

**Fichiers**:
- `src/presentation/components/history/InteractiveRebaseDialog.tsx` (nouveau)
- `src/presentation/components/history/CommitItem.tsx` (mise à jour)

**Actions**:
- [ ] Créer `InteractiveRebaseDialog.tsx`:
```typescript
import { useState, useEffect } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import { toast } from 'sonner';

interface RebaseTodoItem {
  action: string;
  hash: string;
  message: string;
}

interface InteractiveRebaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onto: string;
  onComplete: () => void;
}

const ACTIONS = [
  { value: 'pick', label: 'Pick', description: 'Use commit' },
  { value: 'reword', label: 'Reword', description: 'Edit commit message' },
  { value: 'squash', label: 'Squash', description: 'Meld into previous' },
  { value: 'fixup', label: 'Fixup', description: 'Meld, discard message' },
  { value: 'drop', label: 'Drop', description: 'Remove commit' },
];

export function InteractiveRebaseDialog({
  open,
  onOpenChange,
  onto,
  onComplete,
}: InteractiveRebaseDialogProps) {
  const { currentRepo } = useRepositoryStore();
  const [todoItems, setTodoItems] = useState<RebaseTodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRebasing, setIsRebasing] = useState(false);

  useEffect(() => {
    if (open && currentRepo) {
      loadCommits();
    }
  }, [open, currentRepo, onto]);

  const loadCommits = async () => {
    if (!currentRepo) return;
    setIsLoading(true);
    try {
      const commits = await tauriGitService.getRebaseCommits(currentRepo.path, onto);
      setTodoItems(commits);
    } catch (error) {
      toast.error(`Failed to load commits: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAction = (index: number, action: string) => {
    setTodoItems(items =>
      items.map((item, i) => (i === index ? { ...item, action } : item))
    );
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    setTodoItems(items => {
      const newItems = [...items];
      const [removed] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, removed);
      return newItems;
    });
  };

  const handleRebase = async () => {
    if (!currentRepo) return;
    setIsRebasing(true);
    try {
      await tauriGitService.interactiveRebase(currentRepo.path, onto, todoItems);
      toast.success('Interactive rebase completed');
      onOpenChange(false);
      onComplete();
    } catch (error) {
      if (String(error).includes('conflict')) {
        toast.error('Rebase conflict! Please resolve conflicts.');
        onOpenChange(false);
      } else {
        toast.error(`Rebase failed: ${error}`);
      }
    } finally {
      setIsRebasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Interactive Rebase</DialogTitle>
          <DialogDescription>
            Rebase onto <code>{onto}</code>. Drag to reorder, select action per commit.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-auto max-h-96 space-y-1 py-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading commits...</div>
          ) : todoItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No commits to rebase</div>
          ) : (
            todoItems.map((item, index) => (
              <div
                key={item.hash}
                className="flex items-center gap-2 p-2 rounded border bg-card"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <Select
                  value={item.action}
                  onValueChange={(value) => updateAction(index, value)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <code className="text-xs text-muted-foreground w-16">
                  {item.hash.slice(0, 7)}
                </code>
                <span className="flex-1 truncate text-sm">{item.message}</span>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRebase}
            disabled={isRebasing || todoItems.length === 0}
            variant="destructive"
          >
            {isRebasing ? 'Rebasing...' : 'Start Rebase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
- [ ] Ajouter méthodes au service frontend
- [ ] Ajouter option "Interactive rebase..." dans CommitItem context menu

---

## Tâche 18.3: Drag & Drop pour réorganiser

**Commit**: `feat: add drag and drop to interactive rebase`

**Fichiers**:
- `src/presentation/components/history/InteractiveRebaseDialog.tsx` (mise à jour)

**Actions**:
- [ ] Installer dnd-kit: `pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- [ ] Implémenter drag & drop avec @dnd-kit/sortable
- [ ] Permettre réorganisation visuelle des commits

---

## Progression: 0/3
