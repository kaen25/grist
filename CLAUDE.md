# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Grist** is a modern **desktop Git GUI application** built with Tauri 2.0, designed as an alternative to tools like GitKraken, Sourcetree, or GitExtensions. It provides a visual interface for Git operations with a native desktop experience on Windows, macOS, and Linux.

The application combines a **React frontend** with a **Rust backend**. The frontend runs in a webview, communicating with the Rust backend via Tauri's IPC (Inter-Process Communication) command system—not HTTP.

## Features

### Core Features
- **Repository Management**: Open, browse, and manage Git repositories with recent repos list
- **File Status & Staging**: View working tree status, stage/unstage files, discard changes
- **Diff Viewer**: Unified and side-by-side diff views with syntax highlighting
- **Commit History**: Virtualized commit list with search and filtering
- **Git Graph**: SVG-based branch visualization

### Branch Operations
- **Branch Management**: Create, rename, delete, checkout branches
- **Merge & Rebase**: Visual merge/rebase with conflict resolution
- **Cherry-pick & Revert**: Apply or revert specific commits

### Remote Operations
- **Sync**: Fetch, pull, push with progress indication
- **Remote Management**: Add, edit, remove remotes
- **Stash**: Save and restore work in progress

### User Experience
- **Command Palette**: Quick access to all commands (Ctrl+K)
- **Keyboard Shortcuts**: Full keyboard navigation
- **Theme Support**: Light, dark, and system themes
- **Customizable Settings**: Font size, diff context lines, poll interval

## Tech Stack

### Frontend
- **React 19** + **TypeScript 5.8**
- **Vite 7** (build tool)
- **Tailwind CSS v4** (styling)
- **shadcn/ui** (component library - New York style, Zinc color)
- **Zustand** (state management)
- **lucide-react** (icons)
- **@tanstack/react-virtual** (virtualized lists)

### Backend
- **Tauri 2.0** (desktop framework)
- **Rust** (2021 edition)
- **Git CLI wrapper** (via std::process::Command)

## Build Commands

```bash
# Development (starts Vite dev server + Tauri)
npm run tauri dev

# Build production app
npm run tauri build

# Frontend only (Vite dev server on port 1420)
npm run dev

# TypeScript check + Vite build (frontend only)
npm run build
```

## Architecture

### Dual Build System
- **Frontend**: npm + Vite + TypeScript → outputs to `/dist/`
- **Backend**: Cargo (Rust) → bundles `/dist/` into executable
- Build order matters: frontend must complete before Tauri bundles

### Project Structure
```
src/                    # React frontend (TypeScript)
src-tauri/              # Rust backend
  src/lib.rs            # Tauri commands defined here
  src/main.rs           # Entry point (calls grist_lib::run())
  tauri.conf.json       # Tauri configuration
  capabilities/         # Security permissions
```

### DDD Architecture (Frontend)

The frontend follows Domain-Driven Design with layered architecture:

```
src/
├── domain/                    # Business logic (pure TypeScript, no dependencies)
│   ├── entities/              # Entities with identity (*.entity.ts)
│   ├── value-objects/         # Immutable value types (*.vo.ts)
│   ├── events/                # Domain events (*.event.ts)
│   ├── interfaces/            # Repository interfaces (*.repository.ts)
│   └── services/              # Domain services (*.service.ts)
├── application/               # Use cases and orchestration
│   ├── stores/                # Zustand stores (*.store.ts)
│   └── hooks/                 # React hooks (use*.ts)
├── infrastructure/            # External integrations
│   └── repositories/          # Tauri implementations (tauri-*.repository.ts)
├── presentation/              # UI layer
│   ├── components/            # React components by feature
│   └── providers/             # Context providers
├── components/ui/             # shadcn/ui components (unchanged)
└── lib/                       # Utilities
```

**Naming Conventions:**

| Type | Pattern | Example |
|------|---------|---------|
| Entity | `*.entity.ts` | `commit.entity.ts` |
| Value Object | `*.vo.ts` | `commit-hash.vo.ts` |
| Domain Event | `*.event.ts` | `commit-created.event.ts` |
| Repository Interface | `*.repository.ts` | `commit.repository.ts` |
| Repository Impl | `tauri-*.repository.ts` | `tauri-commit.repository.ts` |
| Store | `*.store.ts` | `repository.store.ts` |
| Hook | `use*.ts` | `useCommit.ts` |
| Domain Service | `*.service.ts` | `graph-layout-calculator.service.ts` |

**Import Rules (dependency direction: outside → inside):**

```
presentation → application → domain ← infrastructure
```

- `domain/` imports nothing from other layers
- `application/` imports from `domain/`
- `infrastructure/` imports from `domain/` (implements interfaces)
- `presentation/` imports from `application/` and `domain/`
- Never import from `infrastructure/` directly in presentation (use hooks)

### Frontend-Backend Communication
React calls Rust functions via `invoke()` from `@tauri-apps/api`:
```typescript
import { invoke } from "@tauri-apps/api/core";
const result = await invoke("command_name", { param: value });
```

### Adding Tauri Commands
1. Define in `src-tauri/src/lib.rs` with `#[tauri::command]` attribute
2. Register in the handler macro: `tauri::generate_handler![command_name]`
3. Call from frontend with `invoke("command_name", { ... })`

## Key Technical Details

- **Ports**: Vite dev server on 1420, HMR on 1421
- **Hot Reload**: Frontend only—Rust changes require rebuild
- **Macros**: `tauri::generate_context!()` reads config at build time (changes require rebuild)
- **Security**: Capability-based permissions in `src-tauri/capabilities/default.json`
- **Windows**: `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]` in main.rs prevents console window

## Conventions

- **No Claude signature in commits**: Do not add "Generated with Claude Code" or "Co-Authored-By: Claude" to commit messages
