# Cinematic Slideshow

A professional desktop slideshow video generator built with **Electron**, **React**, **TypeScript**, **Vite**, **Tailwind CSS**, and **FFmpeg**.

Runs entirely locally — no backend, no cloud processing.

## Tech Stack

| Layer      | Technology        |
| ---------- | ----------------- |
| Desktop    | Electron          |
| UI         | React + TypeScript |
| Build      | Vite (electron-vite) |
| Styling    | Tailwind CSS v4   |
| Rendering  | FFmpeg            |
| State      | Zustand           |

## Project Structure

```
src/
├── main/                    # Electron main process
│   └── index.ts
├── preload/                 # Secure IPC bridge
│   └── index.ts
├── renderer/                # React UI
│   └── src/
│       ├── components/
│       │   ├── layout/      # App shell, sidebar, panels
│       │   ├── upload/      # Image drag-drop, thumbnails
│       │   ├── timeline/    # Preview timeline, scrubber
│       │   ├── preview/     # Video preview player
│       │   └── export/      # Export settings & progress
│       ├── hooks/           # Reusable React hooks
│       ├── stores/          # Zustand state stores
│       ├── lib/
│       │   ├── effects/     # Ken Burns effect definitions
│       │   ├── transitions/ # Transition definitions
│       │   ├── easing/      # Easing & interpolation
│       │   └── randomizer/  # Smart effect/transition picker
│       └── types/           # Shared TypeScript types
└── shared/                  # Types shared across processes
    └── types/
```

## 12-Commit Roadmap

| #  | Commit | Scope |
| -- | ------ | ----- |
| 1  | ✅ Scaffold | Electron + React + TS + Vite + Tailwind, folder structure |
| 2  | Types & layout | Core types, Zustand store, app shell UI |
| 3  | Image upload | Drag-drop, file picker, thumbnails (JPG/PNG/WEBP) |
| 4  | Reorder & duration | Image reordering, target duration, auto per-image calc |
| 5  | Ken Burns effects | Cinematic camera motion library + easing |
| 6  | Transitions | Crossfade, wipe, slide, dip, blur, etc. |
| 7  | Randomizer | Smart effect/transition selection engine |
| 8  | Music | Audio upload, trim, fade in/out |
| 9  | Preview | Timeline play/pause/seek/scrub |
| 10 | FFmpeg engine | Filter graphs, zoompan, hardware accel |
| 11 | Project I/O | Save/open project files |
| 12 | Export | MP4 H264/H265, MOV, 720p/1080p |

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

| Command          | Description              |
| ---------------- | ------------------------ |
| `npm run dev`    | Start dev server + app   |
| `npm run build`  | Production build         |
| `npm run typecheck` | TypeScript check      |

## Requirements

- Node.js 20+
- FFmpeg installed and available on PATH (needed from commit 10 onward)
