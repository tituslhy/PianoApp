# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install dependencies
npm run dev         # start Vite dev server (http://localhost:5173)
npm run build       # tsc -b (project-references type check) && vite build
npm run lint        # eslint .
npm run preview     # preview the production build
node scripts/generate-midi.mjs   # regenerate the simplified twinkle/fur-elise .mid fixtures in public/songs/
node scripts/fetch-piano-samples.mjs   # download the Salamander Grand Piano mp3 samples into public/audio/salamander/
node scripts/generate-pwa-icons.mjs    # rasterize public/favicon.svg into the PWA manifest icons in public/
```

There is no test framework in this repo (no test runner in `package.json`, no test files). Verification is `npm run build` + `npm run lint`, plus manual browser checks (e.g. via Playwright MCP) for audio/UI behavior. Do not assume a `npm test` script exists; do not introduce a test framework unless explicitly asked.

To type-check a single file without a full build, use `npx tsc --noEmit <path>`; there's no per-file/per-test runner since there are no tests.

## Architecture

Client-only SPA: Vite + React 19 + TypeScript, no backend/database/auth, no SSR/Next.js. Deploy target is Vercel as a static SPA.

### Core data flow

```
src/audio/keyMap.ts   physical-keyboard-key ↔ note-name mapping + on-screen chromatic layout (C1–C8)
src/audio/engine.ts   Tone.Sampler singleton (Salamander Grand Piano samples); playNote/releaseNote
src/songs/parser.ts   fetches + parses a .mid file (via @tonejs/midi) into a ParsedSong
src/songs/player.ts   SongPlayer class: schedules notes on Tone.Transport, drives playback
src/songs/index.ts    static SONGS catalogue (id, title, difficulty, tempo, midiPath)

src/hooks/useAudio.ts        wraps audio/engine.ts lifecycle (idle/loading/ready/error) for React
src/hooks/useKeyboard.ts     maps physical keydown/keyup to notes, tracks pressed-note set
src/hooks/useOctaveShift.ts  movable baseOctave (1–6) for the 25-key hotkey window, Arrow Up/Down
src/hooks/useSong.ts         song selection, MIDI loading, mode, playback state (wraps SongPlayer)
src/hooks/usePiano.ts        composes the above into one API consumed by App.tsx
src/hooks/useKeyboardWidth.ts responsive white-key width (ResizeObserver-driven)
src/hooks/useTheme.ts        dark/light theme, persisted to localStorage, applied via data-theme

src/components/   on-screen Keyboard/PianoKey rendering, SongSelector, PlaybackControls,
                  OctaveControl, AudioUnlockOverlay, Header, ThemeToggle
src/App.tsx       root component — wires usePiano() output into the component tree
```

### Key architectural points

- **Audio engine is a module-level singleton, not React state.** `src/audio/engine.ts` holds the `Tone.Sampler` and lifecycle state outside React; `useAudio` subscribes via `useSyncExternalStore`. Never move sampler/playback state into React state.
- **Audio must only initialize from a user gesture.** `initAudio()` synchronously creates and resumes a native `AudioContext` before any `await`, because importing `tone` eagerly creates its own context at module-load time — too early for iOS Safari to ever unlock. Don't reorder `unlockNativeAudioContext()` after an `await` in that path.
- **Keyboard hotkeys are a movable 25-key window, not a full 85-key remap.** The on-screen keyboard spans C1–C8 (85 keys, to cover songs with wide ranges like La Campanella), but only 25 physical keys have shortcuts. `KEY_OFFSETS` in `keyMap.ts` are fixed semitone offsets resolved against a shiftable `baseOctave` (Arrow Up/Down, clamped 1–6). When changing key mapping, this offset/baseOctave split is the load-bearing concept.
- **`SongPlayer` (src/songs/player.ts) is one class with a `mode` flag** (`'follow' | 'play'`), not two separate player classes — follow-along pauses `Tone.Transport` and waits for the matching keypress; play-along auto-triggers/releases the sampler on schedule via `onAutoNoteStart`/`onAutoNoteEnd` callbacks. Mode can only change while playback is stopped (enforced both in `SongPlayer.setMode` and the `useSong` wrapper) — don't bypass this guard.
- **Highlighted notes are always a set** (`highlightedNotes: NoteName[]`), even for a single note, to support chords and play-along multi-note highlighting. Follow-along and play-along use visually distinct highlight colors (amber vs teal/`auto-playing`) since they mean different things ("press this" vs "this is sounding now").
- **Responsive keyboard width** (`useKeyboardWidth`) drops its minimum-width floor at the 640px container-width breakpoint so the full keyboard fits without scrolling on desktop; below that it keeps a tap-friendly minimum and scrolls. Key labels hide below 36px white-key width — this is intentional degradation, not a bug, even though it means labels are hidden at many common desktop widths.

## Conventions

(From `.cursor/rules/*.mdc` and `AGENTS.md` — these apply across the codebase.)

- TypeScript only in `src/` — no `.js` files, no `any` (use `unknown` + narrowing or a proper type).
- Every function/component needs a JSDoc comment (`@param`/`@returns`).
- Named exports only — no default exports (except React itself).
- Note names always use scientific notation (`"C4"`, `"F#5"`) — `src/audio/keyMap.ts` is the single source of truth for key↔note mapping.
- Tailwind for all styling — no inline styles, no CSS modules.
- Audio operations are wrapped in try/catch; errors are surfaced, never silently swallowed.
- No backend, database, or auth; no Next.js; no Web MIDI API; no game engines.
