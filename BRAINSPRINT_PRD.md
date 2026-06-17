# BrainSprint v1.0

## Product Requirements Document (PRD)

Version: 1.0
Status: Approved for Development
Author: Andre Joseph (also known as Vylon Vy — same person, same author)
Primary Target Platform: Linux
Future Target Platform: Windows (post-v1, not in scope yet)
Primary Distribution: Flathub (Linux), installer TBD (Windows, later)

Technology Stack:

* Rust (backend / app logic)
* Tauri (app shell, window, native bindings)
* HTML / CSS / JavaScript (UI layer, no framework required)
* SQLite (local storage)
* Serde (data serialization)
* TOML (config files)
* Flatpak (Linux packaging)
* Git (version control, see Version Control section)

---

# Why This Stack

This project is being built by vibe coding with AI assistance, by someone with limited prior experience. The stack was chosen deliberately for this reason:

* Rust + Tauri compiles to a small, fast, native binary — not Electron.
* The UI is plain HTML/CSS/JS. This is far easier to read, modify, and debug for a beginner (and for an AI agent) than a native widget toolkit.
* The same UI code runs on Linux, Windows, and macOS with no rewrite. Linux is still the priority target and gets packaged first, but the architecture does not block Windows later.
* SQLite + plain files keep storage simple, inspectable, and local.

GTK4/Libadwaita was considered and rejected for v1 specifically because of the future Windows requirement — GTK on Windows requires bundling a separate runtime, looks visually foreign, and is significantly harder to package. Tauri avoids all three problems while keeping the binary small and the stack fully Rust-based.

On Linux, Tauri renders its UI using WebKitGTK, a lightweight native rendering engine. On Windows, it uses WebView2 (built into modern Windows). On macOS, it uses WKWebView. None of these are Electron — there is no bundled Chromium, no separate browser runtime shipped with the app, and resource usage stays close to native across all three platforms. This is what makes the app lightweight, stable, and good-performing on every OS.

The visual goal is a clean, modern, rounded UI in the style of apps like Linear, Notion, or Vercel's dashboard — not tied to any specific OS's design language. This means the app should look equally at home on Linux, Windows, and macOS, rather than imitating any one platform's native widgets. The Design System section below defines this look concretely using plain CSS.

---

# Project Vision

BrainSprint is a fully local, privacy-respecting desktop application that trains continuous thinking through writing.

Users participate in writing sprints where they must continue typing before a countdown expires.

The application focuses on:

* Continuous thinking
* Writing flow
* Knowledge recall
* Focus training

BrainSprint is intentionally small, simple, fast, and distraction-free. It is not meant to grow into a complex app — simplicity is a permanent design goal, not just a v1 constraint.

---

# Core Principles

## Privacy First

BrainSprint must:

* Work completely offline
* Never require an account
* Never require internet access
* Never collect telemetry
* Never collect analytics
* Never display advertisements
* Never use cloud services
* Never send user data anywhere, ever, under any circumstance

All data belongs to the user. No exceptions.

## Local First

All data remains on the user's device. Nothing is synced anywhere unless the user manually exports and moves it themselves.

User data includes:

* Settings
* Statistics
* Topics
* Saved writings
* Recovery drafts

## Simplicity

A user must be able to:

Launch → Start Sprint → Write

within seconds, with zero setup steps.

No unnecessary complexity. No feature bloat. No onboarding flow, no tutorial, no sign-up screen of any kind. This applies to the codebase as much as the UI — prefer the simplest implementation that works.

---

# Platform Scope

## v1 Scope (current)

* Primary build and test target: Linux (Arch Linux, KDE Plasma).
* Packaged as a Flatpak for Flathub distribution.
* The UI and design system (see Design System section) are written to be OS-agnostic from the start — light/dark theme support and the rounded modern look apply equally on every platform. This costs nothing extra since it's all plain CSS, so there's no reason to write it Linux-only.

## Future Scope (packaging/distribution only, not started yet)

* Windows packaging and distribution, using the same Tauri codebase and the same UI.
* Because the UI itself is already cross-platform by design, this should mainly be a packaging and testing effort, not a UI rewrite — that's the whole point of this stack choice.
* Do not write Windows-specific packaging, installers, or platform-detection branches until explicitly requested. Linux is the only *distribution* target for v1.

---

# Version Control

Git must be used from the very first commit, before any real feature code is written.

Requirements:

* Initialize a git repository as the first step of Milestone 1, before any other code.
* `.gitignore` must exclude build artifacts, `target/` (Rust build output), `node_modules/` (if any JS tooling is used), and any local config or recovery/writings data directories that shouldn't be tracked.
* Commit at meaningful checkpoints — at minimum, once per completed milestone, with a clear commit message describing what was built.
* The repository will be connected to a GitHub remote (`avdrevygh` account, consistent with the author's other projects). Do not push automatically without being asked — local commits are fine on their own, but ask before adding a remote or pushing for the first time.
* Do not commit secrets, API keys, or personal file paths specific to one machine.
* Keep commit messages plain and descriptive (e.g. "Add sprint mode countdown logic", not vague messages like "update" or "fix stuff").

---

# Progress Tracking

A second markdown file, `docs/PROGRESS.md`, must be created and kept up to date throughout development, separate from this PRD.

Purpose: since this project is being built incrementally with AI assistance, this file is the running log of what has actually been built, so the project owner (who is still learning) can always see real status without re-reading code.

Requirements for `docs/PROGRESS.md`:

* Created at the start of Milestone 1, alongside the first commit.
* One section per milestone, matching the Development Roadmap below.
* Each milestone section should be marked as Not Started / In Progress / Done.
* Under each completed milestone, briefly list what was actually built and any notable decisions or deviations from the PRD (and why).
* Updated at the end of every work session, or immediately after completing a milestone — whichever comes first.
* Written in plain language, not just a changelog of file names — the project owner should be able to read this file and understand what the app can currently do.

This file is a living document. It is expected to be edited constantly, unlike this PRD which should stay stable.

---

# Development Assets Required Before Coding

The following files must exist before implementation begins:

```
docs/BRAINSPRINT_PRD.md
docs/PROGRESS.md
docs/mockup.png
assets/logo.svg
assets/topics.json
```

Note: `docs/mockup.png` should still be kept in the repo for human reference (e.g. if the project owner opens it themselves, or a future vision-capable tool is used), but the AI agent should treat the "Mockup Description (Text Equivalent)" section of this document as the actual spec to build from.

---

# Visual Authority

The file `docs/mockup.png` is the single authoritative visual reference for this project.

The implementation must match the mockup's:

* Layout
* Spacing
* Visual hierarchy
* Typography scale
* Navigation flow
* Color palette (dark theme, purple/violet accent, yellow lightning bolt accent)
* Overall aesthetic

If anything in this document conflicts with the mockup on a purely visual matter, the mockup wins. If anything conflicts on a functional/behavioral matter, this document wins.

**Note on the mockup image:** the AI agent building this app cannot see or interpret image files. The section below, "Mockup Description (Text Equivalent)," is a complete written translation of `docs/mockup.png` and must be treated as the actual authoritative visual reference in its place. Read it as carefully as you would study an image — every layout detail, spacing relationship, and component listed below is intentional.

---

# Mockup Description (Text Equivalent)

The mockup shows five distinct screens/states of the app. All screens share a dark theme (this is the dark-mode appearance specifically; the light-mode equivalent should use the same layout with the light token set from the Design System section). Below is each screen described in full.

## Shared Elements Across Screens

* **Logo:** a purple brain icon with a white lightning bolt cutting through it and a small yellow/gold accent shape (like a wisp or flame) on the lower-right of the brain. Used at small size (sidebar, ~40-50px) and larger size (About screen, ~80px).
* **Sidebar navigation** (appears on Home, Settings, About — any "main shell" screen): a fixed-width left column, darker than the main content area, containing in top-to-bottom order: the logo + "BrainSprint" wordmark + small "v1.0" version tag below it, then a vertical list of nav items each with an icon and label: Home (house icon), Sprint Mode (lightning icon), Practice Mode (pencil icon), Topics (book icon), Statistics (bar chart icon), Settings (gear icon), About (info "i" icon). The currently active nav item has a filled purple rounded-rectangle background behind it, clearly distinguishing it from the others. At the bottom of the sidebar, a small rounded card with a green lock icon reading "100% Offline" as a bold heading and "Your data stays on your device." as a subtext — this stays visible at all times as a persistent trust signal.
* **Window controls:** top-right corner shows minimize, maximize, and close as three small flat icons/dots, styled to match the dark theme (not the OS default light title bar).

## Screen 1: Home

Two-column layout: sidebar on the left (as described above), main content on the right.

Main content, top to bottom:
* Large bold heading "Welcome to BrainSprint", with a smaller gray subtext beneath it: "Train your mind. Build your flow. Write without limits."
* In the top-right corner of this same header row, a theme toggle: a moon icon, then a horizontal pill-shaped switch (currently shown in the "on/light" position with a white circle), then a sun icon. This is the manual light/dark toggle.
* Below the header, two side-by-side cards of equal width:
  - **Sprint Mode card:** circular purple icon badge with a lightning bolt, "Sprint Mode" as a bold purple heading, three lines of description text ("Write continuously.", "Beat the countdown.", "Push your limits."), and a solid purple rounded "Start Sprint" button.
  - **Practice Mode card:** same structure, circular badge with a pencil icon, "Practice Mode" heading, description lines ("Write freely.", "No pressure.", "Improve your flow."), solid purple "Start Practice" button.
* Below those two cards, a full-width card titled "Personal Bests" (with a small trophy icon next to the title, in gold/yellow), containing three stat blocks side by side: "Longest Session" (value like 28:47, unit label "mm:ss" beneath), "Most Words" (value like 1,246, unit label "words"), "Highest WPM" (value like 96, unit label "wpm"). Each stat is right-aligned under its label, large bold number, smaller gray unit text below.
* Below that, another full-width card titled "Lifetime Statistics" (small bar-chart icon next to title), same three-column stat layout: "Total Sessions" (e.g. 42), "Total Words" (e.g. 18,356), "Total Writing Time" (e.g. 12:34:27, unit "hh:mm:ss").

## Screen 2: Sprint Mode — Active Session

This screen replaces the sidebar layout entirely — it's a full-width focused writing view, no sidebar visible.

Top bar: on the far left, a "< Leave Session" link/button with a back-arrow icon. Centered, the bold title "Sprint Mode". On the far right, a red/danger-colored "End Session" button.

Below the top bar: a thin horizontal progress bar spanning most of the width, filled mostly purple (representing time or progress within the session).

Below that, centered: a very large bold countdown timer in purple, formatted as "00:05" (mm:ss), with a smaller gray subtext beneath it reading "Keep writing...".

Below that: a large rounded rectangle text area (the writing input) taking up most of the remaining width, containing the user's in-progress writing as plain paragraph text, with a visible text cursor at the end of the last typed line.

At the very bottom: a row of four stat readouts spaced evenly across the width, each with a label on top and a bold value below: "Words" (e.g. 124), "Characters" (e.g. 712), "WPM" (e.g. 62), "Time Elapsed" (e.g. 04:12).

## Screen 3: Session Complete

A modal/overlay-style screen, narrower than the full app width, centered, with decorative purple and yellow confetti-like dots scattered around the edges of the card.

Top-right of this card: a small circular refresh/redo icon and a close (X) icon.

Centered content: a large circular purple badge containing a white checkmark, then bold heading "Session Complete!", then a gray subtext "Great job! Keep pushing forward."

Below that, a row of four small stat cards (each with a small icon above its label): "Time" (clock icon, value e.g. 07:38, unit "mm:ss"), "Words" (document icon, value e.g. 612, unit "words"), "WPM" (headphone/speed icon, value e.g. 80, unit "wpm"), "Characters" (letter "A" icon, value e.g. 3,456, unit "characters").

At the bottom: two buttons side by side, equal width — "Discard" as an outline/secondary-style button on the left, "Save Writing" as a solid purple primary button on the right.

## Screen 4: Settings

Same sidebar as Home (with "Settings" shown as the active/highlighted nav item), main content area shows:

* Bold heading "Settings" at the top.
* A vertical list of setting category rows, each styled as a horizontal card/row with: a small icon on the left inside a rounded square badge, a bold category title, a one-line gray description beneath the title, and a right-facing chevron arrow on the far right indicating it's tappable/expandable. The categories in order: "General" (monitor icon, "Theme, fullscreen and general behavior"), "Writing" (pencil icon, "Timers, autosave and writing preferences"), "Topics" (book icon, "Manage built-in and custom topics"), "Statistics" (bar chart icon, "Statistics preferences and reset options"), "Privacy" (lock icon, "Offline information and data storage"), "About" (info icon, "Version, license and information").

## Screen 5: About

Same sidebar as Home (with "About" shown as active), main content area shows:

* The large logo centered near the top, with "BrainSprint" as a bold heading beneath it and "v1.0" as a smaller version tag beneath that.
* A short description line: "A minimal writing sprint application for focused thinking and flow."
* Below that, a vertical list of info rows, each with a label on the left and a value (sometimes a clickable link with an external-link icon) on the right: "License" → "MIT License", "Repository" → "github.com/yourname/brainsprint" (external link icon), "Website" → "brainsprint.app" (external link icon).
* At the very bottom, small centered gray text: a copyright line and "All data is stored locally on your device."

---

# Design System (Modern, Rounded, Cross-Platform)

The app must look like a clean modern productivity app — in the visual family of apps like Linear, Notion, or Vercel's dashboard — on every OS it runs on. This is not tied to any one platform's native design language. This section gives concrete values so the result is consistent and intentional, not a generic default web UI.

## Theme Mode: Light + Dark, System-Driven by Default

The app must support both a light theme and a dark theme.

* **Default behavior:** follow the OS system theme automatically. If the OS is in dark mode, the app launches in dark mode. If the OS is in light mode, the app launches in light mode.
* The user can override this in Settings (General → Follow System Theme on/off, with a manual Light/Dark toggle when override is on). This is a real setting, not a placeholder — implement it fully.
* Theme switching must be instant (no reload/restart required) and must apply consistently across every screen.
* Detect system theme using Tauri's OS theme detection API (`prefers-color-scheme` media query works at the webview layer; Tauri also exposes a native theme API — use whichever is more reliable, agent's call, but ask if unsure which to implement first).

## Colors

Use CSS custom properties so both themes stay consistent and easy to maintain. Two token sets, swapped via a `data-theme` attribute or class on the root element:

```css
:root[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f7f7f8;
  --bg-card: #ffffff;
  --accent-purple: #7c3aed;
  --accent-purple-hover: #6d28d9;
  --accent-yellow: #f59e0b;
  --text-primary: #18181b;
  --text-secondary: #6b7280;
  --border-subtle: #e5e7eb;
  --success: #16a34a;
  --danger: #dc2626;
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.08);
}

:root[data-theme="dark"] {
  --bg-primary: #18181b;
  --bg-secondary: #1f1f23;
  --bg-card: #27272b;
  --accent-purple: #8b5cf6;
  --accent-purple-hover: #a78bfa;
  --accent-yellow: #fbbf24;
  --text-primary: #f5f5f7;
  --text-secondary: #9ca3af;
  --border-subtle: #34343c;
  --success: #22c55e;
  --danger: #ef4444;
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.3);
}
```

Both palettes keep the same purple/yellow accent identity from the logo and mockup, just balanced for their respective backgrounds.

## Shape Language

Rounded everywhere, no sharp corners anywhere in the app:

* Window corners: 12px radius (where the OS/Tauri config allows custom window chrome)
* Cards / panels: 12–16px radius
* Buttons: 8–10px radius
* Input fields: 8px radius
* Small elements (badges, icon containers, tags): 6–8px radius

Depth comes from subtle shadows (`--shadow-card`) and background contrast between `--bg-primary`, `--bg-secondary`, and `--bg-card` — not from heavy borders. Borders, when used, should be 1px and use `--border-subtle`.

## Typography

* System UI font stack so it renders natively and fast on every OS, with no web font download needed: `font-family: -apple-system, "Segoe UI", "Inter", system-ui, sans-serif;`
* Headings: bold, confident sizing — large page titles like "Welcome to BrainSprint" in the mockup
* Body text: comfortable line-height (1.5+), especially inside the writing area where the user is staring at text for minutes at a time

## Layout Patterns

* Persistent left sidebar for navigation (matches mockup)
* Generous internal padding in cards and panels — avoid cramming content edge-to-edge
* Flat design with minimal, soft shadows for elevation rather than heavy borders or skeuomorphic effects
* Primary actions use solid accent-purple fill; secondary actions ("Discard," "Stay") use a muted/outline style

## Window Chrome

* Use a custom title bar where Tauri allows it, matching the active theme (light title bar in light mode, dark in dark mode) so the OS default title bar never breaks the app's visual consistency
* Keep window controls (minimize/maximize/close) simple and unobtrusive, consistent with the mockup, and themed to match light/dark mode

## What To Avoid

* No Material Design patterns (FAB buttons, ripple effects, Material-style elevation shadows)
* No sharp 0px-radius corners anywhere
* No generic unstyled default web UI (default browser buttons, default form inputs, Bootstrap-looking components) — every component should feel deliberately designed and consistent with the tokens above

---

# Logo Requirements

File: `assets/logo.svg`

Concept: Brain + Lightning Bolt (already designed — see the provided logo image as reference for the final look)

Style:

* Minimal
* Modern
* Flat
* Scalable (vector, SVG)

Requirements:

* Must work on dark backgrounds (primary use case)
* Must remain legible on light backgrounds
* Must work as a small app icon (Flatpak icon sizes, taskbar, favicon-equivalent)

---

# Data Ownership

Users must always be able to access their own data without using the app.

Requirements:

* Export custom topics (JSON)
* Export saved writings (plain text, already in human-readable form by default)
* All writing storage is plain text, never a proprietary or binary format
* All files must be readable by any text editor

No vendor lock-in. No proprietary formats anywhere in this app.

---

# Saved Writings

Enabled in v1.

Behavior:

After a session completes, prompt the user:

> "Save Writing?"
> [Save] [Discard]

Storage format: Plain text file, UTF-8.

Storage location (Linux, v1):

```
~/.local/share/brainsprint/writings/
```

Filename format:

```
YYYY-MM-DD-<slugified-topic-or-title>.txt
```

Example:

```
2026-06-17-life-on-mars.txt
```

Autosave: Disabled. Saving only happens through the explicit prompt above.

---

# Recovery Protection

Enabled by default.

Purpose: protect unfinished writing from crashes, power loss, forced shutdowns, or unexpected exits.

Temporary recovery files stored at (Linux, v1):

```
~/.local/share/brainsprint/recovery/
```

Behavior on launch:

If recovery data exists, prompt:

> "Previous Session Detected"
> [Recover] [Discard]

---

# Practice Mode

Practice Mode uses the same sprint mechanics as Sprint Mode, with these differences:

* Text is never deleted, regardless of pauses
* Longer timeout before the session ends
* Generally more forgiving, lower-pressure experience

Suggested defaults:

* Sprint Mode timeout: 5 seconds
* Practice Mode timeout: 15 seconds

Both values must be user-adjustable in Settings.

---

# Sprint Mode — Session End Behavior

This section defines the core loop and must be followed exactly:

* The countdown timer resets to its full value every time the user types a character.
* If the countdown reaches zero before the user types again, the session ends immediately.
* A session that ends this way is treated as a **completed session** for statistics purposes (it counts toward Total Sessions, Total Words, etc.) — the countdown reaching zero is the expected, normal way a sprint ends, not a failure state.
* The user can also end a session manually early via the "End Session" button. This also counts as a completed session, using whatever words/stats were recorded up to that point.
* There is no concept of a "failed" or "incomplete" session in v1. Every session that produced at least one word and was not actively discarded by the user counts.

---

# Custom Topics

Enabled in v1.

Features:

* Add Topic
* Edit Topic
* Delete Topic
* Import Topics (JSON)
* Export Topics (JSON)

Topics are stored locally only. No network access of any kind for this feature.

---

# Session Confirmation

Required.

If the user attempts to leave an active session — by returning home, navigating away, or closing the application — while writing is in progress, show:

> "Leave Session?"
> "Current progress will be lost."
> [Stay] [Leave]

This applies in both Sprint Mode and Practice Mode.

---

# Statistics

Lifetime Statistics:

* Total Sessions
* Total Words Written
* Total Writing Time

Personal Bests:

* Longest Session
* Most Words (single session)
* Highest WPM (single session)

Explicitly excluded from v1:

* No graphs
* No charts
* No analytics dashboard
* No trends over time / history view

Statistics are simple lifetime counters and personal-best records only.

---

# Settings Structure

**General**
* Follow System Theme
* Launch Fullscreen

**Writing**
* Sprint Timeout
* Practice Timeout
* Save Recovery Drafts (on/off)
* Save Prompt After Session (on/off)

**Topics**
* Built-in Topics (view only)
* Custom Topics (manage)
* Import Topics
* Export Topics

**Statistics**
* Enable Statistics (on/off)
* Show Personal Best Card (on/off)
* Reset Statistics

**Privacy**
* Offline Statement (static info, explains the app sends nothing anywhere)
* Data Storage Information (shows exact file paths in use)

**About**
* Version
* License
* Repository

---

# Project Structure

This is the required folder structure. Do not deviate from it without asking first.

```
brainsprint/
├── .git/
├── .gitignore
├── docs/
│   ├── BRAINSPRINT_PRD.md
│   ├── PROGRESS.md
│   └── mockup.png
├── assets/
│   ├── logo.svg
│   └── topics.json
├── src/                    # Rust backend (Tauri commands, app logic)
│   ├── main.rs
│   ├── commands/           # Tauri command handlers exposed to the UI
│   ├── models/             # Data structures (Topic, Session, Stats, etc.)
│   ├── storage/            # SQLite + plain-text file read/write logic
│   └── utils/
├── ui/                     # Frontend: plain HTML/CSS/JS, no framework
│   ├── index.html
│   ├── styles/
│   │   ├── theme.css       # Design system: colors, radii, fonts (see Design System section)
│   │   └── ...             # Component-specific styles
│   ├── scripts/
│   └── assets/             # UI-local images/icons if needed
├── flatpak/                # Flatpak packaging manifests
├── Cargo.toml
├── tauri.conf.json
├── README.md
└── LICENSE
```

---

# AI Agent Rules

These rules are mandatory and override convenience or "helpfulness" instincts. Follow them exactly, every time, without exception.

1. Follow the "Mockup Description (Text Equivalent)" section exactly for all visual decisions — this is the authoritative visual spec since `docs/mockup.png` cannot be read directly.
2. Follow this PRD exactly for all functional decisions.
3. Do not invent features that are not described in this document.
4. Do not add any network functionality, ever, for any reason.
5. Do not add telemetry of any kind.
6. Do not add analytics of any kind.
7. Do not add cloud services, sync, or remote storage of any kind.
8. Follow the Design System section exactly for all styling — colors (both light and dark token sets), border-radius values, fonts, and layout patterns. The goal is a clean, modern, rounded UI in the style of apps like Linear or Notion, consistent across every OS. Do not default to generic web-app styling (default browser inputs, Bootstrap-looking buttons, Material Design patterns, sharp corners).
9. Prefer simplicity over abstraction. Do not build generic/extensible systems for features that don't need them yet.
10. Maintain offline-first behavior in every feature, with no exceptions.
11. Keep app startup time under 2 seconds.
12. Keep idle RAM usage under 100 MB.
13. Do not use Electron.
14. Use Rust + Tauri + plain HTML/CSS/JS only. Do not introduce a frontend framework (React, Vue, Svelte, etc.) without being explicitly asked.
15. Do not write any Windows-specific packaging or distribution code yet (installers, MSI/MSIX configs, Windows-only file paths). The UI itself is already cross-platform by design and does not need separate Windows logic. Linux is the only packaging/distribution target for v1.
16. **Always ask before making any architectural change.** This includes: changing the folder structure, changing the storage format, changing how data flows between the Rust backend and the UI, or adding a new dependency that isn't already listed in this document's tech stack.
17. Implement features incrementally, one milestone at a time, in the order listed in the Development Roadmap below. Do not jump ahead to a later milestone.
18. Do not modify code unrelated to the current task or milestone.
19. If a requirement in this document is ambiguous or missing, stop and ask a clarifying question rather than guessing.
20. Explain what you're doing in plain language as you go. The project owner is learning as they build this and does not have deep Rust or Tauri experience yet — do not assume prior knowledge, but do not be condescending either.
21. After completing a milestone, summarize what was built and what was changed, and update `docs/PROGRESS.md` accordingly, before moving to the next milestone.
22. Privacy and local-first behavior always take priority over convenience, performance shortcuts, or "easier to build" alternatives.
23. Initialize git on Milestone 1 before writing feature code, and commit at the end of every milestone with a clear, descriptive message. Do not push to a remote or add one without asking first.

---

# Development Roadmap

Build in this exact order. Do not skip ahead.

**Milestone 1** — Project Skeleton
Initialize git. Set up the Cargo + Tauri project, folder structure, and `docs/PROGRESS.md`. Confirm a blank window launches on Linux. First commit happens here.

**Milestone 2** — Home Screen
Build the Home screen UI matching the mockup: sidebar nav, Sprint/Practice cards, Personal Bests, Lifetime Statistics (static/placeholder data is fine at this stage).

**Milestone 3** — Sprint Mode
Implement the core sprint loop: countdown, reset-on-keystroke, session end behavior (per the Sprint Mode section above), live word/character/WPM/time tracking.

**Milestone 4** — Practice Mode
Reuse Sprint Mode mechanics with Practice Mode's adjusted rules (no deletion, longer timeout).

**Milestone 5** — Settings
Build all settings screens and wire them to actually affect app behavior (timeouts, theme, toggles).

**Milestone 6** — Statistics
Implement real lifetime statistics and personal bests, persisted locally.

**Milestone 7** — Topics
Implement built-in + custom topics, including import/export JSON.

**Milestone 8** — Saved Writings
Implement the save/discard flow and plain-text file storage.

**Milestone 9** — Recovery Protection
Implement crash/exit recovery file handling and the recovery prompt on launch.

**Milestone 10** — Flatpak Packaging
Package the app for Flathub distribution on Linux.

**Milestone 11** — Flathub Submission
Prepare and submit to Flathub.

**Not in this roadmap (future, separate effort):** Windows support. Do not begin this until v1 is complete and it is explicitly requested.
