# BrainSprint — Progress Log

## Status Overview

| Milestone | Status |
|-----------|--------|
| 1 — Project Skeleton | ✅ Done |
| 2 — Home Screen | ✅ Done |
| 3 — Sprint Mode | ✅ Done |
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

## Milestone 2 — Home Screen ✅

**What was built:**
- Custom title bar with minimize/maximize/close buttons (via Tauri window API) and drag region
- Persistent sidebar navigation with:
  - Inline SVG logo (purple brain + lightning bolt + yellow wisp)
  - "BrainSprint" wordmark + "v1.0" version tag
  - 7 nav items with SVGs: Home (house), Sprint Mode (lightning), Practice Mode (pencil), Topics (book), Statistics (bar chart), Settings (gear), About (info)
  - Active nav item highlighted with filled purple rounded background
  - Bottom offline trust card with green lock icon ("100% Offline" / "Your data stays on your device.")
- Home page content:
  - "Welcome to BrainSprint" header with subtitle
  - Theme toggle (moon → pill switch → sun) with system theme detection via `prefers-color-scheme`
  - Two mode cards (Sprint Mode + Practice Mode) with circular purple badges, description lines, and Start buttons
  - Personal Bests card (gold trophy icon) with 3 stats: Longest Session, Most Words, Highest WPM
  - Lifetime Statistics card (bar chart icon) with 3 stats: Total Sessions, Total Words, Total Writing Time
- View switching via sidebar nav (placeholder views for other screens)
- Theme switching is instant with `data-theme` attribute on root element
- System theme detection with listener for live changes

**Notable decisions:**
- Logo SVG is inlined in HTML to avoid file resolution issues with Tauri's asset serving
- Stat values are placeholder data — real persistence comes in Milestone 6
- Theme persistence (saving user preference) will be wired to settings in Milestone 5
- Window controls use Rust commands invoked via `window.__TAURI__.core.invoke()` (fixed post-M2)

---

## Milestone 3 — Sprint Mode ✅

**What was built:**
- Full-width sprint session view that replaces the sidebar layout entirely (no sidebar visible during sprint)
- Top bar with "< Leave Session" link (back arrow icon), centered "Sprint Mode" title, and red "End Session" button
- Thin horizontal progress bar (purple fill) that decreases as countdown runs
- Large bold purple countdown timer formatted as "mm:ss" with "Keep writing..." subtext
- Text input area with placeholder text, auto-focus on start
- Live stat bar at the bottom: Words, Characters, WPM, Time Elapsed
- Countdown resets to full value on every keystroke (input event on textarea)
- Session ends automatically when countdown reaches zero
- Session also ends via "End Session" button
- Session Complete overlay with 4 stat cards (Time, Words, WPM, Characters) in 2x2 grid
- Session Complete overlay has: redo button (restart), close button (go home), discard button, save button (placeholder)
- Leave Session confirmation dialog when clicking "Leave Session" or navigating away during active session
- "Stay" button returns to session; "Leave" button ends and returns to main layout
- Sprint starts from the "Start Sprint" button on the Home page
- All stats track in real-time (words via whitespace splitting, characters via length, WPM = words/(elapsed_minutes), elapsed time)

**Notable decisions:**
- Session logic is entirely frontend-side (JavaScript) — no Rust backend calls needed since all tracking is in-memory
- Countdown ticks at 100ms intervals for smooth progress bar animation; display rounds to seconds
- WPM is calculated as average over the whole session (total words / total minutes)
- Save Writing button is a placeholder — full save/discard flow comes in Milestone 8
- Confirmation dialog also blocks sidebar navigation during active session
