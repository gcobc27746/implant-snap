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

### ESM preload requires sandbox: false

The project uses `"type": "module"` in `package.json`, causing electron-vite v5 to build preload as ESM (`.mjs`). `sandbox: false` is set in `webPreferences` to support this.

### Screenshot capture on Linux

`screenshot-desktop` uses `scrot` on Linux (configured via `linuxLibrary: 'scrot'` in `CaptureService`). Ensure `scrot` is installed: `sudo apt-get install -y scrot`.

### Architecture

Standard Electron 3-process layout managed by electron-vite:

| Layer | Entry | Role |
|---|---|---|
| Main | `src/main/index.ts` | App lifecycle, tray, IPC, config, capture pipeline |
| Preload | `src/preload/index.ts` | Context bridge (`window.implantSnap.config`, `window.implantSnap.capture`) |
| Renderer | `src/renderer/` | Vanilla TS UI with Konva.js canvas (no React/Vue) |
| Shared | `src/shared/config-schema.ts` | Types shared between main and renderer (via `@shared` alias) |

### Step 03 renderer modules

The config workbench UI is split into focused modules under `src/renderer/src/config-page/`:
- `ConfigPage.ts` — lean orchestrator that wires canvas and panel
- `CanvasManager.ts` — Konva.js stage, ROI shapes, drag/zoom/pan
- `PropertiesPanel.ts` — dynamic properties form, save/reset actions
- `constants.ts` — region colors, labels, sizing constants
