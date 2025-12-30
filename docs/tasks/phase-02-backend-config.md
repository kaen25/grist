# Phase 2: Configuration Backend Rust

## Objectif
Préparer Tauri pour exécuter des commandes git et créer la structure du module git.

---

## Tâche 2.1: Ajouter plugins Tauri

**Commit**: `feat: add Tauri shell and dialog plugins`

**Fichiers**:
- `src-tauri/Cargo.toml`
- `src-tauri/src/lib.rs`

**Actions**:
- [ ] Ajouter dans `Cargo.toml` sous `[dependencies]`:
```toml
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
thiserror = "1"
```
- [ ] Mettre à jour `src-tauri/src/lib.rs`:
```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```
- [ ] Exécuter `cargo check` dans `src-tauri/` pour vérifier

---

## Tâche 2.2: Configurer capabilities shell

**Commit**: `feat: configure shell capabilities for git execution`

**Fichiers**:
- `src-tauri/capabilities/default.json`

**Actions**:
- [ ] Mettre à jour `src-tauri/capabilities/default.json`:
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "opener:default",
    "dialog:default",
    {
      "identifier": "shell:allow-execute",
      "allow": [
        {
          "name": "git",
          "cmd": "git",
          "args": true
        }
      ]
    }
  ]
}
```

---

## Tâche 2.3: Créer module git/error

**Commit**: `feat: add Git error types`

**Fichiers**:
- `src-tauri/src/git/mod.rs`
- `src-tauri/src/git/error.rs`

**Actions**:
- [ ] Créer le dossier `src-tauri/src/git/`
- [ ] Créer `src-tauri/src/git/mod.rs`:
```rust
pub mod error;
pub mod types;
pub mod executor;
pub mod path;
```
- [ ] Créer `src-tauri/src/git/error.rs`:
```rust
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug, Serialize, Deserialize, Clone)]
pub enum GitError {
    #[error("Git executable not found")]
    GitNotFound,

    #[error("Not a git repository: {path}")]
    NotARepository { path: String },

    #[error("Command failed with exit code {code}: {stderr}")]
    CommandFailed { code: i32, stderr: String },

    #[error("Failed to parse git output: {message}")]
    ParseError { message: String },

    #[error("Operation in progress: {operation}")]
    OperationInProgress { operation: String },

    #[error("Merge conflict detected")]
    MergeConflict,

    #[error("Uncommitted changes would be overwritten")]
    UncommittedChanges,

    #[error("Branch {name} already exists")]
    BranchExists { name: String },

    #[error("Branch {name} not found")]
    BranchNotFound { name: String },

    #[error("Remote {name} not found")]
    RemoteNotFound { name: String },

    #[error("IO error: {message}")]
    IoError { message: String },
}

impl From<GitError> for String {
    fn from(error: GitError) -> Self {
        error.to_string()
    }
}
```
- [ ] Ajouter `mod git;` dans `src-tauri/src/lib.rs`

---

## Tâche 2.4: Créer module git/types

**Commit**: `feat: add Git data types`

**Fichiers**:
- `src-tauri/src/git/types.rs`

**Actions**:
- [ ] Créer `src-tauri/src/git/types.rs`:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Repository {
    pub path: String,
    pub name: String,
    pub branch: Option<String>,
    pub remote_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum FileStatus {
    Unmodified,
    Modified,
    Added,
    Deleted,
    Renamed { from: String },
    Copied { from: String },
    TypeChanged,
    Untracked,
    Ignored,
    Conflicted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusEntry {
    pub path: String,
    pub index_status: FileStatus,
    pub worktree_status: FileStatus,
    pub original_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub branch: Option<String>,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub staged: Vec<StatusEntry>,
    pub unstaged: Vec<StatusEntry>,
    pub untracked: Vec<StatusEntry>,
    pub conflicted: Vec<StatusEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Commit {
    pub hash: String,
    pub short_hash: String,
    pub author_name: String,
    pub author_email: String,
    pub date: String,
    pub timestamp: i64,
    pub subject: String,
    pub body: String,
    pub parent_hashes: Vec<String>,
    pub refs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Branch {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
    pub remote_name: Option<String>,
    pub tracking: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub last_commit_hash: Option<String>,
    pub last_commit_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Remote {
    pub name: String,
    pub fetch_url: String,
    pub push_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stash {
    pub index: u32,
    pub message: String,
    pub branch: String,
    pub date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub header: String,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffLine {
    pub line_type: DiffLineType,
    pub old_line_number: Option<u32>,
    pub new_line_number: Option<u32>,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DiffLineType {
    Context,
    Addition,
    Deletion,
    Header,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileDiff {
    pub old_path: Option<String>,
    pub new_path: String,
    pub status: FileStatus,
    pub hunks: Vec<DiffHunk>,
    pub is_binary: bool,
    pub additions: u32,
    pub deletions: u32,
}
```

---

## Tâche 2.5: Créer git/executor

**Commit**: `feat: add Git command executor`

**Fichiers**:
- `src-tauri/src/git/executor.rs`

**Actions**:
- [ ] Créer `src-tauri/src/git/executor.rs`:
```rust
use std::process::Command;
use crate::git::error::GitError;
use crate::git::path::find_git_executable;

pub struct GitExecutor {
    git_path: String,
    repo_path: String,
}

#[derive(Debug)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

impl GitExecutor {
    pub fn new(repo_path: &str) -> Result<Self, GitError> {
        let git_path = find_git_executable()?;
        Ok(Self {
            git_path,
            repo_path: repo_path.to_string(),
        })
    }

    pub fn execute(&self, args: &[&str]) -> Result<CommandResult, GitError> {
        let output = Command::new(&self.git_path)
            .current_dir(&self.repo_path)
            .args(args)
            .output()
            .map_err(|e| GitError::IoError {
                message: e.to_string(),
            })?;

        let result = CommandResult {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code().unwrap_or(-1),
        };

        Ok(result)
    }

    pub fn execute_checked(&self, args: &[&str]) -> Result<String, GitError> {
        let result = self.execute(args)?;

        if result.exit_code != 0 {
            return Err(GitError::CommandFailed {
                code: result.exit_code,
                stderr: result.stderr,
            });
        }

        Ok(result.stdout)
    }

    pub fn repo_path(&self) -> &str {
        &self.repo_path
    }
}
```

---

## Tâche 2.6: Créer git/path

**Commit**: `feat: add cross-platform Git path detection`

**Fichiers**:
- `src-tauri/src/git/path.rs`

**Actions**:
- [ ] Créer `src-tauri/src/git/path.rs`:
```rust
use std::process::Command;
use crate::git::error::GitError;

#[cfg(target_os = "windows")]
const GIT_PATHS: &[&str] = &[
    "git",
    "C:\\Program Files\\Git\\bin\\git.exe",
    "C:\\Program Files (x86)\\Git\\bin\\git.exe",
];

#[cfg(not(target_os = "windows"))]
const GIT_PATHS: &[&str] = &[
    "git",
    "/usr/bin/git",
    "/usr/local/bin/git",
    "/opt/homebrew/bin/git",
];

pub fn find_git_executable() -> Result<String, GitError> {
    // First try the PATH
    if let Ok(output) = Command::new("git").arg("--version").output() {
        if output.status.success() {
            return Ok("git".to_string());
        }
    }

    // Try known locations
    for path in GIT_PATHS {
        if let Ok(output) = Command::new(path).arg("--version").output() {
            if output.status.success() {
                return Ok(path.to_string());
            }
        }
    }

    Err(GitError::GitNotFound)
}

pub fn get_git_version() -> Result<String, GitError> {
    let git_path = find_git_executable()?;
    let output = Command::new(&git_path)
        .arg("--version")
        .output()
        .map_err(|e| GitError::IoError {
            message: e.to_string(),
        })?;

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}
```
- [ ] Exécuter `cargo check` pour vérifier la compilation

---

## Progression: 0/6
