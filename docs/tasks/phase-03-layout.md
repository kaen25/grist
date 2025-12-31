# Phase 3: Layout Application

## Objectif
Créer la structure UI de base avec stores, types, layout ET la couche de communication Tauri IPC.

---

## Architecture DDD avec Tauri IPC

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                             │
├─────────────────────────────────────────────────────────────────┤
│  Presentation Layer                                              │
│  └── Components (AppLayout, Sidebar, Toolbar, StatusBar)        │
│                              │                                   │
│                              ▼                                   │
│  Application Layer                                               │
│  └── Stores (Zustand) ──────► Hooks                             │
│                              │                                   │
│                              ▼                                   │
│  Domain Layer                                                    │
│  └── Entities, Value Objects, Repository Interfaces            │
│                              ▲                                   │
│                              │ implements                        │
│  Infrastructure Layer                                            │
│  └── Tauri Services (invoke) ◄──────────────────────────────────┤
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ IPC (invoke)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Rust/Tauri)                         │
├─────────────────────────────────────────────────────────────────┤
│  Tauri Commands (#[tauri::command])                              │
│  └── get_repository_info, get_git_version, etc.                 │
│                              │                                   │
│                              ▼                                   │
│  Git Module                                                      │
│  └── executor, types, error, path                               │
└─────────────────────────────────────────────────────────────────┘
```

### Communication Frontend ↔ Backend

```typescript
// Frontend: Infrastructure Service
import { invoke } from '@tauri-apps/api/core';

export const gitService = {
  async getVersion(): Promise<string> {
    return invoke('get_git_version');
  },
  async getRepositoryInfo(path: string): Promise<Repository> {
    return invoke('get_repository_info', { path });
  }
};
```

```rust
// Backend: Tauri Command
#[tauri::command]
fn get_git_version() -> Result<String, String> {
    git::path::get_git_version().map_err(|e| e.to_string())
}
```

---

## Tâche 3.1: Créer les interfaces de repository (Domain)

**Commit**: `feat: add domain repository interfaces`

**Fichiers**:
- `src/domain/interfaces/git.repository.ts`
- `src/domain/interfaces/index.ts`

**Actions**:
- [ ] Créer `src/domain/interfaces/git.repository.ts`:
```typescript
import type { Repository, Branch, Commit, Remote, Stash } from '@/domain/entities';
import type { GitStatus, FileDiff } from '@/domain/value-objects';

export interface IGitRepository {
  // Repository
  getVersion(): Promise<string>;
  getRepositoryInfo(path: string): Promise<Repository>;
  isGitRepository(path: string): Promise<boolean>;

  // Status
  getStatus(repoPath: string): Promise<GitStatus>;

  // Branches
  getBranches(repoPath: string): Promise<Branch[]>;

  // Commits
  getCommits(repoPath: string, limit?: number): Promise<Commit[]>;

  // Remotes
  getRemotes(repoPath: string): Promise<Remote[]>;

  // Stash
  getStashes(repoPath: string): Promise<Stash[]>;

  // Diff
  getFileDiff(repoPath: string, filePath: string, staged: boolean): Promise<FileDiff>;
}
```
- [ ] Mettre à jour `src/domain/interfaces/index.ts`:
```typescript
export type { IGitRepository } from './git.repository';
```

---

## Tâche 3.2: Créer les commandes Tauri (Backend)

**Commit**: `feat: add Tauri commands for git operations`

**Fichiers**:
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/commands/repository.rs`
- `src-tauri/src/lib.rs` (update)

**Actions**:
- [ ] Créer le dossier `src-tauri/src/commands/`
- [ ] Créer `src-tauri/src/commands/mod.rs`:
```rust
pub mod repository;

pub use repository::*;
```
- [ ] Créer `src-tauri/src/commands/repository.rs`:
```rust
use crate::git::{error::GitError, path, types::Repository};
use std::path::Path;

#[tauri::command]
pub fn get_git_version() -> Result<String, String> {
    path::get_git_version().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_repository_info(path: String) -> Result<Repository, String> {
    let repo_path = Path::new(&path);

    if !repo_path.join(".git").exists() {
        return Err(GitError::NotARepository { path: path.clone() }.to_string());
    }

    let name = repo_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    Ok(Repository {
        path,
        name,
        branch: None,
        remote_url: None,
    })
}

#[tauri::command]
pub fn is_git_repository(path: String) -> bool {
    Path::new(&path).join(".git").exists()
}
```
- [ ] Mettre à jour `src-tauri/src/lib.rs` pour enregistrer les commandes:
```rust
mod git;
mod commands;

use commands::{get_git_version, get_repository_info, is_git_repository};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_git_version,
            get_repository_info,
            is_git_repository
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Tâche 3.3: Créer le service infrastructure Tauri (Frontend)

**Commit**: `feat: add Tauri git service infrastructure`

**Fichiers**:
- `src/infrastructure/services/tauri-git.service.ts`
- `src/infrastructure/services/index.ts`

**Actions**:
- [ ] Créer `src/infrastructure/services/tauri-git.service.ts`:
```typescript
import { invoke } from '@tauri-apps/api/core';
import type { IGitRepository } from '@/domain/interfaces';
import type { Repository, Branch, Commit, Remote, Stash } from '@/domain/entities';
import type { GitStatus, FileDiff } from '@/domain/value-objects';

export const tauriGitService: IGitRepository = {
  async getVersion(): Promise<string> {
    return invoke('get_git_version');
  },

  async getRepositoryInfo(path: string): Promise<Repository> {
    return invoke('get_repository_info', { path });
  },

  async isGitRepository(path: string): Promise<boolean> {
    return invoke('is_git_repository', { path });
  },

  async getStatus(repoPath: string): Promise<GitStatus> {
    return invoke('get_git_status', { repoPath });
  },

  async getBranches(repoPath: string): Promise<Branch[]> {
    return invoke('get_branches', { repoPath });
  },

  async getCommits(repoPath: string, limit = 100): Promise<Commit[]> {
    return invoke('get_commits', { repoPath, limit });
  },

  async getRemotes(repoPath: string): Promise<Remote[]> {
    return invoke('get_remotes', { repoPath });
  },

  async getStashes(repoPath: string): Promise<Stash[]> {
    return invoke('get_stashes', { repoPath });
  },

  async getFileDiff(repoPath: string, filePath: string, staged: boolean): Promise<FileDiff> {
    return invoke('get_file_diff', { repoPath, filePath, staged });
  },
};
```
- [ ] Mettre à jour `src/infrastructure/services/index.ts`:
```typescript
export { tauriGitService } from './tauri-git.service';
```

---

## Tâche 3.4: Créer entities et value objects DDD

**Commit**: `feat: add domain entities and value objects`

**Fichiers**:
- `src/domain/entities/*.entity.ts`
- `src/domain/value-objects/*.vo.ts`

**Actions**:
- [ ] Créer `src/domain/entities/repository.entity.ts`:
```typescript
export interface Repository {
  path: string;
  name: string;
  branch: string | null;
  remote_url: string | null;
}
```
- [ ] Créer `src/domain/entities/branch.entity.ts`:
```typescript
export interface Branch {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  remote_name: string | null;
  tracking: string | null;
  ahead: number;
  behind: number;
  last_commit_hash: string | null;
  last_commit_date: string | null;
}
```
- [ ] Créer `src/domain/entities/commit.entity.ts`:
```typescript
export interface Commit {
  hash: string;
  short_hash: string;
  author_name: string;
  author_email: string;
  date: string;
  timestamp: number;
  subject: string;
  body: string;
  parent_hashes: string[];
  refs: string[];
}
```
- [ ] Créer `src/domain/entities/remote.entity.ts`:
```typescript
export interface Remote {
  name: string;
  fetch_url: string;
  push_url: string;
}
```
- [ ] Créer `src/domain/entities/stash.entity.ts`:
```typescript
export interface Stash {
  index: number;
  message: string;
  branch: string;
  date: string;
}
```
- [ ] Créer `src/domain/entities/status-entry.entity.ts`:
```typescript
import type { FileStatus } from '@/domain/value-objects';

export interface StatusEntry {
  path: string;
  index_status: FileStatus;
  worktree_status: FileStatus;
  original_path: string | null;
}
```
- [ ] Créer `src/domain/entities/index.ts`:
```typescript
export type { Repository } from './repository.entity';
export type { Branch } from './branch.entity';
export type { Commit } from './commit.entity';
export type { Remote } from './remote.entity';
export type { Stash } from './stash.entity';
export type { StatusEntry } from './status-entry.entity';
```
- [ ] Créer `src/domain/value-objects/file-status.vo.ts`:
```typescript
export type FileStatus =
  | 'Unmodified'
  | 'Modified'
  | 'Added'
  | 'Deleted'
  | { Renamed: { from: string } }
  | { Copied: { from: string } }
  | 'TypeChanged'
  | 'Untracked'
  | 'Ignored'
  | 'Conflicted';
```
- [ ] Créer `src/domain/value-objects/git-status.vo.ts`:
```typescript
import type { StatusEntry } from '@/domain/entities';

export interface GitStatus {
  branch: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
  staged: StatusEntry[];
  unstaged: StatusEntry[];
  untracked: StatusEntry[];
  conflicted: StatusEntry[];
}
```
- [ ] Créer `src/domain/value-objects/diff-hunk.vo.ts`:
```typescript
export type DiffLineType = 'Context' | 'Addition' | 'Deletion' | 'Header';

export interface DiffLine {
  line_type: DiffLineType;
  old_line_number: number | null;
  new_line_number: number | null;
  content: string;
}

export interface DiffHunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  header: string;
  lines: DiffLine[];
}
```
- [ ] Créer `src/domain/value-objects/file-diff.vo.ts`:
```typescript
import type { FileStatus } from './file-status.vo';
import type { DiffHunk } from './diff-hunk.vo';

export interface FileDiff {
  old_path: string | null;
  new_path: string;
  status: FileStatus;
  hunks: DiffHunk[];
  is_binary: boolean;
  additions: number;
  deletions: number;
}
```
- [ ] Créer `src/domain/value-objects/index.ts`:
```typescript
export type { FileStatus } from './file-status.vo';
export type { GitStatus } from './git-status.vo';
export type { DiffLineType, DiffLine, DiffHunk } from './diff-hunk.vo';
export type { FileDiff } from './file-diff.vo';
```

---

## Tâche 3.5: Créer stores Zustand

**Commit**: `feat: add Zustand stores for state management`

**Fichiers**:
- `src/application/stores/repository.store.ts`
- `src/application/stores/ui.store.ts`
- `src/application/stores/index.ts`

**Actions**:
- [ ] Créer `src/application/stores/repository.store.ts`:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Repository, Branch, Commit } from '@/domain/entities';
import type { GitStatus } from '@/domain/value-objects';

interface RepositoryState {
  currentRepo: Repository | null;
  recentRepos: Repository[];
  status: GitStatus | null;
  commits: Commit[];
  branches: Branch[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  setCurrentRepo: (repo: Repository | null) => void;
  addRecentRepo: (repo: Repository) => void;
  setStatus: (status: GitStatus | null) => void;
  setCommits: (commits: Commit[]) => void;
  setBranches: (branches: Branch[]) => void;
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setError: (error: string | null) => void;
}

export const useRepositoryStore = create<RepositoryState>()(
  persist(
    (set) => ({
      currentRepo: null,
      recentRepos: [],
      status: null,
      commits: [],
      branches: [],
      isLoading: false,
      isRefreshing: false,
      error: null,

      setCurrentRepo: (repo) => set({ currentRepo: repo }),
      addRecentRepo: (repo) =>
        set((state) => ({
          recentRepos: [
            repo,
            ...state.recentRepos.filter((r) => r.path !== repo.path),
          ].slice(0, 10),
        })),
      setStatus: (status) => set({ status }),
      setCommits: (commits) => set({ commits }),
      setBranches: (branches) => set({ branches }),
      setLoading: (isLoading) => set({ isLoading }),
      setRefreshing: (isRefreshing) => set({ isRefreshing }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'grist-repository',
      partialize: (state) => ({ recentRepos: state.recentRepos }),
    }
  )
);
```
- [ ] Créer `src/application/stores/ui.store.ts`:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewType = 'status' | 'history' | 'branches' | 'stash' | 'settings';
export type DiffMode = 'unified' | 'split';

interface UIState {
  currentView: ViewType;
  selectedFiles: string[];
  selectedCommit: string | null;
  sidebarCollapsed: boolean;
  diffMode: DiffMode;
  diffContext: number;

  setCurrentView: (view: ViewType) => void;
  setSelectedFiles: (files: string[]) => void;
  toggleFileSelection: (file: string) => void;
  setSelectedCommit: (hash: string | null) => void;
  toggleSidebar: () => void;
  setDiffMode: (mode: DiffMode) => void;
  setDiffContext: (lines: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      currentView: 'status',
      selectedFiles: [],
      selectedCommit: null,
      sidebarCollapsed: false,
      diffMode: 'unified',
      diffContext: 3,

      setCurrentView: (currentView) => set({ currentView, selectedFiles: [], selectedCommit: null }),
      setSelectedFiles: (selectedFiles) => set({ selectedFiles }),
      toggleFileSelection: (file) =>
        set((state) => ({
          selectedFiles: state.selectedFiles.includes(file)
            ? state.selectedFiles.filter((f) => f !== file)
            : [...state.selectedFiles, file],
        })),
      setSelectedCommit: (selectedCommit) => set({ selectedCommit }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setDiffMode: (diffMode) => set({ diffMode }),
      setDiffContext: (diffContext) => set({ diffContext }),
    }),
    {
      name: 'grist-ui',
      partialize: (state) => ({
        diffMode: state.diffMode,
        diffContext: state.diffContext,
      }),
    }
  )
);
```
- [ ] Créer `src/application/stores/index.ts`:
```typescript
export { useRepositoryStore } from './repository.store';
export { useUIStore, type ViewType, type DiffMode } from './ui.store';
```

---

## Tâche 3.6: Créer les composants layout

**Commit**: `feat: add main application layout components`

**Fichiers**:
- `src/presentation/components/layout/AppLayout.tsx`
- `src/presentation/components/layout/Sidebar.tsx`
- `src/presentation/components/layout/Toolbar.tsx`
- `src/presentation/components/layout/StatusBar.tsx`
- `src/presentation/components/layout/index.ts`

**Actions**:
- [ ] Créer les composants layout (AppLayout, Sidebar, Toolbar, StatusBar)
- [ ] Exporter depuis index.ts

---

## Tâche 3.7: Créer hook useGitService

**Commit**: `feat: add useGitService hook for repository operations`

**Fichiers**:
- `src/application/hooks/useGitService.ts`
- `src/application/hooks/index.ts`

**Actions**:
- [ ] Créer `src/application/hooks/useGitService.ts`:
```typescript
import { useCallback } from 'react';
import { tauriGitService } from '@/infrastructure/services';
import { useRepositoryStore } from '@/application/stores';

export function useGitService() {
  const {
    setCurrentRepo,
    addRecentRepo,
    setStatus,
    setBranches,
    setCommits,
    setLoading,
    setRefreshing,
    setError,
  } = useRepositoryStore();

  const openRepository = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const repo = await tauriGitService.getRepositoryInfo(path);
      setCurrentRepo(repo);
      addRecentRepo(repo);

      // Load initial data
      const [status, branches, commits] = await Promise.all([
        tauriGitService.getStatus(path),
        tauriGitService.getBranches(path),
        tauriGitService.getCommits(path, 100),
      ]);

      setStatus(status);
      setBranches(branches);
      setCommits(commits);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setCurrentRepo, addRecentRepo, setStatus, setBranches, setCommits, setLoading, setError]);

  const refreshStatus = useCallback(async (repoPath: string) => {
    setRefreshing(true);
    try {
      const status = await tauriGitService.getStatus(repoPath);
      setStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }, [setStatus, setRefreshing, setError]);

  const getGitVersion = useCallback(async () => {
    return tauriGitService.getVersion();
  }, []);

  return {
    openRepository,
    refreshStatus,
    getGitVersion,
  };
}
```
- [ ] Mettre à jour `src/application/hooks/index.ts`:
```typescript
export { useGitService } from './useGitService';
```

---

## Tâche 3.8: Intégrer layout dans App.tsx

**Commit**: `feat: integrate layout and view routing`

**Fichiers**:
- `src/App.tsx`

**Actions**:
- [ ] Mettre à jour `src/App.tsx` avec le layout et le routing des vues
- [ ] Supprimer l'ancien contenu (formulaire greet)
- [ ] Vérifier que `npm run build` fonctionne

---

## Progression: 0/8
