# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Grist is a **Tauri 2.0 desktop application** combining a React frontend with a Rust backend. The frontend runs in a webview, communicating with the Rust backend via Tauri's IPC (Inter-Process Communication) command system—not HTTP.

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
