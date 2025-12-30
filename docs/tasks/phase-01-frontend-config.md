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
- [ ] Créer `src/index.css` avec:
```css
@import "tailwindcss";

@source "../index.html";
@source "./**/*.{js,ts,jsx,tsx}";
```
- [ ] Importer `./index.css` dans `src/main.tsx`
- [ ] Supprimer l'ancien `App.css` (optionnel, peut garder pour custom styles)

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
- `src/index.css` (mise à jour avec variables CSS via `@theme`)
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/dialog.tsx`

**Actions**:
- [ ] Exécuter `pnpm dlx shadcn@latest init`
  - Style: Default
  - Base color: Zinc
  - Tailwind CSS v4: Yes (détecté automatiquement)
- [ ] Exécuter `pnpm dlx shadcn@latest add button input dialog`
- [ ] Vérifier que `src/lib/utils.ts` est créé avec la fonction `cn()`
- [ ] Vérifier que `src/index.css` contient les variables `@theme` pour les couleurs

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
pnpm dlx shadcn@latest add toast
pnpm dlx shadcn@latest add skeleton
pnpm dlx shadcn@latest add collapsible
pnpm dlx shadcn@latest add command
pnpm dlx shadcn@latest add popover
```
- [ ] Vérifier que tous les composants sont dans `src/components/ui/`

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

## Progression: 0/5
