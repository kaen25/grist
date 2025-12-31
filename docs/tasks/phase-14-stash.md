# Phase 14: Stash

## Objectif
Gérer les stash (save, apply, pop, drop).

---

## Architecture DDD

### Aggregate: Stash

**Root Entity:** `Stash`

**Invariants:**
- L'index du stash est unique et séquentiel
- Un stash avec des fichiers untracked doit avoir été créé avec --include-untracked

### Value Objects

| Value Object | Fichier | Description |
|--------------|---------|-------------|
| `StashRef` | `stash-ref.vo.ts` | Référence stash (stash@{N}) |
| `StashOptions` | `stash-options.vo.ts` | Options de création |

### Domain Events

| Event | Fichier | Payload |
|-------|---------|---------|
| `StashCreated` | `stash-created.event.ts` | `{ index: number, message: string }` |
| `StashApplied` | `stash-applied.event.ts` | `{ index: number, dropped: boolean }` |
| `StashDropped` | `stash-dropped.event.ts` | `{ index: number }` |

### Repository Interface

```typescript
// src/domain/interfaces/stash.repository.ts
import type { Stash } from '@/domain/entities';

export interface IStashRepository {
  getAll(repoPath: string): Promise<Stash[]>;
  create(repoPath: string, message?: string, includeUntracked?: boolean): Promise<void>;
  apply(repoPath: string, index: number): Promise<void>;
  pop(repoPath: string, index: number): Promise<void>;
  drop(repoPath: string, index: number): Promise<void>;
}
```

### Application Hooks

- `useStash` - `src/application/hooks/useStash.ts`

### Mapping des chemins

| Ancien | Nouveau |
|--------|---------|
| `src/components/stash/` | `src/presentation/components/stash/` |

---

## Tâche 14.1: Commandes stash (backend)

**Commit**: `feat: add stash commands`

**Fichiers**:
- `src-tauri/src/git/stash.rs`
- `src-tauri/src/git/mod.rs` (mise à jour)
- `src-tauri/src/commands/stash.rs`
- `src-tauri/src/commands/mod.rs` (mise à jour)

**Actions**:
- [ ] Créer `src-tauri/src/git/stash.rs`:
```rust
use crate::git::error::GitError;
use crate::git::executor::GitExecutor;
use crate::git::types::Stash;

pub fn get_stashes(executor: &GitExecutor) -> Result<Vec<Stash>, GitError> {
    let output = executor.execute_checked(&[
        "stash",
        "list",
        "--format=%gd%x00%s%x00%gs%x00---END---",
    ])?;

    parse_stashes(&output)
}

fn parse_stashes(output: &str) -> Result<Vec<Stash>, GitError> {
    let mut stashes = Vec::new();

    for entry in output.split("---END---").filter(|s| !s.trim().is_empty()) {
        let parts: Vec<&str> = entry.trim().split('\0').collect();
        if parts.len() < 3 {
            continue;
        }

        // Parse stash@{N}
        let index_str = parts[0]
            .trim_start_matches("stash@{")
            .trim_end_matches('}');
        let index: u32 = index_str.parse().unwrap_or(0);

        // Extract branch from "WIP on branch: message" or "On branch: message"
        let gs = parts[2];
        let branch = gs
            .split(':')
            .next()
            .unwrap_or("")
            .replace("WIP on ", "")
            .replace("On ", "")
            .trim()
            .to_string();

        stashes.push(Stash {
            index,
            message: parts[1].to_string(),
            branch,
            date: String::new(), // Could parse from reflog if needed
        });
    }

    Ok(stashes)
}

pub fn create_stash(
    executor: &GitExecutor,
    message: Option<&str>,
    include_untracked: bool,
) -> Result<(), GitError> {
    let mut args = vec!["stash", "push"];
    if include_untracked {
        args.push("--include-untracked");
    }
    if let Some(msg) = message {
        args.push("-m");
        args.push(msg);
    }
    executor.execute_checked(&args)?;
    Ok(())
}

pub fn apply_stash(executor: &GitExecutor, index: u32) -> Result<(), GitError> {
    let stash_ref = format!("stash@{{{}}}", index);
    executor.execute_checked(&["stash", "apply", &stash_ref])?;
    Ok(())
}

pub fn pop_stash(executor: &GitExecutor, index: u32) -> Result<(), GitError> {
    let stash_ref = format!("stash@{{{}}}", index);
    executor.execute_checked(&["stash", "pop", &stash_ref])?;
    Ok(())
}

pub fn drop_stash(executor: &GitExecutor, index: u32) -> Result<(), GitError> {
    let stash_ref = format!("stash@{{{}}}", index);
    executor.execute_checked(&["stash", "drop", &stash_ref])?;
    Ok(())
}
```
- [ ] Ajouter `pub mod stash;` dans `src-tauri/src/git/mod.rs`
- [ ] Créer `src-tauri/src/commands/stash.rs`:
```rust
use crate::git::{executor::GitExecutor, stash, types::Stash};

#[tauri::command]
pub async fn get_stashes(repo_path: String) -> Result<Vec<Stash>, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    stash::get_stashes(&executor).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_stash(
    repo_path: String,
    message: Option<String>,
    include_untracked: bool,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    stash::create_stash(&executor, message.as_deref(), include_untracked)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn apply_stash(repo_path: String, index: u32) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    stash::apply_stash(&executor, index).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pop_stash(repo_path: String, index: u32) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    stash::pop_stash(&executor, index).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn drop_stash(repo_path: String, index: u32) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    stash::drop_stash(&executor, index).map_err(|e| e.to_string())
}
```
- [ ] Ajouter `pub mod stash;` dans `src-tauri/src/commands/mod.rs`
- [ ] Ajouter les commandes au `generate_handler![]`

---

## Tâche 14.2: Créer StashView

**Commit**: `feat: add StashView component`

**Fichiers**:
- `src/components/stash/StashView.tsx`
- `src/components/stash/StashList.tsx`
- `src/components/stash/StashItem.tsx`
- `src/components/stash/index.ts`
- `src/services/git/index.ts` (mise à jour)

**Actions**:
- [ ] Créer le dossier `src/components/stash/`
- [ ] Ajouter dans `src/services/git/index.ts`:
```typescript
async getStashes(): Promise<Stash[]> {
  return invoke('get_stashes', { repoPath: this.repoPath });
}

async createStash(message?: string, includeUntracked: boolean = false): Promise<void> {
  return invoke('create_stash', {
    repoPath: this.repoPath,
    message,
    includeUntracked
  });
}

async applyStash(index: number): Promise<void> {
  return invoke('apply_stash', { repoPath: this.repoPath, index });
}

async popStash(index: number): Promise<void> {
  return invoke('pop_stash', { repoPath: this.repoPath, index });
}

async dropStash(index: number): Promise<void> {
  return invoke('drop_stash', { repoPath: this.repoPath, index });
}
```
- [ ] Créer `src/components/stash/StashView.tsx`:
```typescript
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StashList } from './StashList';
import { CreateStashDialog } from './CreateStashDialog';
import { useRepositoryStore } from '@/store';
import { GitService } from '@/services/git';
import type { Stash } from '@/types/git';

export function StashView() {
  const { currentRepo } = useRepositoryStore();
  const [stashes, setStashes] = useState<Stash[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadStashes = async () => {
    if (!currentRepo) return;
    try {
      const git = new GitService(currentRepo.path);
      const loaded = await git.getStashes();
      setStashes(loaded);
    } catch (error) {
      console.error('Failed to load stashes:', error);
    }
  };

  useEffect(() => {
    loadStashes();
  }, [currentRepo]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Stash</h2>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Stash Changes
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <StashList stashes={stashes} onRefresh={loadStashes} />
      </div>

      <CreateStashDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={loadStashes}
      />
    </div>
  );
}
```
- [ ] Créer `src/components/stash/StashList.tsx` et `StashItem.tsx`
- [ ] Créer `src/components/stash/index.ts`

---

## Tâche 14.3: Actions stash

**Commit**: `feat: add stash actions`

**Fichiers**:
- `src/components/stash/StashItem.tsx`

**Actions**:
- [ ] Créer `src/components/stash/StashItem.tsx`:
```typescript
import { Archive, Play, Trash2, Copy, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRepositoryStore } from '@/store';
import { GitService } from '@/services/git';
import { toast } from 'sonner';
import type { Stash } from '@/types/git';

interface StashItemProps {
  stash: Stash;
  onAction: () => void;
}

export function StashItem({ stash, onAction }: StashItemProps) {
  const { currentRepo } = useRepositoryStore();

  const handleApply = async () => {
    if (!currentRepo) return;
    try {
      const git = new GitService(currentRepo.path);
      await git.applyStash(stash.index);
      toast.success('Stash applied');
      onAction();
    } catch (error) {
      toast.error(`Failed to apply: ${error}`);
    }
  };

  const handlePop = async () => {
    if (!currentRepo) return;
    try {
      const git = new GitService(currentRepo.path);
      await git.popStash(stash.index);
      toast.success('Stash popped');
      onAction();
    } catch (error) {
      toast.error(`Failed to pop: ${error}`);
    }
  };

  const handleDrop = async () => {
    if (!currentRepo) return;
    try {
      const git = new GitService(currentRepo.path);
      await git.dropStash(stash.index);
      toast.success('Stash dropped');
      onAction();
    } catch (error) {
      toast.error(`Failed to drop: ${error}`);
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border group">
      <Archive className="h-5 w-5 text-muted-foreground mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            stash@{`{${stash.index}}`}
          </span>
          {stash.branch && (
            <Badge variant="outline" className="text-xs">
              {stash.branch}
            </Badge>
          )}
        </div>
        <div className="font-medium mt-1">{stash.message}</div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleApply}>
            <Copy className="h-4 w-4 mr-2" />
            Apply
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePop}>
            <Play className="h-4 w-4 mr-2" />
            Pop
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDrop} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Drop
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

---

## Tâche 14.4: Créer CreateStashDialog

**Commit**: `feat: add CreateStashDialog`

**Fichiers**:
- `src/components/stash/CreateStashDialog.tsx`

**Actions**:
- [ ] Créer `src/components/stash/CreateStashDialog.tsx`:
```typescript
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useRepositoryStore } from '@/store';
import { GitService } from '@/services/git';
import { toast } from 'sonner';

interface CreateStashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateStashDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateStashDialogProps) {
  const { currentRepo } = useRepositoryStore();
  const [message, setMessage] = useState('');
  const [includeUntracked, setIncludeUntracked] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!currentRepo) return;

    setIsCreating(true);
    try {
      const git = new GitService(currentRepo.path);
      await git.createStash(message || undefined, includeUntracked);
      toast.success('Stash created');
      setMessage('');
      setIncludeUntracked(false);
      onOpenChange(false);
      onCreated();
    } catch (error) {
      toast.error(`Failed to create stash: ${error}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stash Changes</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="stash-message">Message (optional)</Label>
            <Input
              id="stash-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="WIP: ..."
              disabled={isCreating}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="include-untracked"
              checked={includeUntracked}
              onCheckedChange={(checked) => setIncludeUntracked(checked === true)}
              disabled={isCreating}
            />
            <Label htmlFor="include-untracked" className="cursor-pointer">
              Include untracked files
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Stash'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
- [ ] Mettre à jour `src/App.tsx`:
```typescript
import { StashView } from '@/components/stash';

case 'stash':
  return <StashView />;
```

---

## Progression: 0/4
