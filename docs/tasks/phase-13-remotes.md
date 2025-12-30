# Phase 13: Remotes

## Objectif
Gérer les remotes et les opérations fetch/pull/push.

---

## Tâche 13.1: Commandes remotes (backend)

**Commit**: `feat: add remote commands`

**Fichiers**:
- `src-tauri/src/git/remote.rs`
- `src-tauri/src/git/mod.rs` (mise à jour)
- `src-tauri/src/commands/remote.rs`
- `src-tauri/src/commands/mod.rs` (mise à jour)

**Actions**:
- [ ] Créer `src-tauri/src/git/remote.rs`:
```rust
use crate::git::error::GitError;
use crate::git::executor::GitExecutor;
use crate::git::types::Remote;

pub fn get_remotes(executor: &GitExecutor) -> Result<Vec<Remote>, GitError> {
    let output = executor.execute_checked(&["remote", "-v"])?;
    parse_remotes(&output)
}

fn parse_remotes(output: &str) -> Result<Vec<Remote>, GitError> {
    let mut remotes: std::collections::HashMap<String, Remote> = std::collections::HashMap::new();

    for line in output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 3 {
            continue;
        }

        let name = parts[0].to_string();
        let url = parts[1].to_string();
        let kind = parts[2]; // (fetch) or (push)

        let remote = remotes.entry(name.clone()).or_insert(Remote {
            name: name.clone(),
            fetch_url: String::new(),
            push_url: String::new(),
        });

        if kind == "(fetch)" {
            remote.fetch_url = url;
        } else if kind == "(push)" {
            remote.push_url = url;
        }
    }

    Ok(remotes.into_values().collect())
}

pub fn add_remote(executor: &GitExecutor, name: &str, url: &str) -> Result<(), GitError> {
    executor.execute_checked(&["remote", "add", name, url])?;
    Ok(())
}

pub fn remove_remote(executor: &GitExecutor, name: &str) -> Result<(), GitError> {
    executor.execute_checked(&["remote", "remove", name])?;
    Ok(())
}

pub fn fetch(executor: &GitExecutor, remote: Option<&str>, prune: bool) -> Result<(), GitError> {
    let mut args = vec!["fetch"];
    if let Some(r) = remote {
        args.push(r);
    } else {
        args.push("--all");
    }
    if prune {
        args.push("--prune");
    }
    executor.execute_checked(&args)?;
    Ok(())
}

pub fn pull(
    executor: &GitExecutor,
    remote: Option<&str>,
    branch: Option<&str>,
    rebase: bool,
) -> Result<(), GitError> {
    let mut args = vec!["pull"];
    if rebase {
        args.push("--rebase");
    }
    if let Some(r) = remote {
        args.push(r);
    }
    if let Some(b) = branch {
        args.push(b);
    }

    let result = executor.execute(&args)?;
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

pub fn push(
    executor: &GitExecutor,
    remote: Option<&str>,
    branch: Option<&str>,
    force: bool,
) -> Result<(), GitError> {
    let mut args = vec!["push"];
    if force {
        args.push("--force");
    }
    if let Some(r) = remote {
        args.push(r);
    }
    if let Some(b) = branch {
        args.push(b);
    }
    executor.execute_checked(&args)?;
    Ok(())
}
```
- [ ] Ajouter `pub mod remote;` dans `src-tauri/src/git/mod.rs`
- [ ] Créer `src-tauri/src/commands/remote.rs`:
```rust
use crate::git::{executor::GitExecutor, remote, types::Remote};

#[tauri::command]
pub async fn get_remotes(repo_path: String) -> Result<Vec<Remote>, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    remote::get_remotes(&executor).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_remote(repo_path: String, name: String, url: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    remote::add_remote(&executor, &name, &url).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_remote(repo_path: String, name: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    remote::remove_remote(&executor, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_remote(
    repo_path: String,
    remote: Option<String>,
    prune: bool,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    remote::fetch(&executor, remote.as_deref(), prune).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pull_remote(
    repo_path: String,
    remote: Option<String>,
    branch: Option<String>,
    rebase: bool,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    remote::pull(&executor, remote.as_deref(), branch.as_deref(), rebase)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn push_remote(
    repo_path: String,
    remote: Option<String>,
    branch: Option<String>,
    force: bool,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    remote::push(&executor, remote.as_deref(), branch.as_deref(), force)
        .map_err(|e| e.to_string())
}
```
- [ ] Ajouter `pub mod remote;` dans `src-tauri/src/commands/mod.rs`
- [ ] Ajouter les commandes au `generate_handler![]`

---

## Tâche 13.2: GitService frontend (remotes)

**Commit**: `feat: add remote methods to GitService`

**Fichiers**:
- `src/services/git/index.ts` (mise à jour)

**Actions**:
- [ ] Ajouter dans `src/services/git/index.ts`:
```typescript
async getRemotes(): Promise<Remote[]> {
  return invoke('get_remotes', { repoPath: this.repoPath });
}

async addRemote(name: string, url: string): Promise<void> {
  return invoke('add_remote', { repoPath: this.repoPath, name, url });
}

async removeRemote(name: string): Promise<void> {
  return invoke('remove_remote', { repoPath: this.repoPath, name });
}

async fetch(remote?: string, prune: boolean = false): Promise<void> {
  return invoke('fetch_remote', { repoPath: this.repoPath, remote, prune });
}

async pull(remote?: string, branch?: string, rebase: boolean = false): Promise<void> {
  return invoke('pull_remote', { repoPath: this.repoPath, remote, branch, rebase });
}

async push(remote?: string, branch?: string, force: boolean = false): Promise<void> {
  return invoke('push_remote', { repoPath: this.repoPath, remote, branch, force });
}
```

---

## Tâche 13.3: Créer RemotesView

**Commit**: `feat: add RemotesView component`

**Fichiers**:
- `src/components/remotes/RemotesView.tsx`
- `src/components/remotes/RemoteList.tsx`
- `src/components/remotes/index.ts`

**Actions**:
- [ ] Créer le dossier `src/components/remotes/`
- [ ] Créer `src/components/remotes/RemotesView.tsx`:
```typescript
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RemoteList } from './RemoteList';
import { AddRemoteDialog } from './AddRemoteDialog';
import { useRepositoryStore } from '@/store';
import { GitService } from '@/services/git';
import type { Remote } from '@/types/git';

export function RemotesView() {
  const { currentRepo } = useRepositoryStore();
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const loadRemotes = async () => {
    if (!currentRepo) return;
    try {
      const git = new GitService(currentRepo.path);
      const loaded = await git.getRemotes();
      setRemotes(loaded);
    } catch (error) {
      console.error('Failed to load remotes:', error);
    }
  };

  useEffect(() => {
    loadRemotes();
  }, [currentRepo]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Remotes</h2>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Remote
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <RemoteList remotes={remotes} onRefresh={loadRemotes} />
      </div>

      <AddRemoteDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdded={loadRemotes}
      />
    </div>
  );
}
```
- [ ] Créer `src/components/remotes/RemoteList.tsx`:
```typescript
import { Globe, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRepositoryStore } from '@/store';
import { GitService } from '@/services/git';
import { toast } from 'sonner';
import type { Remote } from '@/types/git';

interface RemoteListProps {
  remotes: Remote[];
  onRefresh: () => void;
}

export function RemoteList({ remotes, onRefresh }: RemoteListProps) {
  const { currentRepo } = useRepositoryStore();

  const handleRemove = async (name: string) => {
    if (!currentRepo) return;
    try {
      const git = new GitService(currentRepo.path);
      await git.removeRemote(name);
      toast.success(`Removed remote ${name}`);
      onRefresh();
    } catch (error) {
      toast.error(`Failed to remove: ${error}`);
    }
  };

  if (remotes.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No remotes configured
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {remotes.map((remote) => (
        <div
          key={remote.name}
          className="flex items-start gap-3 p-3 rounded-lg border"
        >
          <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-medium">{remote.name}</div>
            <div className="text-sm text-muted-foreground truncate">
              {remote.fetch_url}
            </div>
            {remote.push_url !== remote.fetch_url && (
              <div className="text-sm text-muted-foreground truncate">
                Push: {remote.push_url}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleRemove(remote.name)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
```
- [ ] Créer `src/components/remotes/index.ts`

---

## Tâche 13.4: Créer PushDialog

**Commit**: `feat: add PushDialog`

**Fichiers**:
- `src/components/remotes/PushDialog.tsx`

**Actions**:
- [ ] Créer `src/components/remotes/PushDialog.tsx`:
```typescript
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRepositoryStore } from '@/store';
import { GitService } from '@/services/git';
import { toast } from 'sonner';

interface PushDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPushed: () => void;
}

export function PushDialog({ open, onOpenChange, onPushed }: PushDialogProps) {
  const { currentRepo, status } = useRepositoryStore();
  const [force, setForce] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  const handlePush = async () => {
    if (!currentRepo) return;

    setIsPushing(true);
    try {
      const git = new GitService(currentRepo.path);
      await git.push(undefined, undefined, force);
      toast.success('Pushed successfully');
      onOpenChange(false);
      onPushed();
    } catch (error) {
      toast.error(`Push failed: ${error}`);
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Push to Remote</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status && status.ahead > 0 && (
            <p className="text-sm text-muted-foreground">
              You have {status.ahead} commit(s) to push.
            </p>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="force-push"
              checked={force}
              onCheckedChange={(checked) => setForce(checked === true)}
            />
            <Label htmlFor="force-push" className="cursor-pointer">
              Force push
            </Label>
          </div>

          {force && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Force push will overwrite remote history.
                This can cause issues for other collaborators.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePush}
            disabled={isPushing}
            variant={force ? 'destructive' : 'default'}
          >
            {isPushing ? 'Pushing...' : 'Push'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Tâche 13.5: Créer PullDialog

**Commit**: `feat: add PullDialog`

**Fichiers**:
- `src/components/remotes/PullDialog.tsx`

**Actions**:
- [ ] Créer `src/components/remotes/PullDialog.tsx`:
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useRepositoryStore } from '@/store';
import { GitService } from '@/services/git';
import { toast } from 'sonner';

interface PullDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPulled: () => void;
}

export function PullDialog({ open, onOpenChange, onPulled }: PullDialogProps) {
  const { currentRepo, status } = useRepositoryStore();
  const [rebase, setRebase] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const handlePull = async () => {
    if (!currentRepo) return;

    setIsPulling(true);
    try {
      const git = new GitService(currentRepo.path);
      await git.pull(undefined, undefined, rebase);
      toast.success('Pulled successfully');
      onOpenChange(false);
      onPulled();
    } catch (error) {
      if (String(error).includes('conflict')) {
        toast.error('Pull resulted in conflicts. Please resolve them.');
      } else {
        toast.error(`Pull failed: ${error}`);
      }
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pull from Remote</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status && status.behind > 0 && (
            <p className="text-sm text-muted-foreground">
              You are {status.behind} commit(s) behind remote.
            </p>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="rebase"
              checked={rebase}
              onCheckedChange={(checked) => setRebase(checked === true)}
            />
            <Label htmlFor="rebase" className="cursor-pointer">
              Rebase instead of merge
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePull} disabled={isPulling}>
            {isPulling ? 'Pulling...' : 'Pull'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Tâche 13.6: Intégrer dans Toolbar

**Commit**: `feat: add fetch/pull/push to toolbar`

**Fichiers**:
- `src/components/layout/Toolbar.tsx` (mise à jour)

**Actions**:
- [ ] Mettre à jour `Toolbar.tsx`:
```typescript
import { useState } from 'react';
import { PushDialog } from '@/components/remotes/PushDialog';
import { PullDialog } from '@/components/remotes/PullDialog';

// Dans le composant:
const [showPushDialog, setShowPushDialog] = useState(false);
const [showPullDialog, setShowPullDialog] = useState(false);
const [isFetching, setIsFetching] = useState(false);

const handleFetch = async () => {
  if (!currentRepo) return;
  setIsFetching(true);
  try {
    const git = new GitService(currentRepo.path);
    await git.fetch();
    toast.success('Fetched successfully');
  } catch (error) {
    toast.error(`Fetch failed: ${error}`);
  } finally {
    setIsFetching(false);
  }
};

// Dans le JSX, mettre à jour les boutons:
<Button
  variant="ghost"
  size="sm"
  disabled={!currentRepo || isFetching}
  onClick={handleFetch}
>
  <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
  Fetch
</Button>

<Button
  variant="ghost"
  size="sm"
  disabled={!currentRepo}
  onClick={() => setShowPullDialog(true)}
>
  <ArrowDown className="mr-2 h-4 w-4" />
  Pull
  {status && status.behind > 0 && (
    <Badge variant="secondary" className="ml-2">
      {status.behind}
    </Badge>
  )}
</Button>

<Button
  variant="ghost"
  size="sm"
  disabled={!currentRepo}
  onClick={() => setShowPushDialog(true)}
>
  <ArrowUp className="mr-2 h-4 w-4" />
  Push
  {status && status.ahead > 0 && (
    <Badge variant="secondary" className="ml-2">
      {status.ahead}
    </Badge>
  )}
</Button>

// Ajouter les dialogs:
<PushDialog open={showPushDialog} onOpenChange={setShowPushDialog} onPushed={() => {}} />
<PullDialog open={showPullDialog} onOpenChange={setShowPullDialog} onPulled={() => {}} />
```

---

## Progression: 0/6
