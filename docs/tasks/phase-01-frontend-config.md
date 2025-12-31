# Phase 1: Configuration Frontend

## Objectif
Mettre en place Tailwind CSS, shadcn/ui et les alias de chemin.

---

## Tâche 1.1: Installer Tailwind CSS v4 ✅

**Commit**: `feat: add Tailwind CSS v4 configuration`

**Fichiers**:
- `src/index.css`
- `src/main.tsx`
- `vite.config.ts`

**Actions**:
- [x] Exécuter `pnpm add -D tailwindcss @tailwindcss/vite`
- [x] Mettre à jour `vite.config.ts` pour ajouter le plugin
- [x] Créer `src/index.css` minimal
- [x] Importer `./index.css` dans `src/main.tsx`
- [x] Supprimer l'ancien `App.css`

---

## Tâche 1.2: Configurer path aliases ✅

**Commit**: `chore: configure path aliases for imports`

**Fichiers**:
- `vite.config.ts`
- `tsconfig.json`
- `package.json`

**Actions**:
- [x] Exécuter `pnpm add -D @types/node`
- [x] Mettre à jour `vite.config.ts` avec alias `@`
- [x] Ajouter `baseUrl` et `paths` dans `tsconfig.json`

---

## Tâche 1.3: Initialiser shadcn/ui ✅

**Commit**: `feat: initialize shadcn/ui with base components`

**Fichiers**:
- `components.json`
- `src/lib/utils.ts`
- `src/index.css` (mise à jour avec variables CSS shadcn)
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/dialog.tsx`

**Actions**:
- [x] Exécuter `pnpm dlx shadcn@latest init` (New York, neutral)
- [x] Exécuter `pnpm dlx shadcn@latest add button input dialog`
- [x] Vérifier que `src/lib/utils.ts` est créé avec la fonction `cn()`
- [x] Vérifier que `src/index.css` contient la structure shadcn pour Tailwind v4

---

## Tâche 1.4: Installer composants shadcn essentiels ✅

**Commit**: `feat: add essential shadcn components`

**Fichiers**:
- `src/components/ui/*` (multiples fichiers)

**Actions**:
- [x] Installer tous les composants essentiels:
  - tabs, scroll-area, resizable, context-menu, tooltip, badge
  - separator, checkbox, select, textarea, dropdown-menu, sonner
  - skeleton, collapsible, command, popover, alert
- [x] Vérifier que tous les composants sont dans `src/components/ui/`

Note: `sonner` remplace `toast` (déprécié). Pour les notifications:
```typescript
import { toast } from "sonner";
toast.success("Message");
```

---

## Tâche 1.5: Installer dépendances utilitaires ✅

**Commit**: `feat: add state management and utility libraries`

**Fichiers**:
- `package.json`

**Actions**:
- [x] Exécuter `pnpm add zustand` (state management)
- [x] Exécuter `pnpm add @tanstack/react-virtual` (listes virtualisées)
- [x] Exécuter `pnpm add lucide-react` (icônes)
- [x] Exécuter `pnpm add date-fns` (formatage dates)
- [x] Corriger compatibilité react-resizable-panels v4
- [x] Vérifier `npm run build` fonctionne

---

## Tâche 1.6: Créer structure DDD ✅

**Commit**: `chore: setup DDD folder structure`

**Fichiers**:
- `src/domain/` (nouveau)
- `src/application/` (nouveau)
- `src/infrastructure/` (nouveau)
- `src/presentation/` (nouveau)

### Conventions de nommage

| Type | Pattern | Exemple |
|------|---------|---------|
| Entity | `*.entity.ts` | `commit.entity.ts` |
| Value Object | `*.vo.ts` | `commit-hash.vo.ts` |
| Domain Event | `*.event.ts` | `commit-created.event.ts` |
| Repository Interface | `*.repository.ts` | `commit.repository.ts` |
| Repository Impl | `tauri-*.repository.ts` | `tauri-commit.repository.ts` |
| Store | `*.store.ts` | `repository.store.ts` |
| Hook | `use*.ts` | `useCommit.ts` |
| Domain Service | `*.service.ts` | `commit-message-validator.service.ts` |

### Règles d'import

```typescript
// Presentation peut importer de Application et Domain
import { useCommit } from '@/application/hooks';
import { Commit } from '@/domain/entities';

// Application peut importer de Domain et Infrastructure (via interfaces)
import { ICommitRepository } from '@/domain/interfaces';
import { CommitHash } from '@/domain/value-objects';

// Infrastructure implémente les interfaces de Domain
import { ICommitRepository } from '@/domain/interfaces';

// Domain n'importe de nulle part (couche pure)
```

**Actions**:
- [x] Créer la structure de dossiers DDD
- [x] Créer les fichiers index.ts pour chaque dossier

**Architecture DDD - Règles:**
```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION                          │
│  (React Components, Pages)                              │
│  Dépend de: Application, Domain                         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION                           │
│  (Stores, Hooks/Use Cases)                              │
│  Dépend de: Domain, Infrastructure (via interfaces)    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      DOMAIN                              │
│  (Entities, Value Objects, Interfaces)                  │
│  Dépend de: Rien (couche pure)                          │
└─────────────────────────────────────────────────────────┘
                           ▲
                           │
┌─────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE                         │
│  (GitService via Tauri invoke)                          │
│  Implémente: Domain interfaces                          │
└─────────────────────────────────────────────────────────┘
```

**Entités du domaine Git:**
- `Repository` - Aggregate root (chemin, nom, état)
- `Branch` - Branche locale ou remote
- `Commit` - Commit avec hash, message, auteur, date
- `Stash` - Entrée de stash
- `Remote` - Remote repository

**Value Objects:**
- `FileStatus` - État d'un fichier (staged, modified, untracked...)
- `DiffHunk` - Bloc de diff avec lignes
- `CommitHash` - Hash de commit (short/full)

---

## Progression: 6/6 ✅
