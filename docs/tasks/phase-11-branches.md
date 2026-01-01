# Phase 11: Branches

## Objectif
Gérer les branches (CRUD, checkout).

---

## Architecture DDD

### Aggregate: Branch

**Root Entity:** `Branch`

**Invariants:**
- Le nom de branche doit suivre les conventions Git
- Ne peut pas supprimer la branche courante
- Ne peut pas supprimer une branche avec des commits non mergés (sans force)

### Value Objects

| Value Object | Fichier | Description |
|--------------|---------|-------------|
| `BranchName` | `branch-name.vo.ts` | Nom de branche validé |
| `TrackingInfo` | `tracking-info.vo.ts` | Info de suivi (remote, ahead, behind) |

### Domain Events

| Event | Fichier | Payload |
|-------|---------|---------|
| `BranchCreated` | `branch-created.event.ts` | `{ name: string, startPoint?: string }` |
| `BranchDeleted` | `branch-deleted.event.ts` | `{ name: string, forced: boolean }` |
| `BranchCheckedOut` | `branch-checked-out.event.ts` | `{ name: string, previousBranch?: string }` |

### Repository Interface

```typescript
// src/domain/interfaces/branch.repository.ts
import type { Branch } from '@/domain/entities';

export interface IBranchRepository {
  getAll(repoPath: string): Promise<Branch[]>;
  create(repoPath: string, name: string, startPoint?: string): Promise<void>;
  delete(repoPath: string, name: string, force: boolean): Promise<void>;
  checkout(repoPath: string, name: string): Promise<void>;
}
```

### Infrastructure

- `TauriBranchRepository` - `src/infrastructure/repositories/tauri-branch.repository.ts`

### Application Hooks

- `useBranches` - `src/application/hooks/useBranches.ts`

### Mapping des chemins

| Ancien | Nouveau |
|--------|---------|
| `src/components/branches/` | `src/presentation/components/branches/` |

---

## Tâche 11.1: Parser branches (backend)

**Commit**: `feat: add branch parsing`

**Fichiers**:
- `src-tauri/src/git/branch.rs`
- `src-tauri/src/git/mod.rs` (mise à jour)

**Actions**:
- [x] Créer `src-tauri/src/git/branch.rs`:
```rust
use crate::git::error::GitError;
use crate::git::executor::GitExecutor;
use crate::git::types::Branch;

pub fn get_branches(executor: &GitExecutor) -> Result<Vec<Branch>, GitError> {
    let output = executor.execute_checked(&[
        "branch",
        "-a",
        "--format=%(refname:short)%00%(objectname:short)%00%(upstream:short)%00%(upstream:track)%00%(committerdate:iso8601)%00%(HEAD)",
    ])?;

    parse_branches(&output)
}

fn parse_branches(output: &str) -> Result<Vec<Branch>, GitError> {
    let mut branches = Vec::new();

    for line in output.lines().filter(|l| !l.is_empty()) {
        let parts: Vec<&str> = line.split('\0').collect();
        if parts.len() < 6 {
            continue;
        }

        let name = parts[0].to_string();
        let is_remote = name.starts_with("remotes/") || name.contains('/');
        let is_current = parts[5] == "*";

        let (remote_name, clean_name) = if is_remote {
            let clean = name.strip_prefix("remotes/").unwrap_or(&name);
            let parts: Vec<&str> = clean.splitn(2, '/').collect();
            if parts.len() == 2 {
                (Some(parts[0].to_string()), parts[1].to_string())
            } else {
                (None, clean.to_string())
            }
        } else {
            (None, name.clone())
        };

        // Parse ahead/behind from track info like "[ahead 1, behind 2]"
        let (ahead, behind) = parse_track_info(parts[3]);

        branches.push(Branch {
            name: clean_name,
            is_current,
            is_remote,
            remote_name,
            tracking: if parts[2].is_empty() { None } else { Some(parts[2].to_string()) },
            ahead,
            behind,
            last_commit_hash: if parts[1].is_empty() { None } else { Some(parts[1].to_string()) },
            last_commit_date: if parts[4].is_empty() { None } else { Some(parts[4].to_string()) },
        });
    }

    Ok(branches)
}

fn parse_track_info(track: &str) -> (u32, u32) {
    let mut ahead = 0;
    let mut behind = 0;

    if track.contains("ahead") {
        if let Some(n) = track
            .split("ahead ")
            .nth(1)
            .and_then(|s| s.split(|c: char| !c.is_numeric()).next())
            .and_then(|s| s.parse().ok())
        {
            ahead = n;
        }
    }

    if track.contains("behind") {
        if let Some(n) = track
            .split("behind ")
            .nth(1)
            .and_then(|s| s.split(|c: char| !c.is_numeric()).next())
            .and_then(|s| s.parse().ok())
        {
            behind = n;
        }
    }

    (ahead, behind)
}

pub fn create_branch(
    executor: &GitExecutor,
    name: &str,
    start_point: Option<&str>,
) -> Result<(), GitError> {
    let mut args = vec!["branch", name];
    if let Some(sp) = start_point {
        args.push(sp);
    }
    executor.execute_checked(&args)?;
    Ok(())
}

pub fn delete_branch(executor: &GitExecutor, name: &str, force: bool) -> Result<(), GitError> {
    let flag = if force { "-D" } else { "-d" };
    executor.execute_checked(&["branch", flag, name])?;
    Ok(())
}

pub fn checkout_branch(executor: &GitExecutor, name: &str) -> Result<(), GitError> {
    executor.execute_checked(&["checkout", name])?;
    Ok(())
}
```
- [x] Ajouter `pub mod branch;` dans `src-tauri/src/git/mod.rs`

---

## Tâche 11.2: Commandes branches (backend)

**Commit**: `feat: add branch commands`

**Fichiers**:
- `src-tauri/src/commands/branch.rs`
- `src-tauri/src/commands/mod.rs` (mise à jour)
- `src-tauri/src/lib.rs` (mise à jour)

**Actions**:
- [x] Créer `src-tauri/src/commands/branch.rs`:
```rust
use crate::git::{branch, executor::GitExecutor, types::Branch};

#[tauri::command]
pub async fn get_branches(repo_path: String) -> Result<Vec<Branch>, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::get_branches(&executor).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_branch(
    repo_path: String,
    name: String,
    start_point: Option<String>,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::create_branch(&executor, &name, start_point.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_branch(
    repo_path: String,
    name: String,
    force: bool,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::delete_branch(&executor, &name, force).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn checkout_branch(repo_path: String, name: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::checkout_branch(&executor, &name).map_err(|e| e.to_string())
}
```
- [x] Ajouter `pub mod branch;` dans `src-tauri/src/commands/mod.rs`
- [x] Ajouter les commandes au `generate_handler![]`
- [x] Ajouter dans `src/infrastructure/services/tauri-git.service.ts`:
```typescript
async getBranches(): Promise<Branch[]> {
  return invoke('get_branches', { repoPath: this.repoPath });
}

async createBranch(name: string, startPoint?: string): Promise<void> {
  return invoke('create_branch', {
    repoPath: this.repoPath,
    name,
    startPoint
  });
}

async deleteBranch(name: string, force: boolean = false): Promise<void> {
  return invoke('delete_branch', {
    repoPath: this.repoPath,
    name,
    force
  });
}

async checkoutBranch(name: string): Promise<void> {
  return invoke('checkout_branch', { repoPath: this.repoPath, name });
}
```

---

## Tâche 11.3: Créer BranchesView

**Commit**: `feat: add BranchesView component`

**Fichiers**:
- `src/components/branches/BranchesView.tsx`
- `src/components/branches/BranchList.tsx`
- `src/components/branches/BranchItem.tsx`
- `src/components/branches/index.ts`

**Actions**:
- [x] Créer le dossier `src/presentation/components/branches/`
- [x] Créer `src/presentation/components/branches/BranchesView.tsx`:
```typescript
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BranchList } from './BranchList';
import { CreateBranchDialog } from './CreateBranchDialog';
import { useRepositoryStore } from '@/store';
import { GitService } from '@/services/git';

export function BranchesView() {
  const { currentRepo, branches, setBranches } = useRepositoryStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadBranches = async () => {
    if (!currentRepo) return;
    try {
      const git = new GitService(currentRepo.path);
      const loadedBranches = await git.getBranches();
      setBranches(loadedBranches);
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  useEffect(() => {
    loadBranches();
  }, [currentRepo]);

  const localBranches = branches.filter((b) => !b.is_remote);
  const remoteBranches = branches.filter((b) => b.is_remote);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Branches</h2>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Branch
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        <BranchList
          title="Local Branches"
          branches={localBranches}
          onRefresh={loadBranches}
        />
        <BranchList
          title="Remote Branches"
          branches={remoteBranches}
          onRefresh={loadBranches}
        />
      </div>

      <CreateBranchDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={loadBranches}
      />
    </div>
  );
}
```
- [x] Créer `src/presentation/components/branches/BranchList.tsx`:
```typescript
import { BranchItem } from './BranchItem';
import type { Branch } from '@/types/git';

interface BranchListProps {
  title: string;
  branches: Branch[];
  onRefresh: () => void;
}

export function BranchList({ title, branches, onRefresh }: BranchListProps) {
  if (branches.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-1">
        {branches.map((branch) => (
          <BranchItem
            key={`${branch.remote_name ?? 'local'}-${branch.name}`}
            branch={branch}
            onAction={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}
```
- [x] Créer `src/presentation/components/branches/BranchItem.tsx`:
```typescript
import { GitBranch, Check, MoreHorizontal, Trash2 } from 'lucide-react';
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
import type { Branch } from '@/types/git';

interface BranchItemProps {
  branch: Branch;
  onAction: () => void;
}

export function BranchItem({ branch, onAction }: BranchItemProps) {
  const { currentRepo } = useRepositoryStore();

  const handleCheckout = async () => {
    if (!currentRepo) return;
    try {
      const git = new GitService(currentRepo.path);
      await git.checkoutBranch(branch.name);
      toast.success(`Switched to branch ${branch.name}`);
      onAction();
    } catch (error) {
      toast.error(`Failed to checkout: ${error}`);
    }
  };

  const handleDelete = async () => {
    if (!currentRepo) return;
    try {
      const git = new GitService(currentRepo.path);
      await git.deleteBranch(branch.name);
      toast.success(`Deleted branch ${branch.name}`);
      onAction();
    } catch (error) {
      toast.error(`Failed to delete: ${error}`);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded hover:bg-accent/50 group">
      <GitBranch className="h-4 w-4 text-muted-foreground" />

      <span className="flex-1 font-medium">
        {branch.remote_name ? `${branch.remote_name}/${branch.name}` : branch.name}
      </span>

      {branch.is_current && (
        <Badge variant="secondary" className="text-xs">
          <Check className="h-3 w-3 mr-1" />
          current
        </Badge>
      )}

      {(branch.ahead > 0 || branch.behind > 0) && (
        <span className="text-xs text-muted-foreground">
          {branch.ahead > 0 && `↑${branch.ahead}`}
          {branch.behind > 0 && `↓${branch.behind}`}
        </span>
      )}

      {!branch.is_remote && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!branch.is_current && (
              <DropdownMenuItem onClick={handleCheckout}>
                <Check className="h-4 w-4 mr-2" />
                Checkout
              </DropdownMenuItem>
            )}
            {!branch.is_current && (
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
```
- [x] Créer `src/presentation/components/branches/index.ts`

---

## Tâche 11.4: Créer CreateBranchDialog

**Commit**: `feat: add CreateBranchDialog`

**Fichiers**:
- `src/components/branches/CreateBranchDialog.tsx`

**Actions**:
- [x] Créer `src/presentation/components/branches/CreateBranchDialog.tsx`:
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

interface CreateBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateBranchDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateBranchDialogProps) {
  const { currentRepo } = useRepositoryStore();
  const [name, setName] = useState('');
  const [checkoutAfter, setCheckoutAfter] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!currentRepo || !name.trim()) return;

    setIsCreating(true);
    try {
      const git = new GitService(currentRepo.path);
      await git.createBranch(name.trim());

      if (checkoutAfter) {
        await git.checkoutBranch(name.trim());
      }

      toast.success(`Created branch ${name}`);
      setName('');
      onOpenChange(false);
      onCreated();
    } catch (error) {
      toast.error(`Failed to create branch: ${error}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Branch</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="branch-name">Branch Name</Label>
            <Input
              id="branch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="feature/my-feature"
              disabled={isCreating}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="checkout-after"
              checked={checkoutAfter}
              onCheckedChange={(checked) => setCheckoutAfter(checked === true)}
              disabled={isCreating}
            />
            <Label htmlFor="checkout-after" className="cursor-pointer">
              Checkout after creation
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
- [x] Installer le composant label: `pnpm dlx shadcn@latest add label`

---

## Tâche 11.5: Intégrer BranchesView

**Commit**: `feat: integrate BranchesView in app`

**Fichiers**:
- `src/App.tsx` (mise à jour)

**Actions**:
- [x] Mettre à jour `App.tsx`:
```typescript
import { BranchesView } from '@/presentation/components/branches';

case 'branches':
  return <BranchesView />;
```

---

## Tâche 11.6: Branch context menu (commit history)

**Commit**: `feat: add context menu to commit list for branch operations`

**Fichiers**:
- `src/presentation/components/history/CommitItem.tsx`
- `src-tauri/src/git/branch.rs`
- `src-tauri/src/commands/branch.rs`

**Actions**:
- [x] Ajouter menu contextuel sur les commits dans l'historique
- [x] Implémenter "Create branch here"
- [x] Implémenter "Checkout branch" pour les branches référencées
- [x] Implémenter "Delete branch" pour les branches locales
- [x] Implémenter "Rename branch" pour les branches locales
- [x] Implémenter "Delete remote branch" pour les branches distantes

---

## Tâche 11.7: Tag management

**Commit**: `feat: add tag management to commit context menu`

**Fichiers**:
- `src-tauri/src/git/tag.rs`
- `src-tauri/src/commands/tag.rs`
- `src/infrastructure/services/tauri-git.service.ts`
- `src/presentation/components/history/CommitItem.tsx`

**Actions**:
- [x] Créer module tag en Rust (get_tags, create_tag, delete_tag, delete_remote_tag)
- [x] Ajouter commandes Tauri pour les tags
- [x] Ajouter au service frontend
- [x] Intégrer dans le menu contextuel des commits

---

## Tâche 11.8: Branch switching dropdown

**Commit**: `feat: add branch switching dropdown in toolbar`

**Fichiers**:
- `src/presentation/components/layout/Toolbar.tsx`
- `src/presentation/components/layout/Sidebar.tsx`

**Actions**:
- [x] Transformer l'affichage statique de la branche en menu déroulant
- [x] Afficher toutes les branches locales avec indicateurs ahead/behind
- [x] Permettre le checkout en cliquant sur une branche
- [x] Supprimer l'onglet "Branches" de la sidebar (redondant)

---

## Progression: 8/8
