# Phase 4: Repository Management

## Objectif
Permettre d'ouvrir et gérer des repositories git.

---

## Architecture DDD

### Aggregate: Repository

**Root Entity:** `Repository`

**Invariants:**
- Un repository doit avoir un chemin valide vers un dossier existant
- Un repository doit contenir un dossier `.git` valide
- Le nom du repository est dérivé du chemin si non spécifié

### Value Objects (src/domain/value-objects/)

| Value Object | Fichier | Description |
|--------------|---------|-------------|
| `RepositoryPath` | `repository-path.vo.ts` | Chemin validé vers un repo |

```typescript
// src/domain/value-objects/repository-path.vo.ts
export interface RepositoryPath {
  readonly value: string;
  readonly name: string;
}

export function createRepositoryPath(path: string): RepositoryPath {
  const name = path.split('/').pop() ?? path;
  return { value: path, name };
}
```

### Domain Events (src/domain/events/)

| Event | Fichier | Payload |
|-------|---------|---------|
| `RepositoryOpened` | `repository-opened.event.ts` | `{ path: string, timestamp: Date }` |
| `RepositoryAdded` | `repository-added.event.ts` | `{ repository: Repository }` |

```typescript
// src/domain/events/repository-opened.event.ts
export interface RepositoryOpenedEvent {
  type: 'RepositoryOpened';
  payload: {
    path: string;
    timestamp: Date;
  };
}
```

### Repository Interface (src/domain/interfaces/)

```typescript
// src/domain/interfaces/repository.repository.ts
import type { Repository } from '@/domain/entities';

export interface IRepositoryRepository {
  open(path: string): Promise<Repository>;
  validate(path: string): Promise<boolean>;
}
```

### Infrastructure (src/infrastructure/repositories/)

```typescript
// src/infrastructure/repositories/tauri-repository.repository.ts
import { invoke } from '@tauri-apps/api/core';
import type { IRepositoryRepository } from '@/domain/interfaces';
import type { Repository } from '@/domain/entities';

export class TauriRepositoryRepository implements IRepositoryRepository {
  async open(path: string): Promise<Repository> {
    return invoke('open_repository', { path });
  }

  async validate(path: string): Promise<boolean> {
    try {
      await this.open(path);
      return true;
    } catch {
      return false;
    }
  }
}
```

### Application Hooks (src/application/hooks/)

```typescript
// src/application/hooks/useRepository.ts
import { TauriRepositoryRepository } from '@/infrastructure/repositories';
import { useRepositoryStore } from '@/application/stores';

const repository = new TauriRepositoryRepository();

export function useRepository() {
  const { setCurrentRepo, addRecentRepo, setLoading } = useRepositoryStore();

  const openRepository = async (path: string) => {
    setLoading(true);
    try {
      const repo = await repository.open(path);
      setCurrentRepo(repo);
      addRecentRepo(repo);
      return repo;
    } finally {
      setLoading(false);
    }
  };

  return { openRepository };
}
```

### Mapping des chemins (ancien → nouveau)

| Ancien | Nouveau |
|--------|---------|
| `src/components/repository/` | `src/presentation/components/repository/` |
| `invoke('open_repository')` direct | `TauriRepositoryRepository.open()` |
| `useRepositoryStore` actions | `useRepository` hook |

---

## Tâche 4.1: Commande open_repository (backend)

**Commit**: `feat: add open_repository command`

**Fichiers**:
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/commands/repository.rs`
- `src-tauri/src/lib.rs`

**Actions**:
- [ ] Créer le dossier `src-tauri/src/commands/`
- [ ] Créer `src-tauri/src/commands/mod.rs`:
```rust
pub mod repository;
```
- [ ] Créer `src-tauri/src/commands/repository.rs`:
```rust
use crate::git::{executor::GitExecutor, types::Repository};

#[tauri::command]
pub async fn open_repository(path: String) -> Result<Repository, String> {
    // Create executor to validate it's a git repo
    let executor = GitExecutor::new(&path).map_err(|e| e.to_string())?;

    // Check if it's a git repository
    executor
        .execute_checked(&["rev-parse", "--git-dir"])
        .map_err(|_| format!("Not a git repository: {}", path))?;

    // Get current branch
    let branch = executor
        .execute_checked(&["rev-parse", "--abbrev-ref", "HEAD"])
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| s != "HEAD");

    // Get remote URL
    let remote_url = executor
        .execute_checked(&["config", "--get", "remote.origin.url"])
        .ok()
        .map(|s| s.trim().to_string());

    // Get repository name from path
    let name = std::path::Path::new(&path)
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| path.clone());

    Ok(Repository {
        path,
        name,
        branch,
        remote_url,
    })
}
```
- [ ] Mettre à jour `src-tauri/src/lib.rs` pour ajouter le module commands et enregistrer la commande:
```rust
mod git;
mod commands;

use commands::repository::open_repository;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![open_repository])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Tâche 4.2: Créer RepositorySelector (frontend)

**Commit**: `feat: add repository selector component`

**Fichiers**:
- `src/presentation/components/repository/RepositorySelector.tsx`
- `src/presentation/components/repository/index.ts`
- `src/presentation/components/layout/Toolbar.tsx` (mise à jour)
- `src/domain/interfaces/repository.repository.ts`
- `src/infrastructure/repositories/tauri-repository.repository.ts`
- `src/application/hooks/useRepository.ts`

**Actions**:
- [ ] Créer `src/domain/interfaces/repository.repository.ts` (voir Architecture DDD)
- [ ] Créer `src/infrastructure/repositories/tauri-repository.repository.ts` (voir Architecture DDD)
- [ ] Créer `src/application/hooks/useRepository.ts` (voir Architecture DDD)
- [ ] Créer le dossier `src/presentation/components/repository/`
- [ ] Créer `src/presentation/components/repository/RepositorySelector.tsx`:
```typescript
import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRepositoryStore } from '@/application/stores';
import { useRepository } from '@/application/hooks';
import type { Repository } from '@/domain/entities';

export function RepositorySelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { recentRepos } = useRepositoryStore();
  const { openRepository } = useRepository();

  const handleOpenFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Git Repository',
      });

      if (selected) {
        setIsLoading(true);
        await openRepository(selected);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to open repository:', error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenRecent = async (path: string) => {
    try {
      setIsLoading(true);
      await openRepository(path);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to open repository:', error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <FolderOpen className="mr-2 h-4 w-4" />
          Open
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Open Repository</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Button
            onClick={handleOpenFolder}
            disabled={isLoading}
            className="w-full"
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Browse for folder...
          </Button>

          {recentRepos.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                Recent Repositories
              </h4>
              <ScrollArea className="h-48">
                <div className="space-y-1">
                  {recentRepos.map((repo) => (
                    <Button
                      key={repo.path}
                      variant="ghost"
                      className="w-full justify-start text-left"
                      onClick={() => handleOpenRecent(repo.path)}
                      disabled={isLoading}
                    >
                      <div className="truncate">
                        <div className="font-medium">{repo.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {repo.path}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```
- [ ] Créer `src/presentation/components/repository/index.ts`:
```typescript
export { RepositorySelector } from './RepositorySelector';
```
- [ ] Mettre à jour `src/presentation/components/layout/Toolbar.tsx` pour utiliser `RepositorySelector`:
```typescript
// Remplacer le bouton Open par:
import { RepositorySelector } from '@/presentation/components/repository';

// Dans le JSX, remplacer le Button Open par:
<RepositorySelector />
```

---

## Tâche 4.3: Persister repos récents

**Commit**: `feat: persist recent repositories`

**Fichiers**:
- `src/application/stores/repository.store.ts` (déjà fait dans 3.1, vérifier)

**Actions**:
- [ ] Vérifier que `zustand/persist` est configuré dans `repository.store.ts`
- [ ] Vérifier que `recentRepos` est bien persisté
- [ ] Tester en ouvrant un repo, fermant l'app, et réouvrant

---

## Progression: 0/3
