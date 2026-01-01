# Phase 9: History & Log

## Objectif
Afficher l'historique des commits avec liste virtualisée.

---

## Tâche 9.1: Parser git log (backend)

**Fichiers**:
- `src-tauri/src/git/log.rs`
- `src-tauri/src/git/mod.rs` (mise à jour)

**Actions**:
- [x] Créer `src-tauri/src/git/log.rs` avec `get_commit_log()` et `parse_log()`
- [x] Ajouter `pub mod log;` dans `src-tauri/src/git/mod.rs`

---

## Tâche 9.2: Commande get_commit_log

**Fichiers**:
- `src-tauri/src/commands/log.rs`
- `src-tauri/src/commands/mod.rs` (mise à jour)
- `src-tauri/src/lib.rs` (mise à jour)

**Actions**:
- [x] Créer `src-tauri/src/commands/log.rs` avec commande Tauri
- [x] Ajouter `pub mod log;` dans `src-tauri/src/commands/mod.rs`
- [x] Ajouter la commande au `generate_handler![]`
- [x] Ajouter `getCommitLog` dans `src/infrastructure/services/tauri-git.service.ts`
- [x] Ajouter `getCommitLog` dans `src/domain/interfaces/git.repository.ts`

---

## Tâche 9.3: Créer HistoryView

**Fichiers**:
- `src/presentation/components/history/HistoryView.tsx`
- `src/presentation/components/history/index.ts`
- `src/application/hooks/useHistory.ts`

**Actions**:
- [x] Créer le dossier `src/presentation/components/history/`
- [x] Créer `src/presentation/components/history/HistoryView.tsx`
- [x] Créer `src/presentation/components/history/index.ts`
- [x] Créer `src/application/hooks/useHistory.ts`

---

## Tâche 9.4: Créer CommitList virtualisé

**Fichiers**:
- `src/presentation/components/history/CommitList.tsx`
- `src/presentation/components/history/CommitItem.tsx`

**Actions**:
- [x] Créer `CommitList.tsx` avec @tanstack/react-virtual
- [x] Créer `CommitItem.tsx` avec affichage du commit

---

## Tâche 9.5: Créer CommitDetails

**Fichiers**:
- `src/presentation/components/history/CommitDetails.tsx`

**Actions**:
- [x] Créer `CommitDetails.tsx` avec affichage des détails du commit
- [x] Intégrer `DiffViewer` pour afficher les fichiers modifiés
- [x] Mettre à jour `src/App.tsx` pour utiliser `HistoryView`

---

## Progression: 5/5
