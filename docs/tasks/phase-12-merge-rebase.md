# Phase 12: Merge & Rebase

## Objectif
Permettre les opérations merge et rebase avec gestion des conflits.

---

## Tâche 12.1: Commandes merge/rebase (backend)

**Commit**: `feat: add merge and rebase commands`

**Fichiers**:
- `src-tauri/src/git/branch.rs` (mise à jour)
- `src-tauri/src/commands/branch.rs` (mise à jour)

**Actions**:
- [ ] Ajouter dans `src-tauri/src/git/branch.rs`:
```rust
pub fn merge_branch(
    executor: &GitExecutor,
    name: &str,
    no_ff: bool,
) -> Result<(), GitError> {
    let mut args = vec!["merge", name];
    if no_ff {
        args.push("--no-ff");
    }

    let result = executor.execute(&args)?;

    if result.exit_code != 0 {
        if result.stderr.contains("CONFLICT") || result.stdout.contains("CONFLICT") {
            return Err(GitError::MergeConflict);
        }
        return Err(GitError::CommandFailed {
            code: result.exit_code,
            stderr: result.stderr,
        });
    }

    Ok(())
}

pub fn rebase_branch(executor: &GitExecutor, onto: &str) -> Result<(), GitError> {
    let result = executor.execute(&["rebase", onto])?;

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

pub fn abort_merge(executor: &GitExecutor) -> Result<(), GitError> {
    executor.execute_checked(&["merge", "--abort"])?;
    Ok(())
}

pub fn abort_rebase(executor: &GitExecutor) -> Result<(), GitError> {
    executor.execute_checked(&["rebase", "--abort"])?;
    Ok(())
}

pub fn continue_rebase(executor: &GitExecutor) -> Result<(), GitError> {
    executor.execute_checked(&["rebase", "--continue"])?;
    Ok(())
}
```
- [ ] Ajouter les commandes Tauri dans `commands/branch.rs`:
```rust
#[tauri::command]
pub async fn merge_branch(
    repo_path: String,
    name: String,
    no_ff: bool,
) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::merge_branch(&executor, &name, no_ff).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rebase_branch(repo_path: String, onto: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::rebase_branch(&executor, &onto).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn abort_merge(repo_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::abort_merge(&executor).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn abort_rebase(repo_path: String) -> Result<(), String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    branch::abort_rebase(&executor).map_err(|e| e.to_string())
}
```
- [ ] Ajouter les commandes au `generate_handler![]`

---

## Tâche 12.2: Créer MergeDialog

**Commit**: `feat: add MergeDialog`

**Fichiers**:
- `src/components/branches/MergeDialog.tsx`
- `src/services/git/index.ts` (mise à jour)

**Actions**:
- [ ] Ajouter dans `src/services/git/index.ts`:
```typescript
async mergeBranch(name: string, noFf: boolean = false): Promise<void> {
  return invoke('merge_branch', {
    repoPath: this.repoPath,
    name,
    noFf
  });
}

async rebaseBranch(onto: string): Promise<void> {
  return invoke('rebase_branch', { repoPath: this.repoPath, onto });
}

async abortMerge(): Promise<void> {
  return invoke('abort_merge', { repoPath: this.repoPath });
}

async abortRebase(): Promise<void> {
  return invoke('abort_rebase', { repoPath: this.repoPath });
}
```
- [ ] Créer `src/components/branches/MergeDialog.tsx`:
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRepositoryStore } from '@/store';
import { GitService } from '@/services/git';
import { toast } from 'sonner';

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMerged: () => void;
}

export function MergeDialog({ open, onOpenChange, onMerged }: MergeDialogProps) {
  const { currentRepo, branches, status } = useRepositoryStore();
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [noFf, setNoFf] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  const availableBranches = branches.filter(
    (b) => !b.is_current && !b.is_remote
  );

  const handleMerge = async () => {
    if (!currentRepo || !selectedBranch) return;

    setIsMerging(true);
    try {
      const git = new GitService(currentRepo.path);
      await git.mergeBranch(selectedBranch, noFf);
      toast.success(`Merged ${selectedBranch} successfully`);
      onOpenChange(false);
      onMerged();
    } catch (error) {
      if (String(error).includes('conflict')) {
        toast.error('Merge conflict! Please resolve conflicts and commit.');
      } else {
        toast.error(`Merge failed: ${error}`);
      }
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Merge into {status?.branch ?? 'current branch'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Branch to merge</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {availableBranches.map((branch) => (
                  <SelectItem key={branch.name} value={branch.name}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="no-ff"
              checked={noFf}
              onCheckedChange={(checked) => setNoFf(checked === true)}
            />
            <Label htmlFor="no-ff" className="cursor-pointer">
              Create merge commit (--no-ff)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleMerge}
            disabled={!selectedBranch || isMerging}
          >
            {isMerging ? 'Merging...' : 'Merge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Tâche 12.3: Créer RebaseDialog

**Commit**: `feat: add RebaseDialog`

**Fichiers**:
- `src/components/branches/RebaseDialog.tsx`

**Actions**:
- [ ] Créer `src/components/branches/RebaseDialog.tsx`:
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRepositoryStore } from '@/store';
import { GitService } from '@/services/git';
import { toast } from 'sonner';

interface RebaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRebased: () => void;
}

export function RebaseDialog({ open, onOpenChange, onRebased }: RebaseDialogProps) {
  const { currentRepo, branches, status } = useRepositoryStore();
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isRebasing, setIsRebasing] = useState(false);

  const availableBranches = branches.filter((b) => !b.is_current);
  const hasPushed = status && status.ahead === 0 && status.behind === 0;

  const handleRebase = async () => {
    if (!currentRepo || !selectedBranch) return;

    setIsRebasing(true);
    try {
      const git = new GitService(currentRepo.path);
      await git.rebaseBranch(selectedBranch);
      toast.success(`Rebased onto ${selectedBranch} successfully`);
      onOpenChange(false);
      onRebased();
    } catch (error) {
      if (String(error).includes('conflict')) {
        toast.error('Rebase conflict! Please resolve conflicts.');
      } else {
        toast.error(`Rebase failed: ${error}`);
      }
    } finally {
      setIsRebasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Rebase {status?.branch ?? 'current branch'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status && status.ahead > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Warning: You have {status.ahead} unpushed commit(s).
                Rebasing will rewrite history. Force push will be required.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Rebase onto</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {availableBranches.map((branch) => (
                  <SelectItem
                    key={`${branch.remote_name ?? ''}-${branch.name}`}
                    value={branch.is_remote ? `${branch.remote_name}/${branch.name}` : branch.name}
                  >
                    {branch.is_remote
                      ? `${branch.remote_name}/${branch.name}`
                      : branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRebase}
            disabled={!selectedBranch || isRebasing}
            variant="destructive"
          >
            {isRebasing ? 'Rebasing...' : 'Rebase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Tâche 12.4: Gestion conflits

**Commit**: `feat: add merge conflict handling`

**Fichiers**:
- `src/components/status/ConflictBanner.tsx`
- `src/components/status/StatusView.tsx` (mise à jour)

**Actions**:
- [ ] Créer `src/components/status/ConflictBanner.tsx`:
```typescript
import { AlertTriangle, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRepositoryStore } from '@/store';
import { GitService } from '@/services/git';
import { toast } from 'sonner';

export function ConflictBanner() {
  const { currentRepo, status } = useRepositoryStore();

  if (!status || status.conflicted.length === 0) return null;

  const handleAbort = async () => {
    if (!currentRepo) return;
    try {
      const git = new GitService(currentRepo.path);
      // Try both - one will succeed depending on the operation type
      try {
        await git.abortMerge();
      } catch {
        await git.abortRebase();
      }
      toast.success('Operation aborted');
    } catch (error) {
      toast.error(`Failed to abort: ${error}`);
    }
  };

  return (
    <Alert variant="destructive" className="m-2">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Merge Conflict</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          {status.conflicted.length} file(s) have conflicts.
          Resolve them and stage to continue.
        </span>
        <Button variant="outline" size="sm" onClick={handleAbort}>
          <X className="h-4 w-4 mr-2" />
          Abort
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```
- [ ] Ajouter `ConflictBanner` dans `StatusView.tsx`:
```typescript
import { ConflictBanner } from './ConflictBanner';

// Au début du composant StatusView, après ResizablePanelGroup:
<div className="flex flex-col h-full">
  <ConflictBanner />
  <ResizablePanelGroup ...>
    ...
  </ResizablePanelGroup>
</div>
```

---

## Progression: 0/4
