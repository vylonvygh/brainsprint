# BrainSprint — Progress Log

## Status Overview

| Milestone | Status |
|-----------|--------|
| 1 — Project Skeleton | ✅ Done |
| 2 — Home Screen | ❌ Not Started |
| 3 — Sprint Mode | ❌ Not Started |
| 4 — Practice Mode | ❌ Not Started |
| 5 — Settings | ❌ Not Started |
| 6 — Statistics | ❌ Not Started |
| 7 — Topics | ❌ Not Started |
| 8 — Saved Writings | ❌ Not Started |
| 9 — Recovery Protection | ❌ Not Started |
| 10 — Flatpak Packaging | ❌ Not Started |
| 11 — Flathub Submission | ❌ Not Started |

---

## Milestone 1 — Project Skeleton ✅

**What was built:**
- Initialized Tauri v2 + Cargo project with Rust backend structure
- Created full folder layout per PRD:
  - `src/` — Rust backend (commands, models, storage, utils)
  - `ui/` — Frontend (index.html, styles/theme.css, scripts/)
  - `assets/` — Logo SVG, topics.json, app-logo.png
  - `docs/` — PRD, mockup, progress log
  - `flatpak/` — Packaging directory (placeholder)
  - `capabilities/` — Tauri v2 permissions config
- Created `assets/logo.svg` matching the PRD description (purple brain + white lightning bolt + yellow wisp accent)
- Created `assets/topics.json` with 8 built-in starter topics
- Moved existing files into correct directory locations
- Added Rust dependencies: tauri v2, serde, serde_json, toml, rusqlite, chrono
- Defined core data models (Topic, SessionStats, LifetimeStats, AppSettings)
- Set up theme.css with full light/dark design system tokens per PRD spec
- Set up `tauri.conf.json` with custom window chrome (decorations: false), centered window, 1100x750 default size
- Updated `.gitignore` for new structure

**Notable decisions:**
- Used Tauri v2 (latest stable) instead of v1 — no reason to start on the older version
- Added `rusqlite` and `chrono` dependencies early since they'll be needed by Milestone 6+; this avoids later dependency conflicts
- Kept `app-logo.png` in `assets/` alongside `logo.svg` for icon fallback purposes
- Custom title bar configured via `decorations: false` — actual title bar implementation to come with Home screen UI

**Build status:** All Rust crates resolve successfully. Full `cargo build` requires `webkit2gtk-4.1` and `javascriptcoregtk-4.1` system libraries. On Arch Linux: `sudo pacman -S webkit2gtk-4.1 javascriptcoregtk-4.1`

---

## Milestone 2 — Home Screen ❌

*Not yet started.*
