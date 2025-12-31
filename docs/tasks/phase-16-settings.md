# Phase 16: Settings & Polish

## Objectif
Finaliser l'application avec settings et raccourcis.

---

## Architecture DDD

### Value Objects

| Value Object | Fichier | Description |
|--------------|---------|-------------|
| `Theme` | `theme.vo.ts` | Enum (Light, Dark, System) |
| `AppSettings` | `app-settings.vo.ts` | Configuration complète |

```typescript
// src/domain/value-objects/theme.vo.ts
export type Theme = 'light' | 'dark' | 'system';

// src/domain/value-objects/app-settings.vo.ts
export interface AppSettings {
  theme: Theme;
  fontSize: number;
  diffContextLines: number;
  pollInterval: number;
}
```

### Application Stores

- `settingsStore` - `src/application/stores/settings.store.ts`

### Application Hooks

- `useKeyboardShortcuts` - `src/application/hooks/useKeyboardShortcuts.ts`

### Mapping des chemins

| Ancien | Nouveau |
|--------|---------|
| `src/store/settingsStore.ts` | `src/application/stores/settings.store.ts` |
| `src/components/settings/` | `src/presentation/components/settings/` |
| `src/components/ThemeProvider.tsx` | `src/presentation/providers/ThemeProvider.tsx` |
| `src/components/common/CommandPalette.tsx` | `src/presentation/components/common/CommandPalette.tsx` |
| `src/hooks/useKeyboardShortcuts.ts` | `src/application/hooks/useKeyboardShortcuts.ts` |

---

## Tâche 16.1: Créer SettingsView

**Commit**: `feat: add SettingsView component`

**Fichiers**:
- `src/components/settings/SettingsView.tsx`
- `src/components/settings/index.ts`
- `src/store/settingsStore.ts`

**Actions**:
- [ ] Créer le dossier `src/components/settings/`
- [ ] Créer `src/store/settingsStore.ts`:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: Theme;
  fontSize: number;
  diffContextLines: number;
  pollInterval: number;

  setTheme: (theme: Theme) => void;
  setFontSize: (size: number) => void;
  setDiffContextLines: (lines: number) => void;
  setPollInterval: (interval: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      fontSize: 13,
      diffContextLines: 3,
      pollInterval: 3000,

      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setDiffContextLines: (diffContextLines) => set({ diffContextLines }),
      setPollInterval: (pollInterval) => set({ pollInterval }),
    }),
    {
      name: 'grist-settings',
    }
  )
);
```
- [ ] Créer `src/components/settings/SettingsView.tsx`:
```typescript
import { Moon, Sun, Monitor } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore, type Theme } from '@/store/settingsStore';

export function SettingsView() {
  const {
    theme,
    fontSize,
    diffContextLines,
    pollInterval,
    setTheme,
    setFontSize,
    setDiffContextLines,
    setPollInterval,
  } = useSettingsStore();

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted-foreground">
            Customize your Grist experience
          </p>
        </div>

        <Separator />

        {/* Appearance */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Appearance</h3>

          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Select your preferred theme
                </p>
              </div>
              <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Dark
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      System
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Font Size</Label>
                <span className="text-sm text-muted-foreground">{fontSize}px</span>
              </div>
              <Slider
                value={[fontSize]}
                onValueChange={([v]) => setFontSize(v)}
                min={10}
                max={18}
                step={1}
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Diff */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Diff</h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Context Lines</Label>
              <span className="text-sm text-muted-foreground">
                {diffContextLines} lines
              </span>
            </div>
            <Slider
              value={[diffContextLines]}
              onValueChange={([v]) => setDiffContextLines(v)}
              min={1}
              max={10}
              step={1}
            />
          </div>
        </section>

        <Separator />

        {/* Performance */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Performance</h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Status Poll Interval</Label>
                <p className="text-sm text-muted-foreground">
                  How often to check for changes
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {pollInterval / 1000}s
              </span>
            </div>
            <Slider
              value={[pollInterval]}
              onValueChange={([v]) => setPollInterval(v)}
              min={1000}
              max={10000}
              step={1000}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
```
- [ ] Installer slider: `pnpm dlx shadcn@latest add slider`
- [ ] Créer `src/components/settings/index.ts`
- [ ] Mettre à jour `App.tsx`:
```typescript
import { SettingsView } from '@/components/settings';

case 'settings':
  return <SettingsView />;
```

---

## Tâche 16.2: Raccourcis clavier globaux

**Commit**: `feat: add global keyboard shortcuts`

**Fichiers**:
- `src/hooks/useKeyboardShortcuts.ts`
- `src/App.tsx` (mise à jour)

**Actions**:
- [ ] Créer `src/hooks/useKeyboardShortcuts.ts`:
```typescript
import { useEffect } from 'react';
import { useUIStore, useRepositoryStore } from '@/store';
import { GitService } from '@/services/git';

export function useKeyboardShortcuts() {
  const { setCurrentView } = useUIStore();
  const { currentRepo } = useRepositoryStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      // View switching: Ctrl+1-5
      if (ctrl && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const views = ['status', 'history', 'branches', 'stash', 'settings'] as const;
        const index = parseInt(e.key) - 1;
        if (views[index]) {
          setCurrentView(views[index]);
        }
        return;
      }

      // Refresh: F5
      if (e.key === 'F5') {
        e.preventDefault();
        // Trigger refresh via status hook
        window.dispatchEvent(new CustomEvent('grist:refresh'));
        return;
      }

      // Stage all: Ctrl+S (when not in input)
      if (ctrl && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        if (currentRepo) {
          const git = new GitService(currentRepo.path);
          git.stageAll().catch(console.error);
        }
        return;
      }

      // Unstage all: Ctrl+Shift+S
      if (ctrl && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (currentRepo) {
          const git = new GitService(currentRepo.path);
          git.unstageAll().catch(console.error);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentView, currentRepo]);
}
```
- [ ] Utiliser dans `App.tsx`:
```typescript
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

function App() {
  useKeyboardShortcuts();
  // ...
}
```

---

## Tâche 16.3: Command palette

**Commit**: `feat: add command palette`

**Fichiers**:
- `src/components/common/CommandPalette.tsx`
- `src/App.tsx` (mise à jour)

**Actions**:
- [ ] Installer command: `pnpm dlx shadcn@latest add command`
- [ ] Créer `src/components/common/CommandPalette.tsx`:
```typescript
import { useState, useEffect } from 'react';
import {
  FolderGit2,
  Clock,
  GitBranch,
  Archive,
  Settings,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  Plus,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useUIStore, useRepositoryStore } from '@/store';
import { GitService } from '@/services/git';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { setCurrentView } = useUIStore();
  const { currentRepo } = useRepositoryStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => setCurrentView('status'))}>
            <FolderGit2 className="mr-2 h-4 w-4" />
            Go to Changes
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setCurrentView('history'))}>
            <Clock className="mr-2 h-4 w-4" />
            Go to History
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setCurrentView('branches'))}>
            <GitBranch className="mr-2 h-4 w-4" />
            Go to Branches
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setCurrentView('stash'))}>
            <Archive className="mr-2 h-4 w-4" />
            Go to Stash
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setCurrentView('settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            Go to Settings
          </CommandItem>
        </CommandGroup>

        {currentRepo && (
          <CommandGroup heading="Git Actions">
            <CommandItem
              onSelect={() =>
                runCommand(async () => {
                  const git = new GitService(currentRepo.path);
                  await git.fetch();
                })
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Fetch
            </CommandItem>
            <CommandItem
              onSelect={() =>
                runCommand(async () => {
                  const git = new GitService(currentRepo.path);
                  await git.pull();
                })
              }
            >
              <ArrowDown className="mr-2 h-4 w-4" />
              Pull
            </CommandItem>
            <CommandItem
              onSelect={() =>
                runCommand(async () => {
                  const git = new GitService(currentRepo.path);
                  await git.push();
                })
              }
            >
              <ArrowUp className="mr-2 h-4 w-4" />
              Push
            </CommandItem>
            <CommandItem
              onSelect={() =>
                runCommand(async () => {
                  const git = new GitService(currentRepo.path);
                  await git.stageAll();
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Stage All
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
```
- [ ] Ajouter dans `App.tsx`:
```typescript
import { CommandPalette } from '@/components/common/CommandPalette';

// Dans le return:
<>
  <AppLayout>{renderView()}</AppLayout>
  <CommandPalette />
  <Toaster />
</>
```

---

## Tâche 16.4: Theme provider

**Commit**: `feat: add theme support`

**Fichiers**:
- `src/components/ThemeProvider.tsx`
- `src/App.tsx` (mise à jour)
- `index.html` (mise à jour)

**Actions**:
- [ ] Créer `src/components/ThemeProvider.tsx`:
```typescript
import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useSettingsStore();

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      const { theme } = useSettingsStore.getState();
      if (theme === 'system') {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(mediaQuery.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return <>{children}</>;
}
```
- [ ] Wrapper l'app avec `ThemeProvider` dans `main.tsx`:
```typescript
import { ThemeProvider } from './components/ThemeProvider';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
```
- [ ] S'assurer que `tailwind.config.js` a `darkMode: ["class"]`

---

## Progression: 0/4
