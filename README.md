<p align="center">
  <img src="assets/app-logo.png" alt="BrainSprint logo" width="120" />
</p>

<h1 align="center">BrainSprint</h1>

<p align="center">
  A fully local, privacy-respecting writing sprint app for training continuous thinking and focus.
</p>

---

## What is BrainSprint?

BrainSprint is a small, fast, distraction-free desktop app built around one core idea: **write continuously, before the countdown runs out.** It's a focus and flow training tool — type without stopping, beat the clock, and build the habit of continuous, uninterrupted thinking.

No accounts. No internet required. No analytics. Nothing leaves your device, ever.

## Status

🚧 **Early development.** Not yet usable. Following the roadmap in [`docs/BRAINSPRINT_PRD.md`](docs/BRAINSPRINT_PRD.md). Live build progress is tracked in [`docs/PROGRESS.md`](docs/PROGRESS.md).

## Core Principles

- **Privacy first** — fully offline, no telemetry, no analytics, no cloud, no accounts.
- **Local first** — all data (settings, stats, writings, recovery drafts) lives on your device, in plain readable files.
- **Simple by design** — launch, start a sprint, write. No bloat, no unnecessary features.

## Tech Stack

- [Rust](https://www.rust-lang.org/) — backend and app logic
- [Tauri](https://tauri.app/) — lightweight native app shell (not Electron)
- Plain HTML / CSS / JavaScript — UI layer
- [SQLite](https://www.sqlite.org/) — local storage for stats and topics

## Platform Support

Linux is the primary target for v1, distributed via [Flathub](https://flathub.org/). Windows support is planned for a later release, using the same codebase.

## License

[MIT](LICENSE) © Andre Joseph

## Author

Built by [Andre Joseph](https://github.com/vylonvygh) (also known as Vylon Vy).
