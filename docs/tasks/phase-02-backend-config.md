# Phase 2: Configuration Backend Rust

## Objectif
Préparer Tauri pour exécuter des commandes git et créer la structure du module git.

---

## Tâche 2.1: Ajouter plugins Tauri ✅

**Commit**: `feat: add Tauri shell and dialog plugins`

**Fichiers**:
- `src-tauri/Cargo.toml`
- `src-tauri/src/lib.rs`

**Actions**:
- [x] Ajouter dans `Cargo.toml`: tauri-plugin-shell, tauri-plugin-dialog, thiserror
- [x] Mettre à jour `src-tauri/src/lib.rs` avec les plugins
- [x] Exécuter `cargo check` pour vérifier

---

## Tâche 2.2: Configurer capabilities shell ✅

**Commit**: `feat: configure shell capabilities for git execution`

**Fichiers**:
- `src-tauri/capabilities/default.json`

**Actions**:
- [x] Ajouter permission dialog:default
- [x] Ajouter shell:allow-execute pour git

---

## Tâche 2.3: Créer module git/error ✅

**Commit**: `feat: add Git error types`

**Fichiers**:
- `src-tauri/src/git/mod.rs`
- `src-tauri/src/git/error.rs`

**Actions**:
- [x] Créer le dossier `src-tauri/src/git/`
- [x] Créer `src-tauri/src/git/mod.rs`
- [x] Créer `src-tauri/src/git/error.rs` avec GitError enum
- [x] Ajouter `mod git;` dans `src-tauri/src/lib.rs`

---

## Tâche 2.4: Créer module git/types ✅

**Commit**: `feat: add Git data types`

**Fichiers**:
- `src-tauri/src/git/types.rs`

**Actions**:
- [x] Créer types: Repository, Branch, Commit, Remote, Stash
- [x] Créer types: FileStatus, StatusEntry, GitStatus
- [x] Créer types: DiffHunk, DiffLine, DiffLineType, FileDiff

---

## Tâche 2.5: Créer git/executor ✅

**Commit**: `feat: add Git command executor`

**Fichiers**:
- `src-tauri/src/git/executor.rs`

**Actions**:
- [x] Créer GitExecutor struct
- [x] Implémenter execute() et execute_checked()

---

## Tâche 2.6: Créer git/path ✅

**Commit**: `feat: add cross-platform Git path detection`

**Fichiers**:
- `src-tauri/src/git/path.rs`

**Actions**:
- [x] Créer find_git_executable() (Windows + Unix)
- [x] Créer get_git_version()
- [x] Exécuter `cargo check` pour vérifier la compilation

---

## Progression: 6/6 ✅
