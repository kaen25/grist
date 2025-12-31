# Phase 7: Diff Viewer

## Objectif
Afficher les différences de fichiers en mode unified et side-by-side.

---

## Architecture DDD

### Aggregate: FileDiff

**Root Entity:** `FileDiff`

**Entités enfants:** `DiffHunk`, `DiffLine`

**Invariants:**
- Un fichier binaire n'a pas de hunks
- Chaque hunk a au moins une ligne
- Les numéros de ligne doivent être cohérents

### Value Objects (utilisés)

| Value Object | Fichier | Description |
|--------------|---------|-------------|
| `FileDiff` | `file-diff.vo.ts` | Diff complet d'un fichier |
| `DiffHunk` | `diff-hunk.vo.ts` | Bloc de diff |
| `DiffLine` | `diff-hunk.vo.ts` | Ligne de diff |
| `DiffLineType` | `diff-hunk.vo.ts` | Type de ligne (Context, Addition, Deletion) |
| `DiffMode` | `diff-mode.vo.ts` | Mode d'affichage (unified, split) |

### Domain Events (src/domain/events/)

| Event | Fichier | Payload |
|-------|---------|---------|
| `DiffLoaded` | `diff-loaded.event.ts` | `{ path: string, diff: FileDiff }` |

### Domain Services (src/domain/services/)

```typescript
// src/domain/services/diff-formatter.service.ts
import type { DiffHunk, DiffLine, DiffLineType } from '@/domain/value-objects';

export const DiffFormatter = {
  getLineStyle(lineType: DiffLineType): string {
    const styles: Record<DiffLineType, string> = {
      Context: 'bg-transparent',
      Addition: 'bg-green-500/10 text-green-700 dark:text-green-400',
      Deletion: 'bg-red-500/10 text-red-700 dark:text-red-400',
      Header: 'bg-muted text-muted-foreground',
    };
    return styles[lineType];
  },

  getLinePrefix(lineType: DiffLineType): string {
    if (lineType === 'Addition') return '+';
    if (lineType === 'Deletion') return '-';
    return ' ';
  },
};
```

### Repository Interface (src/domain/interfaces/)

```typescript
// src/domain/interfaces/diff.repository.ts
import type { FileDiff } from '@/domain/value-objects';

export interface IDiffRepository {
  getFileDiff(repoPath: string, filePath: string, staged: boolean): Promise<FileDiff>;
  getCommitDiff(repoPath: string, hash: string): Promise<FileDiff[]>;
}
```

### Infrastructure (src/infrastructure/repositories/)

```typescript
// src/infrastructure/repositories/tauri-diff.repository.ts
import { invoke } from '@tauri-apps/api/core';
import type { IDiffRepository } from '@/domain/interfaces';
import type { FileDiff } from '@/domain/value-objects';

export class TauriDiffRepository implements IDiffRepository {
  async getFileDiff(repoPath: string, filePath: string, staged: boolean): Promise<FileDiff> {
    return invoke('get_file_diff', { repoPath, filePath, staged });
  }
  async getCommitDiff(repoPath: string, hash: string): Promise<FileDiff[]> {
    return invoke('get_commit_diff', { repoPath, hash });
  }
}
```

### Application Hooks (src/application/hooks/)

```typescript
// src/application/hooks/useDiff.ts
import { useState, useEffect } from 'react';
import { TauriDiffRepository } from '@/infrastructure/repositories';
import { useRepositoryStore } from '@/application/stores';
import type { FileDiff } from '@/domain/value-objects';

const diffRepository = new TauriDiffRepository();

export function useDiff(path: string, staged: boolean, commitHash?: string) {
  const { currentRepo } = useRepositoryStore();
  const [diff, setDiff] = useState<FileDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ... fetch diff logic
  }, [path, staged, commitHash, currentRepo]);

  return { diff, loading, error };
}
```

### Mapping des chemins (ancien → nouveau)

| Ancien | Nouveau |
|--------|---------|
| `src/services/git/index.ts` (diff) | `src/infrastructure/repositories/tauri-diff.repository.ts` |
| `src/components/diff/` | `src/presentation/components/diff/` |
| Styles inline | `DiffFormatter.getLineStyle()` |

---

## Tâche 7.1: Parser diff (backend)

**Commit**: `feat: add unified diff parser`

**Fichiers**:
- `src-tauri/src/git/diff.rs`
- `src-tauri/src/git/mod.rs` (mise à jour)

**Actions**:
- [ ] Créer `src-tauri/src/git/diff.rs`:
```rust
use crate::git::error::GitError;
use crate::git::executor::GitExecutor;
use crate::git::types::*;

pub fn get_file_diff(
    executor: &GitExecutor,
    path: &str,
    staged: bool,
) -> Result<FileDiff, GitError> {
    let args = if staged {
        vec!["diff", "--cached", "--", path]
    } else {
        vec!["diff", "--", path]
    };

    let output = executor.execute_checked(&args)?;
    parse_diff(&output, path)
}

pub fn get_commit_diff(executor: &GitExecutor, hash: &str) -> Result<Vec<FileDiff>, GitError> {
    let output = executor.execute_checked(&["show", "--format=", hash])?;
    parse_multi_diff(&output)
}

fn parse_diff(output: &str, default_path: &str) -> Result<FileDiff, GitError> {
    let mut diff = FileDiff {
        old_path: None,
        new_path: default_path.to_string(),
        status: FileStatus::Modified,
        hunks: Vec::new(),
        is_binary: false,
        additions: 0,
        deletions: 0,
    };

    let mut current_hunk: Option<DiffHunk> = None;
    let mut old_line = 0u32;
    let mut new_line = 0u32;

    for line in output.lines() {
        if line.starts_with("diff --git") {
            // Parse file paths
            if let Some(paths) = parse_diff_header(line) {
                diff.old_path = Some(paths.0);
                diff.new_path = paths.1;
            }
        } else if line.starts_with("Binary files") {
            diff.is_binary = true;
        } else if line.starts_with("@@") {
            // Save previous hunk
            if let Some(hunk) = current_hunk.take() {
                diff.hunks.push(hunk);
            }

            // Parse hunk header
            if let Some((old_start, old_lines, new_start, new_lines)) = parse_hunk_header(line) {
                current_hunk = Some(DiffHunk {
                    old_start,
                    old_lines,
                    new_start,
                    new_lines,
                    header: line.to_string(),
                    lines: Vec::new(),
                });
                old_line = old_start;
                new_line = new_start;
            }
        } else if let Some(ref mut hunk) = current_hunk {
            let (line_type, content) = if line.starts_with('+') {
                diff.additions += 1;
                (DiffLineType::Addition, &line[1..])
            } else if line.starts_with('-') {
                diff.deletions += 1;
                (DiffLineType::Deletion, &line[1..])
            } else if line.starts_with(' ') {
                (DiffLineType::Context, &line[1..])
            } else {
                continue;
            };

            let diff_line = match line_type {
                DiffLineType::Addition => {
                    let l = DiffLine {
                        line_type,
                        old_line_number: None,
                        new_line_number: Some(new_line),
                        content: content.to_string(),
                    };
                    new_line += 1;
                    l
                }
                DiffLineType::Deletion => {
                    let l = DiffLine {
                        line_type,
                        old_line_number: Some(old_line),
                        new_line_number: None,
                        content: content.to_string(),
                    };
                    old_line += 1;
                    l
                }
                DiffLineType::Context => {
                    let l = DiffLine {
                        line_type,
                        old_line_number: Some(old_line),
                        new_line_number: Some(new_line),
                        content: content.to_string(),
                    };
                    old_line += 1;
                    new_line += 1;
                    l
                }
                _ => continue,
            };

            hunk.lines.push(diff_line);
        }
    }

    // Save last hunk
    if let Some(hunk) = current_hunk {
        diff.hunks.push(hunk);
    }

    Ok(diff)
}

fn parse_multi_diff(output: &str) -> Result<Vec<FileDiff>, GitError> {
    let mut diffs = Vec::new();
    let mut current_diff = String::new();
    let mut current_path = String::new();

    for line in output.lines() {
        if line.starts_with("diff --git") {
            if !current_diff.is_empty() {
                diffs.push(parse_diff(&current_diff, &current_path)?);
            }
            current_diff = line.to_string() + "\n";
            if let Some(paths) = parse_diff_header(line) {
                current_path = paths.1;
            }
        } else {
            current_diff.push_str(line);
            current_diff.push('\n');
        }
    }

    if !current_diff.is_empty() {
        diffs.push(parse_diff(&current_diff, &current_path)?);
    }

    Ok(diffs)
}

fn parse_diff_header(line: &str) -> Option<(String, String)> {
    // "diff --git a/path b/path"
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() >= 4 {
        let a = parts[2].strip_prefix("a/").unwrap_or(parts[2]);
        let b = parts[3].strip_prefix("b/").unwrap_or(parts[3]);
        return Some((a.to_string(), b.to_string()));
    }
    None
}

fn parse_hunk_header(line: &str) -> Option<(u32, u32, u32, u32)> {
    // "@@ -old_start,old_lines +new_start,new_lines @@"
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() >= 3 {
        let old = parts[1].trim_start_matches('-');
        let new = parts[2].trim_start_matches('+');

        let (old_start, old_lines) = parse_range(old);
        let (new_start, new_lines) = parse_range(new);

        return Some((old_start, old_lines, new_start, new_lines));
    }
    None
}

fn parse_range(range: &str) -> (u32, u32) {
    let parts: Vec<&str> = range.split(',').collect();
    let start = parts[0].parse().unwrap_or(1);
    let lines = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(1);
    (start, lines)
}
```
- [ ] Ajouter `pub mod diff;` dans `src-tauri/src/git/mod.rs`

---

## Tâche 7.2: Commandes diff (backend)

**Commit**: `feat: add diff commands`

**Fichiers**:
- `src-tauri/src/commands/diff.rs`
- `src-tauri/src/commands/mod.rs` (mise à jour)
- `src-tauri/src/lib.rs` (mise à jour)

**Actions**:
- [ ] Créer `src-tauri/src/commands/diff.rs`:
```rust
use crate::git::{diff, executor::GitExecutor, types::FileDiff};

#[tauri::command]
pub async fn get_file_diff(
    repo_path: String,
    file_path: String,
    staged: bool,
) -> Result<FileDiff, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    diff::get_file_diff(&executor, &file_path, staged).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_commit_diff(repo_path: String, hash: String) -> Result<Vec<FileDiff>, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    diff::get_commit_diff(&executor, &hash).map_err(|e| e.to_string())
}
```
- [ ] Ajouter `pub mod diff;` dans `src-tauri/src/commands/mod.rs`
- [ ] Ajouter les commandes au `generate_handler![]` dans `lib.rs`

---

## Tâche 7.3: Créer DiffViewer container

**Commit**: `feat: add DiffViewer component`

**Fichiers**:
- `src/components/diff/DiffViewer.tsx`
- `src/components/diff/DiffHeader.tsx`
- `src/components/diff/index.ts`
- `src/services/git/index.ts` (mise à jour)

**Actions**:
- [ ] Créer le dossier `src/components/diff/`
- [ ] Ajouter dans `src/services/git/index.ts`:
```typescript
async getFileDiff(path: string, staged: boolean): Promise<FileDiff> {
  return invoke('get_file_diff', {
    repoPath: this.repoPath,
    filePath: path,
    staged
  });
}

async getCommitDiff(hash: string): Promise<FileDiff[]> {
  return invoke('get_commit_diff', { repoPath: this.repoPath, hash });
}
```
- [ ] Créer `src/components/diff/DiffViewer.tsx`:
```typescript
import { useState, useEffect } from 'react';
import { AlignJustify, Columns } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DiffHeader } from './DiffHeader';
import { UnifiedDiff } from './UnifiedDiff';
import { SideBySideDiff } from './SideBySideDiff';
import { useUIStore, useRepositoryStore } from '@/store';
import { GitService } from '@/services/git';
import type { FileDiff } from '@/types/git';

interface DiffViewerProps {
  path: string;
  staged?: boolean;
  commitHash?: string;
}

export function DiffViewer({ path, staged = false, commitHash }: DiffViewerProps) {
  const { diffMode, setDiffMode } = useUIStore();
  const { currentRepo } = useRepositoryStore();
  const [diff, setDiff] = useState<FileDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDiff() {
      if (!currentRepo) return;

      setLoading(true);
      setError(null);

      try {
        const git = new GitService(currentRepo.path);
        if (commitHash) {
          const diffs = await git.getCommitDiff(commitHash);
          const fileDiff = diffs.find((d) => d.new_path === path);
          setDiff(fileDiff ?? null);
        } else {
          const fileDiff = await git.getFileDiff(path, staged);
          setDiff(fileDiff);
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchDiff();
  }, [path, staged, commitHash, currentRepo]);

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-destructive">
        Error loading diff: {error}
      </div>
    );
  }

  if (!diff || diff.hunks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No changes to display
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <DiffHeader diff={diff}>
        <div className="flex items-center gap-1">
          <Button
            variant={diffMode === 'unified' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setDiffMode('unified')}
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
          <Button
            variant={diffMode === 'split' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setDiffMode('split')}
          >
            <Columns className="h-4 w-4" />
          </Button>
        </div>
      </DiffHeader>

      <div className="flex-1 overflow-auto font-mono text-sm">
        {diffMode === 'unified' ? (
          <UnifiedDiff hunks={diff.hunks} />
        ) : (
          <SideBySideDiff hunks={diff.hunks} />
        )}
      </div>
    </div>
  );
}
```
- [ ] Créer `src/components/diff/DiffHeader.tsx`:
```typescript
import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import type { FileDiff } from '@/types/git';

interface DiffHeaderProps {
  diff: FileDiff;
  children?: ReactNode;
}

export function DiffHeader({ diff, children }: DiffHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b p-2">
      <div className="flex items-center gap-2">
        <span className="font-medium">{diff.new_path}</span>
        {diff.is_binary && (
          <Badge variant="secondary">Binary</Badge>
        )}
        <span className="text-sm text-muted-foreground">
          <span className="text-green-500">+{diff.additions}</span>
          {' / '}
          <span className="text-red-500">-{diff.deletions}</span>
        </span>
      </div>
      {children}
    </div>
  );
}
```
- [ ] Créer `src/components/diff/index.ts`:
```typescript
export { DiffViewer } from './DiffViewer';
export { DiffHeader } from './DiffHeader';
export { UnifiedDiff } from './UnifiedDiff';
export { SideBySideDiff } from './SideBySideDiff';
```

---

## Tâche 7.4: Créer UnifiedDiff

**Commit**: `feat: add UnifiedDiff component`

**Fichiers**:
- `src/components/diff/UnifiedDiff.tsx`

**Actions**:
- [ ] Créer `src/components/diff/UnifiedDiff.tsx`:
```typescript
import { cn } from '@/lib/utils';
import type { DiffHunk, DiffLineType } from '@/types/git';

interface UnifiedDiffProps {
  hunks: DiffHunk[];
}

const lineStyles: Record<DiffLineType, string> = {
  Context: 'bg-transparent',
  Addition: 'bg-green-500/10 text-green-700 dark:text-green-400',
  Deletion: 'bg-red-500/10 text-red-700 dark:text-red-400',
  Header: 'bg-muted text-muted-foreground',
};

export function UnifiedDiff({ hunks }: UnifiedDiffProps) {
  return (
    <div className="min-w-fit">
      {hunks.map((hunk, hunkIndex) => (
        <div key={hunkIndex}>
          {/* Hunk header */}
          <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur px-4 py-1 text-xs text-muted-foreground border-y">
            {hunk.header}
          </div>

          {/* Diff lines */}
          <table className="w-full border-collapse">
            <tbody>
              {hunk.lines.map((line, lineIndex) => (
                <tr
                  key={lineIndex}
                  className={cn('hover:bg-accent/50', lineStyles[line.line_type])}
                >
                  {/* Old line number */}
                  <td className="w-12 select-none border-r px-2 text-right text-xs text-muted-foreground">
                    {line.old_line_number ?? ''}
                  </td>
                  {/* New line number */}
                  <td className="w-12 select-none border-r px-2 text-right text-xs text-muted-foreground">
                    {line.new_line_number ?? ''}
                  </td>
                  {/* Prefix */}
                  <td className="w-6 select-none text-center">
                    {line.line_type === 'Addition'
                      ? '+'
                      : line.line_type === 'Deletion'
                      ? '-'
                      : ' '}
                  </td>
                  {/* Content */}
                  <td className="whitespace-pre px-2">{line.content}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
```

---

## Tâche 7.5: Créer SideBySideDiff

**Commit**: `feat: add SideBySideDiff component`

**Fichiers**:
- `src/components/diff/SideBySideDiff.tsx`

**Actions**:
- [ ] Créer `src/components/diff/SideBySideDiff.tsx`:
```typescript
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { DiffHunk, DiffLine } from '@/types/git';

interface SideBySideDiffProps {
  hunks: DiffHunk[];
}

interface SideBySideLine {
  left: DiffLine | null;
  right: DiffLine | null;
}

export function SideBySideDiff({ hunks }: SideBySideDiffProps) {
  const sideBySideLines = useMemo(() => {
    const result: { hunkHeader: string; lines: SideBySideLine[] }[] = [];

    for (const hunk of hunks) {
      const hunkLines: SideBySideLine[] = [];
      let leftBuffer: DiffLine[] = [];
      let rightBuffer: DiffLine[] = [];

      const flushBuffers = () => {
        const maxLen = Math.max(leftBuffer.length, rightBuffer.length);
        for (let i = 0; i < maxLen; i++) {
          hunkLines.push({
            left: leftBuffer[i] ?? null,
            right: rightBuffer[i] ?? null,
          });
        }
        leftBuffer = [];
        rightBuffer = [];
      };

      for (const line of hunk.lines) {
        if (line.line_type === 'Context') {
          flushBuffers();
          hunkLines.push({ left: line, right: line });
        } else if (line.line_type === 'Deletion') {
          leftBuffer.push(line);
        } else if (line.line_type === 'Addition') {
          rightBuffer.push(line);
        }
      }

      flushBuffers();
      result.push({ hunkHeader: hunk.header, lines: hunkLines });
    }

    return result;
  }, [hunks]);

  return (
    <div className="min-w-fit">
      {sideBySideLines.map((hunk, hunkIndex) => (
        <div key={hunkIndex}>
          {/* Hunk header */}
          <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur px-4 py-1 text-xs text-muted-foreground border-y">
            {hunk.hunkHeader}
          </div>

          {/* Side by side */}
          <div className="flex">
            {/* Left (old) */}
            <div className="flex-1 border-r">
              <table className="w-full border-collapse">
                <tbody>
                  {hunk.lines.map((line, i) => (
                    <tr
                      key={i}
                      className={cn(
                        'hover:bg-accent/50',
                        line.left?.line_type === 'Deletion' &&
                          'bg-red-500/10 text-red-700 dark:text-red-400'
                      )}
                    >
                      <td className="w-12 select-none border-r px-2 text-right text-xs text-muted-foreground">
                        {line.left?.old_line_number ?? ''}
                      </td>
                      <td className="whitespace-pre px-2">
                        {line.left?.content ?? ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right (new) */}
            <div className="flex-1">
              <table className="w-full border-collapse">
                <tbody>
                  {hunk.lines.map((line, i) => (
                    <tr
                      key={i}
                      className={cn(
                        'hover:bg-accent/50',
                        line.right?.line_type === 'Addition' &&
                          'bg-green-500/10 text-green-700 dark:text-green-400'
                      )}
                    >
                      <td className="w-12 select-none border-r px-2 text-right text-xs text-muted-foreground">
                        {line.right?.new_line_number ?? ''}
                      </td>
                      <td className="whitespace-pre px-2">
                        {line.right?.content ?? ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Tâche 7.6: Intégrer DiffViewer dans StatusView

**Commit**: `feat: integrate DiffViewer in StatusView`

**Fichiers**:
- `src/components/status/StatusView.tsx` (mise à jour)

**Actions**:
- [ ] Mettre à jour `StatusView.tsx` pour afficher le diff:
```typescript
import { DiffViewer } from '@/components/diff';

// Dans le ResizablePanel de droite:
<ResizablePanel defaultSize={70}>
  {selectedFiles.length > 0 ? (
    <DiffViewer
      path={selectedFiles[0]}
      staged={status?.staged.some(f => f.path === selectedFiles[0]) ?? false}
    />
  ) : (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      Select a file to view changes
    </div>
  )}
</ResizablePanel>
```

---

## Progression: 0/6
