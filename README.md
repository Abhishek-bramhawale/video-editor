# Cinematic Slideshow

A professional desktop slideshow video generator built with **Electron**, **React**, **TypeScript**, **Vite**, **Tailwind CSS**, and **FFmpeg**.

Runs entirely locally — no backend, no cloud processing.

## Features

- **Image upload** — drag & drop, browse hundreds of images, thumbnail grid, reorder
- **Auto duration** — set target length (2/4/7/10 min presets), per-image timing calculated automatically
- **Ken Burns effects** — 21 cinematic camera motions with cubic/bezier easing
- **Transitions** — 15 randomized professional transitions (crossfade, wipe, slide, dip, etc.)
- **Smart randomizer** — avoids repeating effects and transitions
- **Music** — MP3/WAV/M4A with auto-trim, fade in/out
- **Preview** — timeline with play/pause/seek/scrub
- **FFmpeg export** — H.264, H.265, MOV at 720p/1080p with hardware acceleration
- **Project save/open** — `.csproj` JSON project files

## Getting Started

```bash
npm install
npm run dev
```

## Requirements

- Node.js 20+
- [FFmpeg](https://ffmpeg.org/download.html) on PATH (for export)

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start dev server + app |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |

## Architecture

```
src/
├── main/           # Electron main + FFmpeg renderer
├── preload/        # IPC bridge
├── renderer/       # React UI
└── shared/         # Shared TypeScript types
```
