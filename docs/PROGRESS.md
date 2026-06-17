# BrainSprint — Progress Log

## Status Overview

| Milestone | Status |
|-----------|--------|
| 1 — Project Skeleton | ✅ Done |
| 2 — Home Screen | ✅ Done |
| 3 — Game Modes (Survival + Creative + Practice) | ✅ Done |
| 4 — Settings | ⏳ Planned |
| 5 — Statistics | ❌ Not Started |
| 6 — Saved Writings | ❌ Not Started |
| 7 — Recovery Protection | ❌ Not Started |
| 8 — Flatpak Packaging | ❌ Not Started |
| 9 — Flathub Submission | ❌ Not Started |

---

## Milestone 1 — Project Skeleton ✅

**What was built:**
- Initialized Tauri v2 + Cargo project with Rust backend structure
- Created full folder layout per PRD
- Created `assets/logo.svg`, `assets/topics.json` with 8 built-in starter topics
- Added Rust dependencies: tauri v2, serde, serde_json, toml, rusqlite, chrono
- Defined core data models (Topic, SessionStats, LifetimeStats, AppSettings)
- Set up theme.css with full light/dark design system tokens per PRD spec
- Set up `tauri.conf.json` with custom window chrome (decorations: false), centered window, 1100x750 default size
- Updated `.gitignore` for new structure

**Notable decisions:**
- Used Tauri v2 (latest stable) — no reason to start on the older version
- Added `rusqlite` and `chrono` dependencies early for future milestones

---

## Milestone 2 — Home Screen ✅

**What was built:**
- Custom title bar with minimize/maximize/close buttons (via Tauri window API) and drag region
- Persistent sidebar navigation with 7 nav items with SVGs
- Home page content with mode cards, personal bests, lifetime statistics
- View switching via sidebar nav
- Theme switching with system theme detection and live listener

---

## Milestone 3 — Game Modes ✅

### Modes Renamed
- **Sprint Mode** → **Survival Mode**: Countdown resets on keystroke, optional writing prompt, 5-second timer, text deleted on fail, keep typing to survive as long as possible
- **Topic Mode** → **Creative Mode**: Configurable seconds timer (3/5/10/15/30s), optional topic toggle (show/hide prompt), random writing prompts, text deleted on fail
- **Practice Mode** (unchanged): Writing prompts from 8 categories, configurable timer (Off/10/15/20/30 min), gentle countdown (no keystroke reset), text preserved

### Shared UI Pattern
- All 3 modes use the same 2-phase pattern: setup phase (with `.setup-card`, prompt display, timer options, Begin button) then active phase (textarea, live stats, countdown/progress bar)
- Consistent topbar with Leave Session and End Session buttons
- Mode-aware session-complete overlay:
  - **Survival**: "You Did Not Survive!" message, no save option, caution warning in setup
  - **Creative**: "Session Complete!", save/discard/try again options
  - **Practice**: "Session Complete!", save/discard/try again options, text preserved

### Backend Fixes
- `"transparent": true` + `set_background_color(Some(Color(0,0,0,0)))` for Wayland rounded corners
- `"withGlobalTauri": true` in `tauri.conf.json` to make `window.__TAURI__` available
- Window controls via built-in Tauri v2 JS API (`getCurrentWindow().minimize()`, `startDragging()`, etc.)
- Proper permissions in `capabilities/default.json`

### Bug Fixes
- Fixed: game mode content now scrollable (added `overflow-y: auto` to active wrappers)
- Fixed: Leave Session button works in both setup and active states for all modes
- Fixed: textarea properly fills available space in survival and creative modes
- Fixed: disabled textarea styling consistent across all 3 modes

---

## IPC Bridge Fix

**What was fixed:**
- `window.__TAURI__` was `undefined` at runtime, breaking all window controls (minimize/maximize/close)
- Root cause: Tauri v2 does not inject the IPC bridge globally by default — requires `"withGlobalTauri": true` in `tauri.conf.json`
- Added `"withGlobalTauri": true` to `app` section of `tauri.conf.json`
- Switched window controls from custom Rust commands (`invoke('minimize_window')` etc.) to Tauri v2's built-in window JS API (`window.__TAURI__.window.getCurrentWindow().minimize()`)
- Added `core:window:default` permission to `capabilities/default.json` to authorize window operations
- Removed `devUrl` from build config (was added temporarily for debugging, broke `cargo tauri dev`)

**What changed:**
- `tauri.conf.json` — added `withGlobalTauri: true`
- `ui/scripts/app.js` — window controls now use Tauri v2 window JS API directly instead of custom Rust commands via `invoke()`
- `capabilities/default.json` — added `core:window:default` permission

**Lesson learned:**
- In Tauri v2, the IPC bridge is opt-in. Without `withGlobalTauri: true`, you must use `@tauri-apps/api` npm package (requires a bundler like Vite). For plain HTML/CSS/JS frontends, `withGlobalTauri: true` is mandatory.
- The custom protocol injection only happens when Tauri serves pages through its `tauri://` protocol — `file://` protocol does not inject the bridge.
