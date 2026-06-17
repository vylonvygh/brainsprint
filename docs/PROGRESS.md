# BrainSprint — Progress Log

## Status Overview

| Milestone | Status |
|-----------|--------|
| 1 — Project Skeleton | ✅ Done |
| 2 — Home Screen | ✅ Done |
| 3 — Survival Mode | ✅ Done |
| 4 — Creative + Practice Modes | ✅ Done |
| 5 — Settings + About | ✅ Done |
| 6 — Persistence & Data | ✅ Done |
| 7 — Recovery Protection | ✅ Done |
| 8 — Flatpak Packaging | ⏳ Planned |
| 9 — Flathub Submission | ⏳ Planned |

---

## Milestone 1 — Project Skeleton ✅

**What was built:**
- Initialized Tauri v2 + Cargo project with Rust backend structure
- Created full folder layout per PRD
- Created `assets/logo.svg`, `assets/topics.json` with 8 built-in starter topics
- Added Rust dependencies: tauri v2, serde, serde_json, toml, rusqlite, chrono
- Defined core data models (Topic, SessionStats, LifetimeStats, AppSettings)
- Set up theme.css with full light/dark design system tokens per PRD spec
- Set up `tauri.conf.json` with custom window chrome (decorations: false), centered window, 1100x750 default size, transparent background for Wayland rounded corners
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

## Milestone 3 — Survival Mode ✅

**What was built:**
- Fixed 5s countdown timer that resets on each keystroke
- Progress bar depletes in real-time
- Caution warning in setup ("You will lose all progress if the timer runs out")
- Text deleted on fail — entire textarea cleared
- Session stats: words typed, time elapsed (seconds), timer resets
- Game mode content scrollable (`overflow-y: auto`)
- Textarea properly fills available space in survival mode
- Disabled textarea styling consistent

---

## Milestone 4 — Creative + Practice Modes ✅

**What was built:**
- Creative mode: configurable difficulty (Off/Easy=10s/Normal=5s/Hard=3s) + timer (Off/5/10/15/30 min)
- Practice mode: timer only (Off/5/10/15/20/30 min), no countdown/difficulty
- Optional topic toggle (show/hide prompt) in creative mode — toggle button always visible outside the prompt card
- Random writing prompts from 8 categories, 80 prompts in JS
- Text preserved on timer fail in creative/practice
- Save prompt in creative/practice session-complete overlay
- Game info bar showing selected settings during gameplay in all 3 modes
- Session timer display in creative mode (`Timer: MM:SS remaining`)
- Visible countdown timer in practice mode
- Difficulty selector fix: uses `parentElement.querySelectorAll` from stable IDs instead of `:first-of-type`
- Consistent 2-phase UI pattern: setup → active
- Same topbar (Leave/End) and stats layout across modes
- Leave confirmation overlay shared across modes
- Mode body classes: `surviving`, `creativing`, `practicing` — each hides sidebar, shows titlebar

---

## Milestone 5 — Settings + About ✅

**What was built:**
- Settings page: theme persistence (localStorage), mode defaults (dropdowns for creative difficulty/timer, practice timer)
- Custom topics management (add/delete, stored as JSON in localStorage key `brainsprint-custom-topics`)
- Saved data folder buttons (wired to Tauri `shell.open()` with graceful fallback)
- Data export (JSON download of all `brainsprint-*` keys), import (file upload), clear all data
- Preferences auto-saved when setup buttons change
- All settings center-aligned, styled selects with chevron icon for dark/light themes
- About page: app name + version, description, tech stack, developer (Andre Joseph), repository (github.com/vylonvygh/brainsprint), license (MIT), privacy policy (100% local, no telemetry/accounts/cloud)
- Danger Zone section with Delete All Data and Reset to Defaults buttons that clear files + localStorage

---

## Milestone 6 — Persistence & Data ✅

**What was built:**
- Rust models: `SavedSession` struct with mode, date, duration, stats, survival flag, optional writing filename
- Rust storage: JSON-based sessions store (`sessions/sessions.json`), writing text files (`writings/*.txt`), auto-creates app data dirs
- Rust commands: `save_session`, `get_sessions`, `get_lifetime_stats`, `get_app_data_path`, `delete_all_data`
- All commands registered in `lib.rs` via `invoke_handler`
- Frontend save button calls `save_session` Rust command — saves session metadata + writing as `.txt` file (creative/practice only)
- Survival mode auto-saves session stats silently on session end (no save button, no writing file)
- Home screen loads lifetime stats from Rust on startup and on nav to home — replaces placeholder values with real data from saved sessions
- Settings folder buttons use Rust `get_app_data_path` command + `shell.open()`

**Key files:**
- `src/models/mod.rs` — `SavedSession` struct
- `src/storage/mod.rs` — file I/O for sessions/writings directories
- `src/commands/persist.rs` — Tauri commands for persistence

---

## Milestone 7 — Recovery Protection ✅

**What was built:**
- Rust commands: `save_recovery_draft`, `load_recovery_draft`, `clear_recovery_draft` in `commands/persist.rs`
- Recovery draft storage as single `recovery-draft.txt` in app data dir via `storage/mod.rs`
- Auto-save timer every 30s during creative/practice sessions
- Startup check for existing recovery draft with restore/discard overlay
- Restore opens creative mode with pre-filled content from draft
- Recovery draft cleared on: manual save, discard, session close, leave confirmation
- Corrupt session data protection: duration capped at 86400s, corrupt entries filtered on load

---

## Key Decisions

- Persistence uses JSON files (not SQLite) for simplicity and debuggability; `rusqlite` available if needed later
- Survival mode: auto-saves stats only, no writing file (text was cleared on fail)
- Creative/Practice: manual save button saves both session metadata + writing as `.txt`
- Folder open uses Rust `open_app_folder` command (creates dir if missing, then `app.shell().open(path)`) to bypass frontend shell scope restrictions on local file paths
- Duration values capped at 86400s (24h) in both frontend (`Math.min`) and Rust (`duration_secs.min(86400)`) to prevent corrupt Unix timestamp data
- Recovery drafts stored as single `recovery-draft.txt` in app data dir, auto-saved every 30s during creative/practice
- Corrupt sessions (duration > 24h) auto-filtered on load and removed from file
- Home dir replaced with `~` in display paths via Rust `get_display_paths` using `$HOME` env var

## Constraints

- Wayland (KDE) — window corner rounding requires transparent window approach
- Plain stack, no framework
- Linux v1 target (Flatpak/Flathub), Windows later
- All data local, no accounts/telemetry/cloud
- Git commits per milestone with clear messages, no push unless asked

## Critical Context

- `tauri.conf.json`: `"transparent": true`, `"withGlobalTauri": true`, `"decorations": false`, `frontendDist: "ui"`
- `src/lib.rs`: `set_background_color(Some(Color(0, 0, 0, 0)))` in setup hook, commands registered: `minimize_window`, `toggle_maximize_window`, `close_window`, `save_session`, `get_sessions`, `get_lifetime_stats`, `get_app_data_path`, `open_app_folder`, `get_display_paths`, `delete_all_data`, `save_recovery_draft`, `load_recovery_draft`, `clear_recovery_draft`
- `capabilities/default.json`: `core:default`, `core:window:default`, `allow-minimize`, `allow-toggle-maximize`, `allow-close`, `allow-start-dragging`, `allow-set-background-color`, `shell:allow-open`
- `window.__TAURI__` globally available
- 3 mode body classes: `surviving`, `creativing`, `practicing`
- `.hidden` class toggles setup vs active; textarea `disabled` during setup
- localStorage keys: `brainsprint-theme`, `brainsprint-prefs`, `brainsprint-custom-topics`, `brainsprint-*` for data
- Build: `cargo tauri dev`; tauri-cli v2.11.2 at `/home/avdre/.cargo/bin/cargo-tauri`
- App data dir: `~/.local/share/brainsprint/` (Linux) with `sessions/sessions.json`, `writings/*.txt`, `recovery-draft.txt`
- Version: 0.1.0

## Relevant Files

- `/home/avdre/Projects/deberg/brainsprint/tauri.conf.json`: window config, IPC bridge, transparent background
- `/home/avdre/Projects/deberg/brainsprint/src/lib.rs`: background color, shell plugin init, all command registrations
- `/home/avdre/Projects/deberg/brainsprint/capabilities/default.json`: permission grants
- `/home/avdre/Projects/deberg/brainsprint/src/commands/persist.rs`: persistence + recovery + folder commands
- `/home/avdre/Projects/deberg/brainsprint/src/commands/mod.rs`: window commands + re-exports persist
- `/home/avdre/Projects/deberg/brainsprint/src/storage/mod.rs`: file I/O for sessions, writings, recovery drafts
- `/home/avdre/Projects/deberg/brainsprint/src/models/mod.rs`: `SavedSession` struct + existing models
- `/home/avdre/Projects/deberg/brainsprint/ui/index.html`: all views (home, 3 modes, settings, statistics, about) + overlays (session-complete, leave-confirm, recovery)
- `/home/avdre/Projects/deberg/brainsprint/ui/scripts/app.js`: full app logic — modes, themes, settings, custom topics, stats, persistence (save/load/auto-save), recovery, folder open, danger zone
- `/home/avdre/Projects/deberg/brainsprint/ui/styles/app.css`: all styles including settings, stats, danger zone, recovery overlay, game info bar, session timer
- `/home/avdre/Projects/deberg/brainsprint/ui/styles/theme.css`: transparent body, rounded app container
- `/home/avdre/Projects/deberg/brainsprint/docs/PROGRESS.md`: milestone tracking
