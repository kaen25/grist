# Grist

A modern desktop Git GUI application built with Tauri 2.0, designed as an alternative to GitKraken, Sourcetree, or GitExtensions.

## Features

### Implemented
- **Repository Management**: Open and browse Git repositories with recent repos list
- **File Status & Staging**: View working tree status, stage/unstage files with multi-selection
- **Diff Viewer**: Unified and side-by-side diff views with syntax highlighting
- **Commit**: Create commits with amend support, visual character limit feedback
- **EOL Detection**: Filter files with only line-ending changes
- **Resizable Panels**: Customizable layout with draggable splitters

### Planned
- Commit History with virtualized list and search
- Git Graph with SVG-based branch visualization
- Branch Management (create, rename, delete, checkout)
- Merge & Rebase with conflict resolution
- Remote Operations (fetch, pull, push)
- Stash Management
- Cherry-pick & Revert
- Command Palette and keyboard shortcuts
- Theme support (light, dark, system)

## Tech Stack

### Frontend
- **React 19** + **TypeScript 5.8**
- **Vite 7** (build tool)
- **Tailwind CSS v4** (styling)
- **shadcn/ui** (component library)
- **Zustand** (state management)
- **lucide-react** (icons)

### Backend
- **Tauri 2.0** (desktop framework)
- **Rust** (2021 edition)
- **Git CLI wrapper** (via std::process::Command)

## Development

```bash
# Install dependencies
npm install

# Development (starts Vite dev server + Tauri)
npm run tauri dev

# Build production app
npm run tauri build

# Frontend only (Vite dev server on port 1420)
npm run dev

# TypeScript check + Vite build
npm run build
```

## Architecture

The frontend follows Domain-Driven Design with layered architecture:

```
src/
├── domain/           # Business logic (pure TypeScript)
├── application/      # Stores and hooks
├── infrastructure/   # Tauri implementations
├── presentation/     # React components
└── components/ui/    # shadcn/ui components
```

## License

MIT
