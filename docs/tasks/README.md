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
| 0 | [phase-00-init.md](./phase-00-init.md) | ⬜ 0/1 | Init git + structure docs |
| 1 | [phase-01-frontend-config.md](./phase-01-frontend-config.md) | ⬜ 0/5 | Tailwind, shadcn, aliases |
| 2 | [phase-02-backend-config.md](./phase-02-backend-config.md) | ⬜ 0/6 | Plugins Tauri, module git |
| 3 | [phase-03-layout.md](./phase-03-layout.md) | ⬜ 0/7 | Stores, types, layout UI |
| 4 | [phase-04-repository.md](./phase-04-repository.md) | ⬜ 0/3 | Ouvrir/gérer repos |
| 5 | [phase-05-status.md](./phase-05-status.md) | ⬜ 0/6 | Git status, FileTree |
| 6 | [phase-06-staging.md](./phase-06-staging.md) | ⬜ 0/4 | Stage/unstage/discard |
| 7 | [phase-07-diff.md](./phase-07-diff.md) | ⬜ 0/6 | Unified + Side-by-side diff |
| 8 | [phase-08-commit.md](./phase-08-commit.md) | ⬜ 0/6 | CommitPanel, amend |
| 9 | [phase-09-history.md](./phase-09-history.md) | ⬜ 0/5 | Log, CommitList virtualisé |
| 10 | [phase-10-graph.md](./phase-10-graph.md) | ⬜ 0/4 | Graph SVG des branches |
| 11 | [phase-11-branches.md](./phase-11-branches.md) | ⬜ 0/5 | CRUD branches |
| 12 | [phase-12-merge-rebase.md](./phase-12-merge-rebase.md) | ⬜ 0/4 | Merge, rebase, conflits |
| 13 | [phase-13-remotes.md](./phase-13-remotes.md) | ⬜ 0/6 | Fetch, pull, push |
| 14 | [phase-14-stash.md](./phase-14-stash.md) | ⬜ 0/4 | Stash operations |
| 15 | [phase-15-cherry-revert.md](./phase-15-cherry-revert.md) | ⬜ 0/2 | Cherry-pick, revert |
| 16 | [phase-16-settings.md](./phase-16-settings.md) | ⬜ 0/4 | Settings, raccourcis |

**Total: 0/78 tâches**

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
