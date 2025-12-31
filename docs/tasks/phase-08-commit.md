# Phase 8: Commit

## Objectif
Permettre de créer des commits avec support amend.

---

## Architecture DDD

### Aggregate: Commit

**Root Entity:** `Commit`

**Invariants:**
- Un commit doit avoir un message non vide
- La ligne de sujet ne devrait pas dépasser 50 caractères (warning)
- Le corps du message doit être séparé du sujet par une ligne vide

### Value Objects (src/domain/value-objects/)

| Value Object | Fichier | Description |
|--------------|---------|-------------|
| `CommitMessage` | `commit-message.vo.ts` | Message de commit (subject + body) |
| `CommitHash` | `commit-hash.vo.ts` | Hash de commit (full + short) |
| `Author` | `author.vo.ts` | Auteur (name + email) |

```typescript
// src/domain/value-objects/commit-message.vo.ts
export interface CommitMessage {
  readonly subject: string;
  readonly body: string;
}

export function parseCommitMessage(message: string): CommitMessage {
  const lines = message.split('\n');
  const subject = lines[0] || '';
  const body = lines.slice(2).join('\n').trim();
  return { subject, body };
}

export function isSubjectTooLong(subject: string): boolean {
  return subject.length > 50;
}
```

### Domain Events (src/domain/events/)

| Event | Fichier | Payload |
|-------|---------|---------|
| `CommitCreated` | `commit-created.event.ts` | `{ hash: string, message: string, amend: boolean }` |
| `CommitAmended` | `commit-amended.event.ts` | `{ hash: string, previousHash: string }` |

### Domain Services (src/domain/services/)

```typescript
// src/domain/services/commit-message-validator.service.ts
export const CommitMessageValidator = {
  validate(message: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!message.trim()) {
      errors.push('Commit message cannot be empty');
    }
    return { valid: errors.length === 0, errors };
  },

  getWarnings(message: string): string[] {
    const warnings: string[] = [];
    const subject = message.split('\n')[0] || '';
    if (subject.length > 50) {
      warnings.push('Subject line exceeds 50 characters');
    } else if (subject.length > 40) {
      warnings.push('Subject line is getting long');
    }
    return warnings;
  },
};
```

### Repository Interface (src/domain/interfaces/)

```typescript
// src/domain/interfaces/commit.repository.ts
export interface ICommitRepository {
  create(repoPath: string, message: string, amend: boolean): Promise<string>;
  getLastMessage(repoPath: string): Promise<string>;
}
```

### Infrastructure (src/infrastructure/repositories/)

```typescript
// src/infrastructure/repositories/tauri-commit.repository.ts
import { invoke } from '@tauri-apps/api/core';
import type { ICommitRepository } from '@/domain/interfaces';

export class TauriCommitRepository implements ICommitRepository {
  async create(repoPath: string, message: string, amend: boolean): Promise<string> {
    return invoke('create_commit', { repoPath, message, amend });
  }
  async getLastMessage(repoPath: string): Promise<string> {
    return invoke('get_last_commit_message', { repoPath });
  }
}
```

### Application Hooks (src/application/hooks/)

```typescript
// src/application/hooks/useCommit.ts
import { useState, useCallback } from 'react';
import { TauriCommitRepository } from '@/infrastructure/repositories';
import { useRepositoryStore } from '@/application/stores';
import { CommitMessageValidator } from '@/domain/services/commit-message-validator.service';

const commitRepository = new TauriCommitRepository();

export function useCommit() {
  const { currentRepo } = useRepositoryStore();
  const [isCommitting, setIsCommitting] = useState(false);

  const createCommit = useCallback(async (message: string, amend: boolean) => {
    if (!currentRepo) return;
    const { valid, errors } = CommitMessageValidator.validate(message);
    if (!valid) throw new Error(errors.join(', '));

    setIsCommitting(true);
    try {
      return await commitRepository.create(currentRepo.path, message, amend);
    } finally {
      setIsCommitting(false);
    }
  }, [currentRepo]);

  return { createCommit, isCommitting };
}
```

### Mapping des chemins (ancien → nouveau)

| Ancien | Nouveau |
|--------|---------|
| `src/services/git/index.ts` (commit) | `src/infrastructure/repositories/tauri-commit.repository.ts` |
| `src/components/commit/` | `src/presentation/components/commit/` |
| Validation inline | `CommitMessageValidator` |

---

## Tâche 8.1: Commande create_commit (backend)

**Commit**: `feat: add create_commit command`

**Fichiers**:
- `src-tauri/src/git/commit.rs`
- `src-tauri/src/git/mod.rs` (mise à jour)
- `src-tauri/src/commands/commit.rs`
- `src-tauri/src/commands/mod.rs` (mise à jour)
- `src-tauri/src/lib.rs` (mise à jour)

**Actions**:
- [ ] Créer `src-tauri/src/git/commit.rs`:
```rust
use crate::git::error::GitError;
use crate::git::executor::GitExecutor;

pub fn create_commit(
    executor: &GitExecutor,
    message: &str,
    amend: bool,
) -> Result<String, GitError> {
    let mut args = vec!["commit", "-m", message];
    if amend {
        args.push("--amend");
    }

    executor.execute_checked(&args)?;

    // Get the new commit hash
    let hash = executor.execute_checked(&["rev-parse", "HEAD"])?;
    Ok(hash.trim().to_string())
}

pub fn get_last_commit_message(executor: &GitExecutor) -> Result<String, GitError> {
    let output = executor.execute_checked(&["log", "-1", "--format=%B"])?;
    Ok(output.trim().to_string())
}
```
- [ ] Ajouter `pub mod commit;` dans `src-tauri/src/git/mod.rs`
- [ ] Créer `src-tauri/src/commands/commit.rs`:
```rust
use crate::git::{commit, executor::GitExecutor};

#[tauri::command]
pub async fn create_commit(
    repo_path: String,
    message: String,
    amend: bool,
) -> Result<String, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    commit::create_commit(&executor, &message, amend).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_last_commit_message(repo_path: String) -> Result<String, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    commit::get_last_commit_message(&executor).map_err(|e| e.to_string())
}
```
- [ ] Ajouter `pub mod commit;` dans `src-tauri/src/commands/mod.rs`
- [ ] Ajouter les commandes au `generate_handler![]`

---

## Tâche 8.2: Support amend (déjà inclus dans 8.1)

**Commit**: `feat: add amend commit support`

**Actions**:
- [ ] Vérifier que `amend` fonctionne dans `create_commit`
- [ ] Ajouter `get_last_commit_message` pour pré-remplir le message

---

## Tâche 8.3: Créer CommitPanel

**Commit**: `feat: add CommitPanel component`

**Fichiers**:
- `src/components/commit/CommitPanel.tsx`
- `src/components/commit/index.ts`
- `src/services/git/index.ts` (mise à jour)

**Actions**:
- [ ] Créer le dossier `src/components/commit/`
- [ ] Ajouter dans `src/services/git/index.ts`:
```typescript
async createCommit(message: string, amend: boolean = false): Promise<string> {
  return invoke('create_commit', {
    repoPath: this.repoPath,
    message,
    amend
  });
}

async getLastCommitMessage(): Promise<string> {
  return invoke('get_last_commit_message', { repoPath: this.repoPath });
}
```
- [ ] Créer `src/components/commit/CommitPanel.tsx`:
```typescript
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CommitMessageEditor } from './CommitMessageEditor';
import { useRepositoryStore } from '@/store';
import { GitService } from '@/services/git';

export function CommitPanel() {
  const { currentRepo, status } = useRepositoryStore();
  const [message, setMessage] = useState('');
  const [amend, setAmend] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const canCommit = status && status.staged.length > 0 && message.trim().length > 0;

  // Load last commit message when amend is toggled
  useEffect(() => {
    async function loadLastMessage() {
      if (amend && currentRepo) {
        try {
          const git = new GitService(currentRepo.path);
          const lastMessage = await git.getLastCommitMessage();
          setMessage(lastMessage);
        } catch (error) {
          console.error('Failed to load last commit message:', error);
        }
      }
    }
    loadLastMessage();
  }, [amend, currentRepo]);

  const handleCommit = useCallback(async () => {
    if (!currentRepo || !canCommit) return;

    setIsCommitting(true);
    try {
      const git = new GitService(currentRepo.path);
      await git.createCommit(message.trim(), amend);
      setMessage('');
      setAmend(false);
      // Status will refresh automatically via polling
    } catch (error) {
      console.error('Failed to commit:', error);
      // TODO: Show error toast
    } finally {
      setIsCommitting(false);
    }
  }, [currentRepo, canCommit, message, amend]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canCommit) {
        e.preventDefault();
        handleCommit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canCommit, handleCommit]);

  return (
    <div className="border-t p-3 space-y-3">
      <CommitMessageEditor
        value={message}
        onChange={setMessage}
        disabled={isCommitting}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="amend"
            checked={amend}
            onCheckedChange={(checked) => setAmend(checked === true)}
            disabled={isCommitting}
          />
          <label
            htmlFor="amend"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Amend last commit
          </label>
        </div>

        <Button
          onClick={handleCommit}
          disabled={!canCommit || isCommitting}
          size="sm"
        >
          {isCommitting ? 'Committing...' : 'Commit'}
          <span className="ml-2 text-xs text-muted-foreground">
            ⌘↵
          </span>
        </Button>
      </div>
    </div>
  );
}
```
- [ ] Créer `src/components/commit/index.ts`:
```typescript
export { CommitPanel } from './CommitPanel';
export { CommitMessageEditor } from './CommitMessageEditor';
```

---

## Tâche 8.4: Créer CommitMessageEditor

**Commit**: `feat: add CommitMessageEditor component`

**Fichiers**:
- `src/components/commit/CommitMessageEditor.tsx`

**Actions**:
- [ ] Créer `src/components/commit/CommitMessageEditor.tsx`:
```typescript
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface CommitMessageEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CommitMessageEditor({
  value,
  onChange,
  disabled,
}: CommitMessageEditorProps) {
  const lines = value.split('\n');
  const subjectLine = lines[0] || '';
  const subjectLength = subjectLine.length;
  const isSubjectTooLong = subjectLength > 50;
  const isSubjectWarning = subjectLength > 40 && subjectLength <= 50;

  return (
    <div className="space-y-1">
      <Textarea
        placeholder="Commit message (Ctrl+Enter to commit)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="min-h-[80px] resize-none font-mono text-sm"
        rows={4}
      />
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">
          Subject line: {subjectLength}/50 chars
        </span>
        <span
          className={cn(
            isSubjectTooLong && 'text-destructive',
            isSubjectWarning && 'text-yellow-500'
          )}
        >
          {isSubjectTooLong
            ? 'Subject too long'
            : isSubjectWarning
            ? 'Subject getting long'
            : ''}
        </span>
      </div>
    </div>
  );
}
```

---

## Tâche 8.5: Intégrer CommitPanel dans StatusView

**Commit**: `feat: integrate CommitPanel in StatusView`

**Fichiers**:
- `src/components/status/StatusView.tsx` (mise à jour)

**Actions**:
- [ ] Mettre à jour `StatusView.tsx`:
```typescript
import { CommitPanel } from '@/components/commit';

// Dans le panel gauche, après ScrollArea:
<ResizablePanel defaultSize={30} minSize={20}>
  <div className="flex flex-col h-full">
    <ScrollArea className="flex-1">
      {/* FileTree sections */}
    </ScrollArea>
    <CommitPanel />
  </div>
</ResizablePanel>
```

---

## Tâche 8.6: Toast notifications pour commit

**Commit**: `feat: add toast notifications for commit`

**Fichiers**:
- `src/components/commit/CommitPanel.tsx` (mise à jour)
- `src/App.tsx` (ajout Toaster)

**Actions**:
- [ ] Installer sonner: `pnpm dlx shadcn@latest add sonner`
- [ ] Ajouter `<Toaster />` dans `App.tsx`:
```typescript
import { Toaster } from '@/components/ui/sonner';

// Dans le return:
<>
  <AppLayout>{renderView()}</AppLayout>
  <Toaster />
</>
```
- [ ] Utiliser toast dans `CommitPanel.tsx`:
```typescript
import { toast } from 'sonner';

// Dans handleCommit success:
toast.success('Commit created successfully');

// Dans handleCommit error:
toast.error(`Commit failed: ${error}`);
```

---

## Progression: 0/6
