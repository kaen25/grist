# Phase 3: Layout Application

## Objectif
Créer la structure UI de base avec stores, types et layout.

---

## Tâche 3.1: Créer stores Zustand

**Commit**: `feat: add Zustand stores for state management`

**Fichiers**:
- `src/store/repositoryStore.ts`
- `src/store/uiStore.ts`
- `src/store/index.ts`

**Actions**:
- [ ] Créer le dossier `src/store/`
- [ ] Créer `src/store/repositoryStore.ts`:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Repository, GitStatus, Commit, Branch } from '@/types/git';

interface RepositoryState {
  currentRepo: Repository | null;
  recentRepos: Repository[];
  status: GitStatus | null;
  commits: Commit[];
  branches: Branch[];
  isLoading: boolean;
  isRefreshing: boolean;

  setCurrentRepo: (repo: Repository | null) => void;
  addRecentRepo: (repo: Repository) => void;
  setStatus: (status: GitStatus | null) => void;
  setCommits: (commits: Commit[]) => void;
  setBranches: (branches: Branch[]) => void;
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
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
    }),
    {
      name: 'grist-repository',
      partialize: (state) => ({ recentRepos: state.recentRepos }),
    }
  )
);
```
- [ ] Créer `src/store/uiStore.ts`:
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
- [ ] Créer `src/store/index.ts`:
```typescript
export { useRepositoryStore } from './repositoryStore';
export { useUIStore, type ViewType, type DiffMode } from './uiStore';
```

---

## Tâche 3.2: Créer types TypeScript frontend

**Commit**: `feat: add TypeScript types for Git data`

**Fichiers**:
- `src/types/git.ts`
- `src/types/index.ts`

**Actions**:
- [ ] Créer le dossier `src/types/`
- [ ] Créer `src/types/git.ts`:
```typescript
export interface Repository {
  path: string;
  name: string;
  branch: string | null;
  remote_url: string | null;
}

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

export interface StatusEntry {
  path: string;
  index_status: FileStatus;
  worktree_status: FileStatus;
  original_path: string | null;
}

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

export interface Remote {
  name: string;
  fetch_url: string;
  push_url: string;
}

export interface Stash {
  index: number;
  message: string;
  branch: string;
  date: string;
}

export interface DiffHunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  line_type: DiffLineType;
  old_line_number: number | null;
  new_line_number: number | null;
  content: string;
}

export type DiffLineType = 'Context' | 'Addition' | 'Deletion' | 'Header';

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
- [ ] Créer `src/types/index.ts`:
```typescript
export * from './git';
```

---

## Tâche 3.3: Créer AppLayout

**Commit**: `feat: add main application layout`

**Fichiers**:
- `src/components/layout/AppLayout.tsx`
- `src/components/layout/index.ts`

**Actions**:
- [ ] Créer le dossier `src/components/layout/`
- [ ] Créer `src/components/layout/AppLayout.tsx`:
```typescript
import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
      <StatusBar />
    </div>
  );
}
```
- [ ] Créer `src/components/layout/index.ts`:
```typescript
export { AppLayout } from './AppLayout';
export { Sidebar } from './Sidebar';
export { Toolbar } from './Toolbar';
export { StatusBar } from './StatusBar';
```

---

## Tâche 3.4: Créer Sidebar navigation

**Commit**: `feat: add sidebar navigation`

**Fichiers**:
- `src/components/layout/Sidebar.tsx`

**Actions**:
- [ ] Créer `src/components/layout/Sidebar.tsx`:
```typescript
import { FolderGit2, Clock, GitBranch, Archive, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUIStore, type ViewType } from '@/store';
import { cn } from '@/lib/utils';

const navItems: { id: ViewType; icon: typeof FolderGit2; label: string }[] = [
  { id: 'status', icon: FolderGit2, label: 'Changes' },
  { id: 'history', icon: Clock, label: 'History' },
  { id: 'branches', icon: GitBranch, label: 'Branches' },
  { id: 'stash', icon: Archive, label: 'Stash' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { currentView, setCurrentView } = useUIStore();

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="flex w-14 flex-col border-r bg-muted/40">
        <nav className="flex flex-col gap-1 p-2">
          {navItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={currentView === item.id ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setCurrentView(item.id)}
                  className={cn('h-10 w-10')}
                >
                  <item.icon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
```

---

## Tâche 3.5: Créer Toolbar

**Commit**: `feat: add toolbar with common actions`

**Fichiers**:
- `src/components/layout/Toolbar.tsx`

**Actions**:
- [ ] Créer `src/components/layout/Toolbar.tsx`:
```typescript
import { RefreshCw, ArrowDown, ArrowUp, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useRepositoryStore } from '@/store';

export function Toolbar() {
  const { currentRepo, status, isRefreshing } = useRepositoryStore();

  return (
    <header className="flex h-12 items-center gap-2 border-b px-4">
      <Button variant="ghost" size="sm">
        <FolderOpen className="mr-2 h-4 w-4" />
        Open
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <Button variant="ghost" size="sm" disabled={!currentRepo}>
        <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
        Fetch
      </Button>

      <Button variant="ghost" size="sm" disabled={!currentRepo}>
        <ArrowDown className="mr-2 h-4 w-4" />
        Pull
      </Button>

      <Button variant="ghost" size="sm" disabled={!currentRepo}>
        <ArrowUp className="mr-2 h-4 w-4" />
        Push
      </Button>

      <div className="flex-1" />

      {currentRepo && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {status?.branch ?? 'No branch'}
          </span>
          {status && (status.ahead > 0 || status.behind > 0) && (
            <span>
              {status.ahead > 0 && `↑${status.ahead}`}
              {status.behind > 0 && `↓${status.behind}`}
            </span>
          )}
        </div>
      )}
    </header>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
```

---

## Tâche 3.6: Créer StatusBar

**Commit**: `feat: add status bar`

**Fichiers**:
- `src/components/layout/StatusBar.tsx`

**Actions**:
- [ ] Créer `src/components/layout/StatusBar.tsx`:
```typescript
import { useRepositoryStore } from '@/store';

export function StatusBar() {
  const { currentRepo, status } = useRepositoryStore();

  const getStatusText = () => {
    if (!currentRepo) return 'No repository open';
    if (!status) return 'Loading...';

    const changes =
      status.staged.length + status.unstaged.length + status.untracked.length;
    if (changes === 0) return 'Working tree clean';

    const parts = [];
    if (status.staged.length > 0) parts.push(`${status.staged.length} staged`);
    if (status.unstaged.length > 0) parts.push(`${status.unstaged.length} modified`);
    if (status.untracked.length > 0) parts.push(`${status.untracked.length} untracked`);

    return parts.join(', ');
  };

  return (
    <footer className="flex h-6 items-center justify-between border-t bg-muted/40 px-4 text-xs text-muted-foreground">
      <span>{currentRepo?.path ?? ''}</span>
      <span>{getStatusText()}</span>
    </footer>
  );
}
```

---

## Tâche 3.7: Intégrer layout dans App.tsx

**Commit**: `feat: integrate layout and view routing`

**Fichiers**:
- `src/App.tsx`

**Actions**:
- [ ] Mettre à jour `src/App.tsx`:
```typescript
import { AppLayout } from '@/components/layout';
import { useUIStore } from '@/store';

// Placeholder views - will be implemented later
function StatusView() {
  return <div className="p-4">Status View - Coming soon</div>;
}

function HistoryView() {
  return <div className="p-4">History View - Coming soon</div>;
}

function BranchesView() {
  return <div className="p-4">Branches View - Coming soon</div>;
}

function StashView() {
  return <div className="p-4">Stash View - Coming soon</div>;
}

function SettingsView() {
  return <div className="p-4">Settings View - Coming soon</div>;
}

function App() {
  const { currentView } = useUIStore();

  const renderView = () => {
    switch (currentView) {
      case 'status':
        return <StatusView />;
      case 'history':
        return <HistoryView />;
      case 'branches':
        return <BranchesView />;
      case 'stash':
        return <StashView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <StatusView />;
    }
  };

  return <AppLayout>{renderView()}</AppLayout>;
}

export default App;
```
- [ ] Supprimer l'ancien contenu de `App.tsx` (formulaire greet)
- [ ] Vérifier que `npm run tauri dev` fonctionne

---

## Progression: 0/7
