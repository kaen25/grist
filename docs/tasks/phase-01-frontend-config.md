# Phase 1: Configuration Frontend

## Objectif
Mettre en place Tailwind CSS, shadcn/ui et les alias de chemin.

---

## Tâche 1.1: Installer Tailwind CSS v4

**Commit**: `feat: add Tailwind CSS v4 configuration`

**Fichiers**:
- `src/index.css`
- `src/main.tsx`
- `vite.config.ts`

**Actions**:
- [ ] Exécuter `pnpm add -D tailwindcss @tailwindcss/vite`
- [ ] Mettre à jour `vite.config.ts` pour ajouter le plugin:
```typescript
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  // ... rest of config
}));
```
- [ ] Créer `src/index.css` minimal (sera complété par shadcn):
```css
@import "tailwindcss";
```
- [ ] Importer `./index.css` dans `src/main.tsx`
- [ ] Supprimer l'ancien `App.css`

---

## Tâche 1.2: Configurer path aliases

**Commit**: `chore: configure path aliases for imports`

**Fichiers**:
- `vite.config.ts`
- `tsconfig.json`
- `package.json`

**Actions**:
- [ ] Exécuter `pnpm add -D @types/node`
- [ ] Mettre à jour `vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
}));
```
- [ ] Ajouter dans `tsconfig.json` sous `compilerOptions`:
```json
{
  "baseUrl": ".",
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

---

## Tâche 1.3: Initialiser shadcn/ui

**Commit**: `feat: initialize shadcn/ui with base components`

**Fichiers**:
- `components.json`
- `src/lib/utils.ts`
- `src/index.css` (mise à jour avec variables CSS shadcn)
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/dialog.tsx`

**Actions**:
- [ ] Exécuter `pnpm dlx shadcn@latest init`
  - Style: New York
  - Base color: Zinc
  - CSS variables: Yes
- [ ] Exécuter `pnpm dlx shadcn@latest add button input dialog`
- [ ] Vérifier que `src/lib/utils.ts` est créé avec la fonction `cn()`
- [ ] Vérifier que `src/index.css` contient la structure shadcn pour Tailwind v4:
```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --background: hsl(...);
  --foreground: hsl(...);
  /* ... autres variables shadcn */
}

.dark {
  --background: hsl(...);
  /* ... variables dark mode */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ... mapping vers --color-* */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

---

## Tâche 1.4: Installer composants shadcn essentiels

**Commit**: `feat: add essential shadcn components`

**Fichiers**:
- `src/components/ui/*` (multiples fichiers)

**Actions**:
- [ ] Exécuter les commandes suivantes:
```bash
pnpm dlx shadcn@latest add tabs
pnpm dlx shadcn@latest add scroll-area
pnpm dlx shadcn@latest add resizable
pnpm dlx shadcn@latest add context-menu
pnpm dlx shadcn@latest add tooltip
pnpm dlx shadcn@latest add badge
pnpm dlx shadcn@latest add separator
pnpm dlx shadcn@latest add checkbox
pnpm dlx shadcn@latest add select
pnpm dlx shadcn@latest add textarea
pnpm dlx shadcn@latest add dropdown-menu
pnpm dlx shadcn@latest add sonner
pnpm dlx shadcn@latest add skeleton
pnpm dlx shadcn@latest add collapsible
pnpm dlx shadcn@latest add command
pnpm dlx shadcn@latest add popover
pnpm dlx shadcn@latest add alert
```
- [ ] Vérifier que tous les composants sont dans `src/components/ui/`

Note: `sonner` remplace `toast` (déprécié). Pour les notifications:
```typescript
import { toast } from "sonner";
toast.success("Message");
```

---

## Tâche 1.5: Installer dépendances utilitaires

**Commit**: `feat: add state management and utility libraries`

**Fichiers**:
- `package.json`

**Actions**:
- [ ] Exécuter `pnpm add zustand` (state management)
- [ ] Exécuter `pnpm add @tanstack/react-virtual` (listes virtualisées)
- [ ] Exécuter `pnpm add lucide-react` (icônes)
- [ ] Exécuter `pnpm add date-fns` (formatage dates)
- [ ] Vérifier `npm run tauri dev` fonctionne toujours

---

## Tâche 1.6: Créer structure DDD

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
- [ ] Créer la structure de dossiers DDD:
```
src/
├── domain/                    # Couche Domaine
│   ├── entities/              # Entités du domaine
│   │   └── index.ts
│   ├── value-objects/         # Value Objects
│   │   └── index.ts
│   └── interfaces/            # Interfaces/Ports
│       └── index.ts
├── application/               # Couche Application
│   ├── stores/                # Zustand stores
│   │   └── index.ts
│   └── hooks/                 # React hooks (use cases)
│       └── index.ts
├── infrastructure/            # Couche Infrastructure
│   └── services/              # Implémentations (Tauri invoke)
│       └── index.ts
├── presentation/              # Couche Présentation
│   ├── components/            # Composants React par feature
│   │   ├── layout/
│   │   ├── status/
│   │   ├── history/
│   │   ├── branches/
│   │   ├── stash/
│   │   ├── remotes/
│   │   ├── settings/
│   │   └── common/
│   └── pages/                 # Pages/Views principales
│       └── index.ts
├── components/                # shadcn/ui (géré par CLI)
│   └── ui/
└── lib/                       # Utilitaires (cn, etc.)
    └── utils.ts
```
- [ ] Créer les fichiers index.ts vides pour chaque dossier
- [ ] Déplacer `src/lib/utils.ts` (créé par shadcn) reste en place

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

## Progression: 0/6
