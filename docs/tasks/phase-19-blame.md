# Phase 19: Blame / Annotate

## Objectif
Afficher l'attribution ligne par ligne (git blame) pour voir qui a modifié chaque ligne et quand.

---

## Architecture DDD

### Value Objects

| Value Object | Fichier | Description |
|--------------|---------|-------------|
| `BlameLine` | `blame-line.vo.ts` | { hash, author, date, lineNumber, content } |
| `BlameInfo` | `blame-info.vo.ts` | { filePath, lines: BlameLine[] } |

---

## Tâche 19.1: Commande blame (backend)

**Commit**: `feat: add git blame command`

**Fichiers**:
- `src-tauri/src/git/blame.rs` (nouveau)
- `src-tauri/src/git/mod.rs` (mise à jour)
- `src-tauri/src/commands/blame.rs` (nouveau)
- `src-tauri/src/commands/mod.rs` (mise à jour)
- `src-tauri/src/lib.rs` (mise à jour)

**Actions**:
- [ ] Créer `src-tauri/src/git/blame.rs`:
```rust
use crate::git::error::GitError;
use crate::git::executor::GitExecutor;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlameLine {
    pub hash: String,
    pub author: String,
    pub author_time: i64,
    pub line_number: u32,
    pub content: String,
}

pub fn blame(
    executor: &GitExecutor,
    file_path: &str,
    commit: Option<&str>,
) -> Result<Vec<BlameLine>, GitError> {
    let mut args = vec!["blame", "--porcelain"];
    if let Some(c) = commit {
        args.push(c);
    }
    args.push("--");
    args.push(file_path);

    let output = executor.execute_checked(&args)?;
    parse_blame_output(&output)
}

fn parse_blame_output(output: &str) -> Result<Vec<BlameLine>, GitError> {
    let mut lines = Vec::new();
    let mut current_hash = String::new();
    let mut current_author = String::new();
    let mut current_time: i64 = 0;
    let mut line_number: u32 = 0;

    for line in output.lines() {
        if line.starts_with('\t') {
            // Content line
            lines.push(BlameLine {
                hash: current_hash.clone(),
                author: current_author.clone(),
                author_time: current_time,
                line_number,
                content: line[1..].to_string(),
            });
        } else if line.len() >= 40 && line.chars().take(40).all(|c| c.is_ascii_hexdigit()) {
            // Hash line: <hash> <orig_line> <final_line> [<num_lines>]
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3 {
                current_hash = parts[0].to_string();
                line_number = parts[2].parse().unwrap_or(0);
            }
        } else if let Some(author) = line.strip_prefix("author ") {
            current_author = author.to_string();
        } else if let Some(time) = line.strip_prefix("author-time ") {
            current_time = time.parse().unwrap_or(0);
        }
    }

    Ok(lines)
}
```
- [ ] Créer `src-tauri/src/commands/blame.rs`:
```rust
use crate::git::{blame::{self, BlameLine}, executor::GitExecutor};

#[tauri::command]
pub async fn get_blame(
    repo_path: String,
    file_path: String,
    commit: Option<String>,
) -> Result<Vec<BlameLine>, String> {
    let executor = GitExecutor::new(&repo_path).map_err(|e| e.to_string())?;
    blame::blame(&executor, &file_path, commit.as_deref()).map_err(|e| e.to_string())
}
```
- [ ] Ajouter modules et commandes

---

## Tâche 19.2: BlameView UI

**Commit**: `feat: add blame view component`

**Fichiers**:
- `src/presentation/components/blame/BlameView.tsx` (nouveau)
- `src/presentation/components/blame/index.ts` (nouveau)
- `src/presentation/components/status/FileTree.tsx` (mise à jour)

**Actions**:
- [ ] Créer `src/presentation/components/blame/BlameView.tsx`:
```typescript
import { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useRepositoryStore } from '@/application/stores';
import { tauriGitService } from '@/infrastructure/services';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BlameLine {
  hash: string;
  author: string;
  author_time: number;
  line_number: number;
  content: string;
}

interface BlameViewProps {
  filePath: string;
  commit?: string;
  onCommitClick?: (hash: string) => void;
}

// Generate consistent colors for commit hashes
function hashColor(hash: string): string {
  const colors = [
    'bg-blue-500/10',
    'bg-green-500/10',
    'bg-yellow-500/10',
    'bg-purple-500/10',
    'bg-pink-500/10',
    'bg-orange-500/10',
    'bg-cyan-500/10',
    'bg-red-500/10',
  ];
  const index = parseInt(hash.slice(0, 8), 16) % colors.length;
  return colors[index];
}

export function BlameView({ filePath, commit, onCommitClick }: BlameViewProps) {
  const { currentRepo } = useRepositoryStore();
  const [lines, setLines] = useState<BlameLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBlame();
  }, [currentRepo, filePath, commit]);

  const loadBlame = async () => {
    if (!currentRepo) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await tauriGitService.getBlame(currentRepo.path, filePath, commit);
      setLines(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Group consecutive lines by commit for visual grouping
  const groupedLines = useMemo(() => {
    const groups: { hash: string; lines: BlameLine[] }[] = [];
    let currentGroup: BlameLine[] = [];
    let currentHash = '';

    for (const line of lines) {
      if (line.hash !== currentHash) {
        if (currentGroup.length > 0) {
          groups.push({ hash: currentHash, lines: currentGroup });
        }
        currentGroup = [line];
        currentHash = line.hash;
      } else {
        currentGroup.push(line);
      }
    }
    if (currentGroup.length > 0) {
      groups.push({ hash: currentHash, lines: currentGroup });
    }
    return groups;
  }, [lines]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-destructive">
        Failed to load blame: {error}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="font-mono text-xs overflow-auto h-full">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, index) => {
              const isFirstInGroup =
                index === 0 || lines[index - 1].hash !== line.hash;
              const color = hashColor(line.hash);

              return (
                <tr key={index} className={`${color} hover:bg-muted/50`}>
                  {/* Blame info column - only show for first line in group */}
                  <td className="w-48 px-2 py-0.5 border-r text-muted-foreground whitespace-nowrap">
                    {isFirstInGroup && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onCommitClick?.(line.hash)}
                            className="hover:text-foreground text-left w-full truncate"
                          >
                            <span className="text-blue-500">{line.hash.slice(0, 7)}</span>
                            {' '}
                            <span className="truncate">{line.author}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <div className="space-y-1">
                            <div><strong>Commit:</strong> {line.hash}</div>
                            <div><strong>Author:</strong> {line.author}</div>
                            <div>
                              <strong>Date:</strong>{' '}
                              {formatDistanceToNow(line.author_time * 1000, { addSuffix: true })}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </td>
                  {/* Line number */}
                  <td className="w-12 px-2 py-0.5 text-right text-muted-foreground border-r select-none">
                    {line.line_number}
                  </td>
                  {/* Content */}
                  <td className="px-2 py-0.5">
                    <pre className="whitespace-pre">{line.content}</pre>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}
```
- [ ] Créer `src/presentation/components/blame/index.ts`
- [ ] Ajouter option "Blame" dans le context menu de FileTree
- [ ] Intégrer avec navigation vers l'historique au clic sur un commit

---

## Tâche 19.3: Blame dans DiffViewer

**Commit**: `feat: add blame toggle in diff viewer`

**Fichiers**:
- `src/presentation/components/diff/DiffViewer.tsx` (mise à jour)

**Actions**:
- [ ] Ajouter bouton toggle "Show Blame" dans la toolbar du DiffViewer
- [ ] Afficher blame en mode overlay sur les lignes du diff
- [ ] Permettre de voir qui a écrit chaque ligne dans le contexte du diff

---

## Progression: 0/3
