# AGENTS.md

## Cursor Cloud specific instructions

### Overview

ImplantSnap is an Electron desktop app for dental implant documentation. It uses electron-vite v5, TypeScript, and npm.

### Key Commands

See `package.json` scripts:
- **Dev**: `npm run dev` (electron-vite dev — launches Electron + Vite HMR server on port 5173)
- **Build**: `npm run build` (electron-vite build — outputs to `out/`)
- **Typecheck (lint)**: `npm run typecheck` (tsc --noEmit)
- **Preview built app**: `npm run start` or `npm run preview`

No ESLint, Prettier, or automated test framework is configured in this project.

### Running in a headless / container environment

- Electron requires a display server. The Cloud VM has X11 on `:1` (`DISPLAY=:1`).
- Use `NO_SANDBOX=1` env var when launching via electron-vite to pass `--no-sandbox` to Chromium (required in containers).
- DBus errors (`Failed to connect to the bus`) in console are harmless and expected — no system bus is available in containers.

### Known issue: ESM preload in sandbox mode

The project uses `"type": "module"` in `package.json`, which causes electron-vite v5 to build the preload script as ESM (`.mjs`). Electron's default sandbox mode does not support ESM preload scripts. This results in the renderer showing a blank white page because `window.implantSnap` (provided by the preload) is undefined.

**Workaround**: Add `sandbox: false` to `webPreferences` in `src/main/index.ts`, or change the preload build output to CJS format in `electron.vite.config.ts`. This is a project-level configuration issue, not an environment issue.

### Architecture

Standard Electron 3-process layout managed by electron-vite:

| Layer | Entry | Role |
|---|---|---|
| Main | `src/main/index.ts` | App lifecycle, tray, IPC, config |
| Preload | `src/preload/index.ts` | Context bridge (`window.implantSnap.config`) |
| Renderer | `src/renderer/` | Vanilla TS UI (no React/Vue) |
