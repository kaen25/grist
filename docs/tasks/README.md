# Grist - Suivi des Tâches

## Vue d'ensemble du projet
Client GUI Git desktop (style GitExtensions) avec:
- **Backend**: Tauri 2.x + wrapper CLI git
- **Frontend**: React 19 + TypeScript + shadcn/ui + Tailwind CSS
- **Diff**: Unified + Side-by-side (toggle)
- **Graph**: SVG (composants React)

---

## Progression

| Phase | Fichier | Progression | Description |
|-------|---------|-------------|-------------|
| 0 | [phase-00-init.md](./phase-00-init.md) | ✅ 1/1 | Init git + structure docs |
| 1 | [phase-01-frontend-config.md](./phase-01-frontend-config.md) | ✅ 6/6 | Tailwind, shadcn, aliases |
| 2 | [phase-02-backend-config.md](./phase-02-backend-config.md) | ✅ 6/6 | Plugins Tauri, module git |
| 3 | [phase-03-layout.md](./phase-03-layout.md) | ✅ 8/8 | Stores, types, layout UI, IPC |
| 4 | [phase-04-repository.md](./phase-04-repository.md) | ✅ 3/3 | Ouvrir/gérer repos |
| 5 | [phase-05-status.md](./phase-05-status.md) | ✅ 6/6 | Git status, FileTree, EOL detection |
| 6 | [phase-06-staging.md](./phase-06-staging.md) | ✅ 5/5 | Stage/unstage/discard, partial staging |
| 7 | [phase-07-diff.md](./phase-07-diff.md) | ✅ 6/6 | Unified + Side-by-side diff, line selection |
| 8 | [phase-08-commit.md](./phase-08-commit.md) | ✅ 6/6 | CommitPanel, amend, toast notifications |
| 9 | [phase-09-history.md](./phase-09-history.md) | ✅ 5/5 | Log, CommitList virtualisé |
| 10 | [phase-10-graph.md](./phase-10-graph.md) | ✅ 4/4 | Graph SVG des branches |
| 11 | [phase-11-branches.md](./phase-11-branches.md) | ✅ 10/10 | CRUD branches, context menu, UI |
| 12 | [phase-12-merge-rebase.md](./phase-12-merge-rebase.md) | ✅ 6/6 | Merge, rebase, conflits |
| 13 | [phase-13-remotes.md](./phase-13-remotes.md) | ✅ 6/6 | Fetch, pull, push, SSH key mgmt |
| 14 | [phase-14-stash.md](./phase-14-stash.md) | ✅ 4/4 | Stash operations |
| 15 | [phase-15-cherry-revert.md](./phase-15-cherry-revert.md) | ✅ 2/2 | Cherry-pick, revert |
| 16 | [phase-16-settings.md](./phase-16-settings.md) | ⬜ 0/4 | Settings, raccourcis |
| 17 | [phase-17-reset.md](./phase-17-reset.md) | ⬜ 0/2 | Reset soft/mixed/hard |
| 18 | [phase-18-interactive-rebase.md](./phase-18-interactive-rebase.md) | ⬜ 0/3 | Rebase interactif, squash, fixup |
| 19 | [phase-19-blame.md](./phase-19-blame.md) | ⬜ 0/3 | Blame / annotate |

**Total: 84/100 tâches (84%)**

---

## Comment utiliser

### Pour les agents Claude
1. Ouvrir le fichier de phase correspondant
2. Exécuter les tâches dans l'ordre
3. Cocher les cases `[x]` une fois terminé
4. Créer le commit indiqué pour chaque tâche
5. Mettre à jour la progression dans ce README

### Structure des tâches
Chaque tâche contient:
- **Commit message** à utiliser
- **Fichiers** à créer/modifier
- **Actions** détaillées avec checkboxes
- **Code** exemple si nécessaire

---

## Commandes utiles

```bash
# Développement
npm run tauri dev

# Build production
npm run tauri build

# Frontend seulement
npm run dev

# TypeScript check
npm run build
```
