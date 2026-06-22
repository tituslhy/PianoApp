# Octave-Shift Hotkeys, Play-Along Mode, and Responsive Keyboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the 85-key (C1–C8) on-screen keyboard physical-keyboard shortcuts everywhere via an octave-shiftable hotkey window, add a "play-along" auto-play mode alongside the existing follow-along mode, and make the keyboard fit on screen without horizontal scrolling except on phone-width viewports.

**Architecture:** The 25 existing hotkeys keep fixed relative semitone offsets and resolve against a movable `baseOctave` (new `useOctaveShift` hook + Arrow Up/Down + on-screen control). `SongPlayer` gains a `mode: 'follow' | 'play'` toggle on its existing scheduler — follow mode keeps today's pause-and-wait behavior, play mode schedules sampler-trigger + release pairs per note without pausing. Highlighting generalizes from a single note to a set, shared by both modes. Keyboard sizing drops its minimum-width floor above a 640px container-width breakpoint so all 50 white keys always fit; below it, today's scrollable behavior is unchanged.

**Tech Stack:** React 19, TypeScript, Tone.js (`Tone.Transport` scheduling, `Tone.Sampler`), Tailwind CSS, Vite. No test runner is configured in this project.

## Global Constraints

- No automated test framework exists in this repo (`package.json` has no `vitest`/`jest`/etc.). Every task's verification step is `npm run build` (runs `tsc -b`, catching type errors) followed by `npm run lint`. Do not introduce a test framework as part of this plan — out of scope per the approved spec.
- The final task does a manual, scripted browser verification (via the Playwright MCP tools, the same approach already used to verify the La Campanella keyboard extension in this repo's history) since UI/audio behavior can't be checked by the type checker alone.
- Base octave range is **1–6 inclusive**. Phone breakpoint is **640px** container width. Label-hiding threshold is **36px** white-key width. These exact values come from the approved spec at `docs/superpowers/specs/2026-06-22-octave-shift-and-play-along-design.md` — don't substitute different numbers.
- Follow these steps in order. Each task assumes all prior tasks are complete.

---

### Task 1: Dynamic base-octave support in `keyMap.ts`

**Files:**
- Modify: `src/audio/keyMap.ts` (full rewrite of the key-mapping portion)

**Interfaces:**
- Produces: `MIN_BASE_OCTAVE: number`, `MAX_BASE_OCTAVE: number`, `DEFAULT_BASE_OCTAVE: number`, `clampBaseOctave(baseOctave: number): number`, `buildKeyToNote(baseOctave: number): Record<string, NoteName>`, `getKeyboardLayout(baseOctave: number): PianoKeyDefinition[]` (signature changed — now takes a parameter).
- Removes: the static `KEY_TO_NOTE` export, the static `noteToKeyboardKey` export, and the now-dead `getKeyMap()` export (confirmed unused outside this file).

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/audio/keyMap.ts` with:

```ts
import type { NoteName, PianoKeyDefinition } from '../types/index.ts';

/** Minimum base octave for the movable 25-key hotkey window. */
export const MIN_BASE_OCTAVE = 1;

/** Maximum base octave for the movable 25-key hotkey window. */
export const MAX_BASE_OCTAVE = 6;

/** Default base octave — matches the keyboard's original C4–C6 hotkey range. */
export const DEFAULT_BASE_OCTAVE = 4;

/**
 * Keyboard key → semitone offset from the current base octave's C (0–24).
 * Fixed regardless of octave shift; only the resolved note name moves.
 */
const KEY_OFFSETS: Record<string, number> = {
  // White keys, octave 0 of the window
  a: 0,
  s: 2,
  d: 4,
  f: 5,
  g: 7,
  h: 9,
  j: 11,
  // Black keys, octave 0 of the window
  w: 1,
  e: 3,
  t: 6,
  y: 8,
  u: 10,
  // White keys, octave 1 of the window
  k: 12,
  l: 14,
  ';': 16,
  "'": 17,
  '\\': 19,
  z: 21,
  x: 23,
  // Black keys, octave 1 of the window
  o: 13,
  p: 15,
  '[': 18,
  ']': 20,
  '/': 22,
  // C, octave 2 of the window (extends range by one note)
  c: 24,
};

const PITCH_CLASSES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

/**
 * Builds a chromatic note sequence from the C of `startOctave` through the C of `endOctave`.
 * @param startOctave - Octave of the first note (a C).
 * @param endOctave - Octave of the final note (a C).
 * @returns Chromatic note names in ascending order.
 */
function buildChromaticRange(startOctave: number, endOctave: number): NoteName[] {
  const notes: NoteName[] = [];

  for (let octave = startOctave; octave <= endOctave; octave += 1) {
    for (const pitch of PITCH_CLASSES) {
      if (octave === endOctave && pitch !== 'C') {
        break;
      }
      notes.push(`${pitch}${octave}`);
    }
  }

  return notes;
}

/** Chromatic layout from C1 through C8 for the on-screen keyboard — covers the full song catalogue's note range. */
const LAYOUT_NOTES: readonly NoteName[] = buildChromaticRange(1, 8);

/**
 * Resolves a semitone offset (0–24) against a base octave into a note name.
 * @param baseOctave - Octave of the window's lowest C.
 * @param offset - Semitone offset from that C.
 * @returns Note in scientific notation, e.g. "F#5".
 */
function resolveNote(baseOctave: number, offset: number): NoteName {
  const pitch = PITCH_CLASSES[offset % 12];
  const octave = baseOctave + Math.floor(offset / 12);
  return `${pitch}${octave}`;
}

/**
 * Clamps a candidate base octave to the keyboard's valid shift range.
 * @param baseOctave - Candidate base octave.
 * @returns Clamped base octave within [MIN_BASE_OCTAVE, MAX_BASE_OCTAVE].
 */
export function clampBaseOctave(baseOctave: number): number {
  return Math.min(MAX_BASE_OCTAVE, Math.max(MIN_BASE_OCTAVE, baseOctave));
}

/**
 * Builds the keyboard key → note map for the given base octave.
 * @param baseOctave - Octave of the 25-key window's lowest C.
 * @returns Record of keyboard key strings to scientific note names.
 */
export function buildKeyToNote(baseOctave: number): Record<string, NoteName> {
  const clamped = clampBaseOctave(baseOctave);
  return Object.fromEntries(
    Object.entries(KEY_OFFSETS).map(([key, offset]) => [key, resolveNote(clamped, offset)]),
  );
}

/**
 * Builds the note → keyboard key reverse lookup for the given base octave.
 * @param baseOctave - Octave of the 25-key window's lowest C.
 * @returns Record of scientific note names to their keyboard key.
 */
function buildNoteToKeyboardKey(baseOctave: number): Record<NoteName, string> {
  const keyToNote = buildKeyToNote(baseOctave);
  return Object.fromEntries(
    Object.entries(keyToNote).map(([key, note]) => [note, key]),
  ) as Record<NoteName, string>;
}

/**
 * Extracts the octave number from a scientific note name.
 * @param note - Note in scientific notation, e.g. "F#5".
 * @returns Octave digit, or 4 if parsing fails.
 */
function getOctaveFromNote(note: NoteName): number {
  const match = /(\d+)$/.exec(note);
  return match ? Number.parseInt(match[1], 10) : 4;
}

/**
 * Returns whether a note name represents a black (sharp) key.
 * @param note - Note in scientific notation.
 * @returns True when the note contains a sharp accidental.
 */
function isBlackNote(note: NoteName): boolean {
  return note.includes('#');
}

/**
 * Returns piano key definitions for every key from C1 through C8, with keyboard
 * shortcut badges resolved for the current base octave.
 * @param baseOctave - Octave of the 25-key hotkey window's lowest C.
 * @returns Ordered array suitable for rendering the keyboard layout.
 */
export function getKeyboardLayout(baseOctave: number): PianoKeyDefinition[] {
  const noteToKeyboardKey = buildNoteToKeyboardKey(baseOctave);

  return LAYOUT_NOTES.map((note) => ({
    note,
    isBlack: isBlackNote(note),
    keyboardKey: noteToKeyboardKey[note],
    octave: getOctaveFromNote(note),
  }));
}
```

- [ ] **Step 2: Verify the offset table matches the original mapping**

This project has no standalone TS runner installed, so verify with a plain-JS reimplementation of the same formula (`note = PITCH_CLASSES[offset % 12] + (baseOctave + Math.floor(offset / 12))`) fed the exact `KEY_OFFSETS` values from Step 1:

```bash
node -e "
const PITCH_CLASSES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const KEY_OFFSETS = {a:0,s:2,d:4,f:5,g:7,h:9,j:11,w:1,e:3,t:6,y:8,u:10,k:12,l:14,';':16,\"'\":17,'\\\\':19,z:21,x:23,o:13,p:15,'[':18,']':20,'/':22,c:24};
const resolve = (base, off) => PITCH_CLASSES[off % 12] + (base + Math.floor(off / 12));
const out = {};
for (const [key, off] of Object.entries(KEY_OFFSETS)) out[key] = resolve(4, off);
console.log(JSON.stringify(out));
"
```

Expected output (order may vary): `{"a":"C4","s":"D4","d":"E4","f":"F4","g":"G4","h":"A4","j":"B4","w":"C#4","e":"D#4","t":"F#4","y":"G#4","u":"A#4","k":"C5","l":"D5",";":"E5","'":"F5","\\":"G5","z":"A5","x":"B5","o":"C#5","p":"D#5","[":"F#5","]":"G#5","/":"A#5","c":"C6"}` — i.e. exactly the original hardcoded mapping. This is also re-verified end-to-end in Task 5's manual browser check, which confirms the on-screen badges at the default octave match these same keys.

- [ ] **Step 3: Type-check and lint**

Run: `npm run build`
Expected: FAILS — `src/hooks/usePiano.ts` and `src/hooks/useKeyboard.ts` still reference the old `KEY_TO_NOTE`/no-arg `getKeyboardLayout()`. This is expected; those are fixed in Tasks 3–4. Confirm the *only* errors are in those two files (referencing removed/changed exports from `keyMap.ts`), not new typos in `keyMap.ts` itself.

- [ ] **Step 4: Commit**

```bash
git add src/audio/keyMap.ts
git commit -m "feat: make keyboard hotkey mapping octave-shiftable"
```

---

### Task 2: `useOctaveShift` hook

**Files:**
- Create: `src/hooks/useOctaveShift.ts`

**Interfaces:**
- Consumes: `clampBaseOctave`, `DEFAULT_BASE_OCTAVE`, `MAX_BASE_OCTAVE`, `MIN_BASE_OCTAVE` from `../audio/keyMap` (Task 1).
- Produces: `useOctaveShift(): { baseOctave: number; canShiftDown: boolean; canShiftUp: boolean; shiftDown: () => void; shiftUp: () => void; }`.

- [ ] **Step 1: Write the hook**

Create `src/hooks/useOctaveShift.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';

import {
  clampBaseOctave,
  DEFAULT_BASE_OCTAVE,
  MAX_BASE_OCTAVE,
  MIN_BASE_OCTAVE,
} from '../audio/keyMap';

/** Return value from {@link useOctaveShift}. */
export interface UseOctaveShiftResult {
  baseOctave: number;
  canShiftDown: boolean;
  canShiftUp: boolean;
  shiftDown: () => void;
  shiftUp: () => void;
}

/**
 * Tracks the movable base octave for the 25-key hotkey window and listens for
 * Arrow Up / Arrow Down to shift it, clamped to the keyboard's valid range.
 * @returns Current base octave, shift helpers, and clamp-limit flags.
 */
export function useOctaveShift(): UseOctaveShiftResult {
  const [baseOctave, setBaseOctave] = useState(DEFAULT_BASE_OCTAVE);

  const shiftBy = useCallback((delta: number): void => {
    setBaseOctave((current) => clampBaseOctave(current + delta));
  }, []);

  const shiftDown = useCallback((): void => shiftBy(-1), [shiftBy]);
  const shiftUp = useCallback((): void => shiftBy(1), [shiftBy]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat) {
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        shiftUp();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        shiftDown();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shiftUp, shiftDown]);

  return {
    baseOctave,
    canShiftDown: baseOctave > MIN_BASE_OCTAVE,
    canShiftUp: baseOctave < MAX_BASE_OCTAVE,
    shiftDown,
    shiftUp,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: same pre-existing failures as Task 1 (usePiano.ts/useKeyboard.ts), no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useOctaveShift.ts
git commit -m "feat: add useOctaveShift hook for arrow-key octave shifting"
```

---

### Task 3: `useKeyboard` accepts a dynamic key map

**Files:**
- Modify: `src/hooks/useKeyboard.ts`

**Interfaces:**
- Consumes: nothing new from other tasks (just stops importing the now-removed static `KEY_TO_NOTE`).
- Produces: `UseKeyboardOptions` gains a required `keyMap: Record<string, NoteName>` field. Public return shape (`UseKeyboardResult`) is unchanged.

- [ ] **Step 1: Remove the static import and add `keyMap` to options**

In `src/hooks/useKeyboard.ts`, replace:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

import { KEY_TO_NOTE } from '../audio/keyMap';
import type { NoteName } from '../types';

/** Options for wiring physical keyboard input to note callbacks. */
export interface UseKeyboardOptions {
  enabled: boolean;
  onNoteDown: (note: NoteName) => void;
  onNoteUp: (note: NoteName) => void;
}
```

with:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

import type { NoteName } from '../types';

/** Options for wiring physical keyboard input to note callbacks. */
export interface UseKeyboardOptions {
  enabled: boolean;
  onNoteDown: (note: NoteName) => void;
  onNoteUp: (note: NoteName) => void;
  keyMap: Record<string, NoteName>;
}
```

- [ ] **Step 2: Destructure `keyMap` and track it in a ref**

Replace:

```ts
export const useKeyboard = ({
  enabled,
  onNoteDown,
  onNoteUp,
}: UseKeyboardOptions): UseKeyboardResult => {
  const [pressedNotes, setPressedNotes] = useState<Set<NoteName>>(
    () => new Set(),
  );
  const pressedNotesRef = useRef<Set<NoteName>>(pressedNotes);
  const onNoteDownRef = useRef(onNoteDown);
  const onNoteUpRef = useRef(onNoteUp);

  useEffect(() => {
    pressedNotesRef.current = pressedNotes;
  }, [pressedNotes]);

  useEffect(() => {
    onNoteDownRef.current = onNoteDown;
    onNoteUpRef.current = onNoteUp;
  }, [onNoteDown, onNoteUp]);
```

with:

```ts
export const useKeyboard = ({
  enabled,
  onNoteDown,
  onNoteUp,
  keyMap,
}: UseKeyboardOptions): UseKeyboardResult => {
  const [pressedNotes, setPressedNotes] = useState<Set<NoteName>>(
    () => new Set(),
  );
  const pressedNotesRef = useRef<Set<NoteName>>(pressedNotes);
  const onNoteDownRef = useRef(onNoteDown);
  const onNoteUpRef = useRef(onNoteUp);
  const keyMapRef = useRef(keyMap);

  useEffect(() => {
    pressedNotesRef.current = pressedNotes;
  }, [pressedNotes]);

  useEffect(() => {
    onNoteDownRef.current = onNoteDown;
    onNoteUpRef.current = onNoteUp;
  }, [onNoteDown, onNoteUp]);

  useEffect(() => {
    keyMapRef.current = keyMap;
  }, [keyMap]);
```

- [ ] **Step 3: Use the ref in both listeners**

Replace both occurrences of:

```ts
      const note = KEY_TO_NOTE[event.key.toLowerCase()];
```

with:

```ts
      const note = keyMapRef.current[event.key.toLowerCase()];
```

(There are two — one in `handleKeyDown`, one in `handleKeyUp`.)

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: this file's own errors are gone; `usePiano.ts` still fails (fixed in Task 4).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useKeyboard.ts
git commit -m "feat: make useKeyboard accept a dynamic key map"
```

---

### Task 4: Wire octave shift into `usePiano`

**Files:**
- Modify: `src/hooks/usePiano.ts`

**Interfaces:**
- Consumes: `useOctaveShift` (Task 2), `buildKeyToNote`/`getKeyboardLayout(baseOctave)` (Task 1), updated `useKeyboard({ ..., keyMap })` (Task 3).
- Produces: `UsePianoResult` gains `baseOctave: number`, `canShiftOctaveDown: boolean`, `canShiftOctaveUp: boolean`, `shiftOctaveDown: () => void`, `shiftOctaveUp: () => void`.

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/hooks/usePiano.ts` with:

```ts
import { useCallback, useMemo, useRef } from 'react';

import { buildKeyToNote, getKeyboardLayout } from '../audio/keyMap';
import type {
  AudioEngineState,
  KeyboardInteractionHandlers,
  NoteName,
  PianoKeyDefinition,
  ParsedSong,
  SongMetadata,
  SongPlaybackState,
} from '../types';
import { useAudio } from './useAudio';
import { useKeyboard } from './useKeyboard';
import { useOctaveShift } from './useOctaveShift';
import { useSong } from './useSong';

/** Combined piano interaction surface for the root app component. */
export interface UsePianoResult {
  pressedNotes: Set<NoteName>;
  highlightedNote: NoteName | null;
  keyboardLayout: PianoKeyDefinition[];
  handlers: KeyboardInteractionHandlers;
  songs: SongMetadata[];
  selectedSong: ParsedSong | null;
  selectSong: (id: string) => void;
  playbackState: SongPlaybackState;
  startPlayback: () => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  audioState: AudioEngineState;
  ensureAudioReady: () => Promise<void>;
  songLoadError: string | null;
  baseOctave: number;
  canShiftOctaveDown: boolean;
  canShiftOctaveUp: boolean;
  shiftOctaveDown: () => void;
  shiftOctaveUp: () => void;
}

/**
 * Orchestrates audio, keyboard, and song follow-along hooks into one app-level API.
 * @returns Everything `App.tsx` needs to render the piano and song player UI.
 */
export const usePiano = (): UsePianoResult => {
  const pendingDownRef = useRef(new Set<NoteName>());
  const { audioState, ensureAudioReady, playNote, releaseNote } = useAudio();
  const {
    songs,
    selectedSong,
    selectSong,
    playbackState,
    startPlayback,
    pausePlayback,
    stopPlayback,
    handleNoteInput,
    songLoadError,
  } = useSong();
  const {
    baseOctave,
    canShiftDown: canShiftOctaveDown,
    canShiftUp: canShiftOctaveUp,
    shiftDown: shiftOctaveDown,
    shiftUp: shiftOctaveUp,
  } = useOctaveShift();

  /**
   * Plays a note after ensuring the audio engine has started.
   * Skips attack if the key was released before samples finished loading.
   * @param note - Scientific notation note name, e.g. "C4".
   */
  const handleNoteDown = useCallback(
    (note: NoteName): void => {
      pendingDownRef.current.add(note);

      void ensureAudioReady()
        .then(() => {
          if (!pendingDownRef.current.has(note)) {
            return;
          }

          playNote(note);
          handleNoteInput(note);
        })
        .catch(() => {
          pendingDownRef.current.delete(note);
        });
    },
    [ensureAudioReady, playNote, handleNoteInput],
  );

  /**
   * Releases a held note on the sampler.
   * @param note - Scientific notation note name, e.g. "C4".
   */
  const handleNoteUp = useCallback(
    (note: NoteName): void => {
      pendingDownRef.current.delete(note);
      releaseNote(note);
    },
    [releaseNote],
  );

  const keyMap = useMemo(() => buildKeyToNote(baseOctave), [baseOctave]);

  const { pressedNotes, trackNoteDown, trackNoteUp } = useKeyboard({
    enabled: true,
    onNoteDown: handleNoteDown,
    onNoteUp: handleNoteUp,
    keyMap,
  });

  const keyboardLayout = useMemo(() => getKeyboardLayout(baseOctave), [baseOctave]);

  const handlers: KeyboardInteractionHandlers = useMemo(
    () => ({
      onKeyDown: (note: NoteName): void => {
        if (!trackNoteDown(note)) {
          return;
        }

        handleNoteDown(note);
      },
      onKeyUp: (note: NoteName): void => {
        if (!trackNoteUp(note)) {
          return;
        }

        handleNoteUp(note);
      },
    }),
    [trackNoteDown, trackNoteUp, handleNoteDown, handleNoteUp],
  );

  return {
    pressedNotes,
    highlightedNote: playbackState.highlightedNote,
    keyboardLayout,
    handlers,
    songs,
    selectedSong,
    selectSong,
    playbackState,
    startPlayback,
    pausePlayback,
    stopPlayback,
    audioState,
    ensureAudioReady,
    songLoadError,
    baseOctave,
    canShiftOctaveDown,
    canShiftOctaveUp,
    shiftOctaveDown,
    shiftOctaveUp,
  };
};
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run build && npm run lint`
Expected: both PASS — this clears the errors left over from Tasks 1–3.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePiano.ts
git commit -m "feat: wire octave shift state into usePiano"
```

---

### Task 5: `OctaveControl` component and `App.tsx` wiring

**Files:**
- Create: `src/components/OctaveControl.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `baseOctave`, `canShiftOctaveDown`, `canShiftOctaveUp`, `shiftOctaveDown`, `shiftOctaveUp` from `usePiano()` (Task 4).

- [ ] **Step 1: Create the component**

Create `src/components/OctaveControl.tsx`:

```tsx
/** Props for the octave-shift indicator and controls. */
export interface OctaveControlProps {
  baseOctave: number;
  canShiftDown: boolean;
  canShiftUp: boolean;
  onShiftDown: () => void;
  onShiftUp: () => void;
}

/**
 * Formats the current 25-key hotkey window as a human-readable range.
 * @param baseOctave - Octave of the window's lowest C.
 * @returns Range label, e.g. "C4–C6".
 */
function octaveRangeLabel(baseOctave: number): string {
  return `C${baseOctave}–C${baseOctave + 2}`;
}

/**
 * Shows the current keyboard-shortcut octave range with up/down shift buttons.
 * Mirrors the Arrow Up/Down keyboard shortcuts for touch-only devices.
 * @param props - Current base octave, clamp-limit flags, and shift handlers.
 * @returns Small inline control bar.
 */
export function OctaveControl({
  baseOctave,
  canShiftDown,
  canShiftUp,
  onShiftDown,
  onShiftUp,
}: OctaveControlProps) {
  return (
    <div className="flex items-center gap-3 text-sm text-piano-text-muted">
      <span>Keys: {octaveRangeLabel(baseOctave)}</span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onShiftDown}
          disabled={!canShiftDown}
          aria-label="Shift hotkeys down an octave"
          className="rounded-md border border-piano-border px-2 py-1 text-xs font-medium text-piano-text transition hover:bg-piano-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={onShiftUp}
          disabled={!canShiftUp}
          aria-label="Shift hotkeys up an octave"
          className="rounded-md border border-piano-border px-2 py-1 text-xs font-medium text-piano-text transition hover:bg-piano-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `App.tsx`**

In `src/App.tsx`, add the import:

```ts
import { OctaveControl } from './components/OctaveControl';
```

Add to the `usePiano()` destructure (after `songLoadError,`):

```ts
    baseOctave,
    canShiftOctaveDown,
    canShiftOctaveUp,
    shiftOctaveDown,
    shiftOctaveUp,
```

Add this block directly above the existing `<Keyboard ... />` element:

```tsx
      <div className="flex w-full max-w-2xl justify-end">
        <OctaveControl
          baseOctave={baseOctave}
          canShiftDown={canShiftOctaveDown}
          canShiftUp={canShiftOctaveUp}
          onShiftDown={shiftOctaveDown}
          onShiftUp={shiftOctaveUp}
        />
      </div>

```

- [ ] **Step 3: Type-check and lint**

Run: `npm run build && npm run lint`
Expected: both PASS.

- [ ] **Step 4: Manual check**

Run: `npm run dev`, open the printed local URL in a browser.
Expected: a "Keys: C4–C6" label with ↓/↑ buttons appears above the keyboard. Click ↑ five times — label should stop advancing past "Keys: C6–C8" (↑ button becomes disabled). Click ↓ enough times — label stops at "Keys: C1–C3" (↓ button disabled). Press the physical Arrow Up/Down keys — same behavior. Stop the dev server after checking (`Ctrl+C` or kill the background process).

- [ ] **Step 5: Commit**

```bash
git add src/components/OctaveControl.tsx src/App.tsx
git commit -m "feat: add OctaveControl UI and wire it into App"
```

---

### Task 6: Breakpoint-aware keyboard width

**Files:**
- Modify: `src/hooks/useKeyboardWidth.ts`

**Interfaces:**
- Produces: same public shape (`useKeyboardWidth(whiteKeyCount: number): { containerRef, whiteKeyWidth }`); internal sizing logic changes.

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/hooks/useKeyboardWidth.ts` with:

```ts
import { useEffect, useRef, useState } from 'react';

import type { RefObject } from 'react';

/** Minimum white key width in pixels on phone-width viewports — keeps tap targets usable. */
const MIN_WHITE_KEY_WIDTH_PHONE = 40;

/** Minimum white key width in pixels above the phone breakpoint — small but still clickable. */
const MIN_WHITE_KEY_WIDTH_FIT = 1;

/** Maximum white key width in pixels — avoids absurdly large keys on wide monitors. */
const MAX_WHITE_KEY_WIDTH = 68;

/** Container width, in pixels, below which the keyboard keeps a tap-friendly minimum and scrolls instead of shrinking further. */
const PHONE_BREAKPOINT = 640;

/** Horizontal padding (both sides) of the keyboard surface, in pixels. */
const SURFACE_PADDING = 32;

/** Return value from {@link useKeyboardWidth}. */
export interface UseKeyboardWidthResult {
  containerRef: RefObject<HTMLDivElement | null>;
  whiteKeyWidth: number;
}

/**
 * Measures the keyboard's scroll container and computes a white key width that
 * fills as much of the available space as possible. Below the phone breakpoint,
 * width is clamped to a tap-friendly minimum and the keyboard scrolls; at or
 * above it, the floor is dropped so the full keyboard always fits without scrolling.
 * @param whiteKeyCount - Number of white keys currently rendered.
 * @returns A ref to attach to the scroll container, and the computed key width.
 */
export function useKeyboardWidth(whiteKeyCount: number): UseKeyboardWidthResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [whiteKeyWidth, setWhiteKeyWidth] = useState(MIN_WHITE_KEY_WIDTH_PHONE);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateWidth = (containerWidth: number): void => {
      const available = containerWidth - SURFACE_PADDING;
      const minWidth =
        containerWidth < PHONE_BREAKPOINT ? MIN_WHITE_KEY_WIDTH_PHONE : MIN_WHITE_KEY_WIDTH_FIT;
      const next = Math.min(
        MAX_WHITE_KEY_WIDTH,
        Math.max(minWidth, Math.floor(available / whiteKeyCount)),
      );
      setWhiteKeyWidth(next);
    };

    updateWidth(container.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        updateWidth(entry.contentRect.width);
      }
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [whiteKeyCount]);

  return { containerRef, whiteKeyWidth };
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run build && npm run lint`
Expected: both PASS (this hook's public signature is unchanged, so nothing else needs updating).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useKeyboardWidth.ts
git commit -m "feat: drop key-width floor above phone breakpoint so keyboard fits without scrolling"
```

---

### Task 7: `PianoKey` hides labels when too narrow

**Files:**
- Modify: `src/components/PianoKey.tsx`

**Interfaces:**
- Produces: `PianoKeyProps` gains a required `showLabels: boolean` field.

- [ ] **Step 1: Add the prop**

In `src/components/PianoKey.tsx`, replace:

```ts
export interface PianoKeyProps {
  note: NoteName;
  isBlack: boolean;
  keyboardKey?: string;
  visualState: KeyVisualState;
  onPointerDown: (note: NoteName) => void;
  onPointerUp: (note: NoteName) => void;
  onPointerLeave: (note: NoteName) => void;
}
```

with:

```ts
export interface PianoKeyProps {
  note: NoteName;
  isBlack: boolean;
  keyboardKey?: string;
  showLabels: boolean;
  visualState: KeyVisualState;
  onPointerDown: (note: NoteName) => void;
  onPointerUp: (note: NoteName) => void;
  onPointerLeave: (note: NoteName) => void;
}
```

- [ ] **Step 2: Destructure it and gate the label spans**

Replace:

```ts
export function PianoKey({
  note,
  isBlack,
  keyboardKey,
  visualState,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
}: PianoKeyProps) {
```

with:

```ts
export function PianoKey({
  note,
  isBlack,
  keyboardKey,
  showLabels,
  visualState,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
}: PianoKeyProps) {
```

Replace the two label `<span>` blocks (note name, then keyboard-key badge):

```tsx
      <span
        className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${
          isBlack ? 'text-key-black-label' : 'text-key-white-label'
        } ${isHighlighted ? 'text-amber-600 light:text-amber-700' : ''}`}
      >
        {note}
      </span>
      {keyboardKey ? (
        <span
          className={`rounded px-1 py-0.5 text-[10px] font-medium ${
            isBlack
              ? 'bg-key-black-badge-bg text-key-black-badge-text'
              : 'bg-key-white-badge-bg text-key-white-badge-text'
          } ${isHighlighted ? 'bg-amber-400/30 text-amber-200 light:bg-amber-400/40 light:text-amber-800' : ''}`}
        >
          {keyboardKey}
        </span>
      ) : null}
```

with:

```tsx
      {showLabels ? (
        <span
          className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${
            isBlack ? 'text-key-black-label' : 'text-key-white-label'
          } ${isHighlighted ? 'text-amber-600 light:text-amber-700' : ''}`}
        >
          {note}
        </span>
      ) : null}
      {showLabels && keyboardKey ? (
        <span
          className={`rounded px-1 py-0.5 text-[10px] font-medium ${
            isBlack
              ? 'bg-key-black-badge-bg text-key-black-badge-text'
              : 'bg-key-white-badge-bg text-key-white-badge-text'
          } ${isHighlighted ? 'bg-amber-400/30 text-amber-200 light:bg-amber-400/40 light:text-amber-800' : ''}`}
        >
          {keyboardKey}
        </span>
      ) : null}
```

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: FAILS — `src/components/Keyboard.tsx` doesn't pass `showLabels` yet (Task 8 fixes this). Confirm the only error is the missing `showLabels` prop at the two `<PianoKey ... />` call sites in `Keyboard.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/PianoKey.tsx
git commit -m "feat: let PianoKey hide labels when too narrow to render legibly"
```

---

### Task 8: `Keyboard` computes and passes `showLabels`

**Files:**
- Modify: `src/components/Keyboard.tsx`

**Interfaces:**
- Consumes: `PianoKeyProps.showLabels` (Task 7).

- [ ] **Step 1: Add the threshold constant and computed flag**

In `src/components/Keyboard.tsx`, add this constant near the top of the file (after the existing `BLACK_KEY_BOUNDARY_OFFSET` constant):

```ts
/** White-key width, in pixels, below which note/shortcut labels are hidden for legibility. */
const LABEL_MIN_WIDTH = 36;
```

- [ ] **Step 2: Compute `showLabels` and pass it to both `PianoKey` usages**

Replace:

```ts
  const whiteKeysBeforeByNote = countWhiteKeysBefore(keys);
  const { containerRef, whiteKeyWidth } = useKeyboardWidth(whiteKeys.length);
```

with:

```ts
  const whiteKeysBeforeByNote = countWhiteKeysBefore(keys);
  const { containerRef, whiteKeyWidth } = useKeyboardWidth(whiteKeys.length);
  const showLabels = whiteKeyWidth >= LABEL_MIN_WIDTH;
```

Then add `showLabels={showLabels}` as a prop on both `<PianoKey ... />` elements (the white-key one inside `whiteKeys.map`, and the black-key one inside `blackKeys.map`) — for example the white-key one becomes:

```tsx
            <PianoKey
              key={key.note}
              note={key.note}
              isBlack={false}
              keyboardKey={key.keyboardKey}
              showLabels={showLabels}
              visualState={getKeyVisualState(
                key.note,
                pressedNotes,
                highlightedNote,
              )}
              onPointerDown={handlers.onKeyDown}
              onPointerUp={handlers.onKeyUp}
              onPointerLeave={handlers.onKeyUp}
            />
```

and the black-key one becomes:

```tsx
                <PianoKey
                  note={key.note}
                  isBlack
                  keyboardKey={key.keyboardKey}
                  showLabels={showLabels}
                  visualState={getKeyVisualState(
                    key.note,
                    pressedNotes,
                    highlightedNote,
                  )}
                  onPointerDown={handlers.onKeyDown}
                  onPointerUp={handlers.onKeyUp}
                  onPointerLeave={handlers.onKeyUp}
                />
```

- [ ] **Step 3: Type-check and lint**

Run: `npm run build && npm run lint`
Expected: both PASS.

- [ ] **Step 4: Manual check at multiple widths**

Run: `npm run dev`. Using the Playwright MCP browser tools (`browser_navigate` to the local URL, then `browser_resize`), check three widths:
- 1600×900: keyboard should render all 85 keys with no horizontal scrollbar, and every key shows its note-name label (some without shortcut badges, since only 25 keys have one).
- 800×900: still no scrollbar; at this width keys are narrow enough that labels should be hidden (verify by taking a screenshot via `browser_take_screenshot` and confirming no text is rendered on the keys).
- 390×844 (iPhone-class): a horizontal scrollbar should be present under the keyboard, and keys that are visible should show labels (since the phone floor keeps them at 40px).

Stop the dev server after checking.

- [ ] **Step 5: Commit**

```bash
git add src/components/Keyboard.tsx
git commit -m "feat: hide key labels below a width threshold"
```

---

### Task 9: Types for play-along mode and multi-note highlighting

**Files:**
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: new `SongPlaybackMode = 'follow' | 'play'` type; `KeyVisualState` gains `'auto-playing'`; `SongPlaybackState.highlightedNote: NoteName | null` becomes `highlightedNotes: NoteName[]`, and the interface gains `mode: SongPlaybackMode`.

- [ ] **Step 1: Update `KeyVisualState`**

Replace:

```ts
/** Visual state applied to a piano key. */
export type KeyVisualState = 'idle' | 'pressed' | 'highlighted';
```

with:

```ts
/** Visual state applied to a piano key. */
export type KeyVisualState = 'idle' | 'pressed' | 'highlighted' | 'auto-playing';
```

- [ ] **Step 2: Replace `SongPlaybackState` and add `SongPlaybackMode`**

Replace:

```ts
/** Follow-along playback state exposed to the UI. */
export interface SongPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentNoteIndex: number;
  highlightedNote: NoteName | null;
  progress: number;
}
```

with:

```ts
/** Song playback mode: wait for the correct key, or auto-play the song itself. */
export type SongPlaybackMode = 'follow' | 'play';

/** Playback state exposed to the UI, shared by follow-along and play-along modes. */
export interface SongPlaybackState {
  mode: SongPlaybackMode;
  isPlaying: boolean;
  isPaused: boolean;
  currentNoteIndex: number;
  highlightedNotes: NoteName[];
  progress: number;
}
```

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: FAILS — `src/songs/player.ts`, `src/hooks/useSong.ts`, `src/hooks/usePiano.ts`, and `src/components/Keyboard.tsx` all still reference the old `highlightedNote` field and the old `SongPlayer` constructor shape. This is expected; Tasks 10–12 fix them. Confirm no errors come from `types/index.ts` itself.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add SongPlaybackMode and generalize highlight state to a set"
```

---

### Task 10: `SongPlayer` gains a real mode toggle

**Files:**
- Modify: `src/songs/player.ts` (full rewrite)

**Interfaces:**
- Consumes: `SongPlaybackMode`, updated `SongPlaybackState` (Task 9).
- Produces: `SongPlayerCallbacks` gains `onAutoNoteStart?: (note: NoteName) => void` and `onAutoNoteEnd?: (note: NoteName) => void`; drops `onHighlight` and `onProgress` (confirmed unused anywhere outside this file). `SongPlayerOptions` drops `waitForCorrectKey`. The class gains `setMode(mode: SongPlaybackMode): void` (replacing `setWaitForCorrectKey`, which is removed — also confirmed unused). The constructor now **only** takes `SongPlayerOptions` — the old two-branch constructor that special-cased a `ParsedSong` first argument is removed. Callers must now do `new SongPlayer(options)` followed by `.load(parsedSong)` (the `load` method already existed and is unchanged in shape).

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/songs/player.ts` with:

```ts
import * as Tone from 'tone';

import type { Dispatch, SetStateAction } from 'react';

import type {
  NoteName,
  ParsedNote,
  ParsedSong,
  SongPlaybackMode,
  SongPlaybackState,
} from '../types/index.ts';

/** Callbacks invoked during playback. */
export interface SongPlayerCallbacks {
  /** Fired when play-along mode starts sounding a note automatically. */
  onAutoNoteStart?: (note: NoteName) => void;
  /** Fired when play-along mode releases an automatically-sounded note. */
  onAutoNoteEnd?: (note: NoteName) => void;
  /** Fired in follow-along mode when the user successfully presses an expected note. */
  onNotePlayed?: (note: NoteName) => void;
  /** Fired when the song finishes playing. */
  onComplete?: () => void;
}

/** Options for configuring a song player instance. */
export interface SongPlayerOptions {
  callbacks?: SongPlayerCallbacks;
  /** Optional React state setter for playback UI integration. */
  onStateChange?: Dispatch<SetStateAction<SongPlaybackState>>;
}

const INITIAL_PLAYBACK_STATE: SongPlaybackState = {
  mode: 'follow',
  isPlaying: false,
  isPaused: false,
  currentNoteIndex: 0,
  highlightedNotes: [],
  progress: 0,
};

/**
 * Song player that highlights notes in time with a parsed MIDI song.
 * In follow-along mode it pauses the Transport and waits for the user to press
 * each expected note. In play-along mode it auto-triggers and releases the
 * sampler itself, on schedule, without pausing.
 */
export class SongPlayer {
  private parsedSong: ParsedSong | null = null;
  private callbacks: SongPlayerCallbacks;
  private onStateChange: Dispatch<SetStateAction<SongPlaybackState>> | null;
  private mode: SongPlaybackMode = 'follow';
  private currentIndex = 0;
  private isPlaying = false;
  private isPaused = false;
  private waitingForNotes = new Set<NoteName>();
  private activeNoteCounts = new Map<NoteName, number>();
  private scheduledEventIds: number[] = [];

  /**
   * Creates a song player with optional callbacks and state-change subscriber.
   * @param options - Callbacks and React state setter for playback UI.
   */
  constructor(options: SongPlayerOptions = {}) {
    this.callbacks = options.callbacks ?? {};
    this.onStateChange = options.onStateChange ?? null;
  }

  /**
   * Sets the playback mode. Only takes effect while playback is stopped
   * (not playing and not paused) — callers should disable mode-switch UI
   * while active rather than rely solely on this guard.
   * @param mode - 'follow' to wait for keypresses, 'play' to auto-play.
   */
  setMode(mode: SongPlaybackMode): void {
    if (this.isPlaying || this.isPaused) {
      return;
    }

    this.mode = mode;
    this.syncState();
  }

  /**
   * Loads a parsed song, replacing any previously loaded song.
   * @param parsedSong - Parsed song ready for playback.
   */
  load(parsedSong: ParsedSong): void {
    this.stop();
    this.parsedSong = parsedSong;
    this.currentIndex = 0;
    this.emitProgress();
  }

  /**
   * Starts or resumes playback from the current position.
   */
  start(): void {
    if (!this.parsedSong || this.parsedSong.notes.length === 0) {
      return;
    }

    if (this.isPaused) {
      this.isPaused = false;
      this.isPlaying = true;
      this.syncState();

      if (this.mode === 'follow' && this.waitingForNotes.size > 0) {
        return;
      }

      Tone.getTransport().start();
      return;
    }

    this.isPlaying = true;
    this.isPaused = false;
    this.clearScheduledEvents();
    this.schedulePlayback();
    this.syncState();
    Tone.getTransport().start();
  }

  /**
   * Pauses playback while preserving the current position. Notes already
   * sounding in play-along mode ring out naturally; the Transport clock
   * itself halts, so not-yet-fired release events stay correctly queued.
   */
  pause(): void {
    if (!this.isPlaying) {
      return;
    }

    Tone.getTransport().pause();
    this.isPaused = true;
    this.isPlaying = false;
    this.syncState();
  }

  /**
   * Stops playback, clears scheduled events, force-releases any notes still
   * sounding from play-along mode, and resets position.
   */
  stop(): void {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    this.clearScheduledEvents();
    this.releaseAllActiveNotes();
    this.isPlaying = false;
    this.isPaused = false;
    this.waitingForNotes.clear();
    this.currentIndex = 0;
    this.emitProgress();
    this.syncState({
      progress: 0,
      currentNoteIndex: 0,
    });
  }

  /**
   * Resets playback to the beginning without starting.
   */
  reset(): void {
    this.stop();
  }

  /**
   * Tears down the player and releases Transport schedules.
   */
  destroy(): void {
    this.stop();
    this.parsedSong = null;
    this.onStateChange?.(INITIAL_PLAYBACK_STATE);
  }

  /**
   * Handles a user key press during follow-along mode. No-ops in play-along
   * mode, since playback isn't gated on user input there.
   * @param note - The note the user pressed.
   * @returns True if the pressed note matched an expected highlight.
   */
  handleKeyPress(note: NoteName): boolean {
    if (this.mode !== 'follow' || this.waitingForNotes.size === 0) {
      return false;
    }

    if (!this.waitingForNotes.has(note)) {
      return false;
    }

    this.waitingForNotes.delete(note);
    this.callbacks.onNotePlayed?.(note);

    if (this.waitingForNotes.size > 0) {
      this.syncState();
      return true;
    }

    this.currentIndex += 1;
    this.emitProgress();

    if (!this.parsedSong || this.currentIndex >= this.parsedSong.notes.length) {
      this.finishPlayback();
      return true;
    }

    if (this.isPlaying) {
      Tone.getTransport().start();
    }

    this.syncState();
    return true;
  }

  /**
   * Forwards a played note to wait-for-correct-key handling.
   * @param note - Scientific notation note name, e.g. "C4".
   */
  handleNoteInput(note: NoteName): void {
    this.handleKeyPress(note);
  }

  /**
   * Schedules note events on the Tone.js Transport. Every note gets a
   * start event; play-along mode additionally schedules a release event at
   * `note.time + note.duration`.
   */
  private schedulePlayback(): void {
    if (!this.parsedSong) {
      return;
    }

    Tone.getTransport().bpm.value = this.parsedSong.metadata.tempo;
    Tone.getTransport().seconds = 0;

    const notes = this.parsedSong.notes;

    for (let index = 0; index < notes.length; index += 1) {
      const note = notes[index];

      const startId = Tone.getTransport().schedule(() => {
        this.handleNoteReached(note, index);
      }, note.time);
      this.scheduledEventIds.push(startId);

      if (this.mode === 'play') {
        const endId = Tone.getTransport().schedule(() => {
          this.handleAutoNoteEnd(note.note);
        }, note.time + note.duration);
        this.scheduledEventIds.push(endId);
      }
    }

    const completeId = Tone.getTransport().schedule(() => {
      if (this.mode === 'play' || this.waitingForNotes.size === 0) {
        this.finishPlayback();
      }
    }, this.parsedSong.duration);

    this.scheduledEventIds.push(completeId);
  }

  /**
   * Called when Transport reaches a note's scheduled start time.
   * @param note - The note that was reached.
   * @param index - Index of the note in the song.
   */
  private handleNoteReached(note: ParsedNote, index: number): void {
    this.currentIndex = index;

    if (this.mode === 'play') {
      this.activeNoteCounts.set(note.note, (this.activeNoteCounts.get(note.note) ?? 0) + 1);
      this.callbacks.onAutoNoteStart?.(note.note);
      this.emitProgress();
      this.syncState();
      return;
    }

    this.waitingForNotes.add(note.note);
    this.emitProgress();
    Tone.getTransport().pause();
    this.syncState();
  }

  /**
   * Called when Transport reaches a play-along note's scheduled release time.
   * @param note - Scientific notation note name being released.
   */
  private handleAutoNoteEnd(note: NoteName): void {
    const count = this.activeNoteCounts.get(note) ?? 0;

    if (count <= 1) {
      this.activeNoteCounts.delete(note);
    } else {
      this.activeNoteCounts.set(note, count - 1);
    }

    this.callbacks.onAutoNoteEnd?.(note);
    this.syncState();
  }

  /**
   * Immediately releases every note still active from play-along mode.
   * Called on stop so nothing keeps sounding after playback ends.
   */
  private releaseAllActiveNotes(): void {
    for (const note of this.activeNoteCounts.keys()) {
      this.callbacks.onAutoNoteEnd?.(note);
    }
    this.activeNoteCounts.clear();
  }

  /**
   * Emits progress based on the current note index.
   */
  private emitProgress(): void {
    if (!this.parsedSong || this.parsedSong.notes.length === 0) {
      this.syncState({ progress: 0, currentNoteIndex: 0 });
      return;
    }

    const progress = Math.min(this.currentIndex / this.parsedSong.notes.length, 1);
    this.syncState({ progress, currentNoteIndex: this.currentIndex });
  }

  /**
   * Resolves the set of notes that should currently render as highlighted,
   * sourced from whichever bookkeeping structure the active mode uses.
   * @returns Highlighted note names for the active mode.
   */
  private currentHighlightedNotes(): NoteName[] {
    return this.mode === 'play' ? [...this.activeNoteCounts.keys()] : [...this.waitingForNotes];
  }

  /**
   * Pushes the current playback snapshot to React state when configured.
   * @param partial - Optional partial state overrides.
   */
  private syncState(partial: Partial<SongPlaybackState> = {}): void {
    if (!this.onStateChange) {
      return;
    }

    this.onStateChange((previous) => ({
      ...previous,
      mode: this.mode,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentNoteIndex: partial.currentNoteIndex ?? this.currentIndex,
      progress: partial.progress ?? previous.progress,
      highlightedNotes: this.currentHighlightedNotes(),
    }));
  }

  /**
   * Clears all Transport schedule event ids tracked by this player.
   */
  private clearScheduledEvents(): void {
    for (const eventId of this.scheduledEventIds) {
      Tone.getTransport().clear(eventId);
    }
    this.scheduledEventIds = [];
  }

  /**
   * Ends playback and fires the completion callback.
   */
  private finishPlayback(): void {
    this.stop();
    this.currentIndex = this.parsedSong?.notes.length ?? 0;
    this.callbacks.onComplete?.();
    this.syncState({
      progress: 1,
      currentNoteIndex: this.currentIndex,
    });
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: FAILS — `src/hooks/useSong.ts` still constructs `SongPlayer` with the old `(parsedSong, setPlaybackState)` two-argument form. This is expected; fixed in Task 11. Confirm the only error is in `useSong.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/songs/player.ts
git commit -m "feat: add a real follow/play mode toggle to SongPlayer"
```

---

### Task 11: `useSong` wires audio callbacks and exposes mode

**Files:**
- Modify: `src/hooks/useSong.ts`

**Interfaces:**
- Consumes: new `SongPlayer({ onStateChange, callbacks })` + `.load()` + `.setMode()` (Task 10).
- Produces: `useSong` now takes a required argument `{ onAutoNoteStart: (note: NoteName) => void; onAutoNoteEnd: (note: NoteName) => void }`; `UseSongResult` gains `mode: SongPlaybackMode` and `setMode: (mode: SongPlaybackMode) => void`.

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/hooks/useSong.ts` with:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

import { SONGS } from '../songs/index';
import { loadSong } from '../songs/parser';
import { SongPlayer } from '../songs/player';
import type {
  NoteName,
  ParsedSong,
  SongMetadata,
  SongPlaybackMode,
  SongPlaybackState,
} from '../types';

const INITIAL_PLAYBACK_STATE: SongPlaybackState = {
  mode: 'follow',
  isPlaying: false,
  isPaused: false,
  currentNoteIndex: 0,
  highlightedNotes: [],
  progress: 0,
};

/** Callbacks the song player uses to drive real audio during play-along mode. */
export interface UseSongOptions {
  onAutoNoteStart: (note: NoteName) => void;
  onAutoNoteEnd: (note: NoteName) => void;
}

/** Song catalogue, selection, mode, and playback controls. */
export interface UseSongResult {
  songs: SongMetadata[];
  selectedSong: ParsedSong | null;
  selectSong: (id: string) => void;
  playbackState: SongPlaybackState;
  mode: SongPlaybackMode;
  setMode: (mode: SongPlaybackMode) => void;
  startPlayback: () => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  handleNoteInput: (note: NoteName) => void;
  songLoadError: string | null;
}

/**
 * Manages song selection, MIDI loading, mode, and playback state.
 * @param options - Callbacks wired to the audio engine for play-along mode.
 * @returns Song list, active song, mode, playback controls, and note-input handler.
 */
export const useSong = ({ onAutoNoteStart, onAutoNoteEnd }: UseSongOptions): UseSongResult => {
  const [selectedSong, setSelectedSong] = useState<ParsedSong | null>(null);
  const [playbackState, setPlaybackState] = useState<SongPlaybackState>(
    INITIAL_PLAYBACK_STATE,
  );
  const [songLoadError, setSongLoadError] = useState<string | null>(null);
  const playerRef = useRef<SongPlayer | null>(null);
  const activeSelectionRef = useRef<string | null>(null);
  const modeRef = useRef<SongPlaybackMode>('follow');

  /**
   * Disposes the active song player instance.
   */
  const destroyPlayer = useCallback((): void => {
    playerRef.current?.destroy();
    playerRef.current = null;
  }, []);

  /**
   * Loads a song by id and prepares a player in the current mode.
   * @param id - Song metadata id from the catalogue.
   */
  const selectSong = useCallback(
    (id: string): void => {
      const metadata = SONGS.find((song) => song.id === id);
      if (!metadata) {
        console.error(`Song not found: ${id}`);
        return;
      }

      activeSelectionRef.current = id;
      destroyPlayer();
      setSelectedSong(null);
      setPlaybackState({ ...INITIAL_PLAYBACK_STATE, mode: modeRef.current });
      setSongLoadError(null);

      void loadSong(metadata)
        .then((parsedSong) => {
          if (activeSelectionRef.current !== id) {
            return;
          }

          setSelectedSong(parsedSong);
          const player = new SongPlayer({
            onStateChange: setPlaybackState,
            callbacks: { onAutoNoteStart, onAutoNoteEnd },
          });
          player.load(parsedSong);
          player.setMode(modeRef.current);
          playerRef.current = player;
        })
        .catch((error: unknown) => {
          if (activeSelectionRef.current !== id) {
            return;
          }

          activeSelectionRef.current = null;
          setSelectedSong(null);
          setPlaybackState({ ...INITIAL_PLAYBACK_STATE, mode: modeRef.current });
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          setSongLoadError(`Failed to load "${metadata.title}": ${message}`);
          console.error(`Failed to load song "${metadata.title}":`, error);
        });
    },
    [destroyPlayer, onAutoNoteStart, onAutoNoteEnd],
  );

  useEffect(() => {
    return () => {
      destroyPlayer();
    };
  }, [destroyPlayer]);

  /**
   * Switches playback mode. Ignored while playback is active — the UI should
   * disable mode controls in that state, and the underlying player also
   * guards against changing mode mid-playback.
   * @param mode - 'follow' to wait for keypresses, 'play' to auto-play.
   */
  const setMode = useCallback(
    (mode: SongPlaybackMode): void => {
      if (playbackState.isPlaying || playbackState.isPaused) {
        return;
      }

      modeRef.current = mode;
      playerRef.current?.setMode(mode);
      setPlaybackState((previous) => ({ ...previous, mode }));
    },
    [playbackState.isPlaying, playbackState.isPaused],
  );

  /**
   * Starts or resumes playback for the selected song.
   */
  const startPlayback = useCallback((): void => {
    try {
      playerRef.current?.start();
    } catch (error: unknown) {
      console.error('Failed to start song playback:', error);
    }
  }, []);

  /**
   * Pauses playback without resetting progress.
   */
  const pausePlayback = useCallback((): void => {
    try {
      playerRef.current?.pause();
    } catch (error: unknown) {
      console.error('Failed to pause song playback:', error);
    }
  }, []);

  /**
   * Stops playback and resets player position.
   */
  const stopPlayback = useCallback((): void => {
    try {
      playerRef.current?.reset();
    } catch (error: unknown) {
      console.error('Failed to stop song playback:', error);
    }
  }, []);

  /**
   * Forwards a played note to the active song player for follow-along mode.
   * @param note - Scientific notation note name, e.g. "C4".
   */
  const handleNoteInput = useCallback((note: NoteName): void => {
    try {
      playerRef.current?.handleNoteInput(note);
    } catch (error: unknown) {
      console.error(`Failed to handle song note input for ${note}:`, error);
    }
  }, []);

  return {
    songs: SONGS,
    selectedSong,
    selectSong,
    playbackState,
    mode: playbackState.mode,
    setMode,
    startPlayback,
    pausePlayback,
    stopPlayback,
    handleNoteInput,
    songLoadError,
  };
};
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: FAILS — `src/hooks/usePiano.ts` calls `useSong()` with no arguments, and still reads `playbackState.highlightedNote` (singular). `src/components/Keyboard.tsx` and `src/App.tsx` also still reference the old shape. This is expected; Task 12 fixes all of them together since they only compile as one consistent unit. Confirm no errors come from `useSong.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSong.ts
git commit -m "feat: wire play-along audio callbacks and mode into useSong"
```

---

### Task 12: Wire multi-note highlighting and mode through `usePiano`, `Keyboard`, `PianoKey`, and `App`

This task touches four files together because they only type-check as one consistent unit — `usePiano` changes the shape it hands to `Keyboard`, and `Keyboard`/`PianoKey` change what they accept.

**Files:**
- Modify: `src/hooks/usePiano.ts`
- Modify: `src/components/Keyboard.tsx`
- Modify: `src/components/PianoKey.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useSong({ onAutoNoteStart, onAutoNoteEnd })` (Task 11), `SongPlaybackMode` / `highlightedNotes` (Task 9).
- Produces: `UsePianoResult` replaces `highlightedNote: NoteName | null` with `highlightedNotes: NoteName[]` and adds `mode: SongPlaybackMode`, `setMode: (mode: SongPlaybackMode) => void`. `KeyboardProps` replaces `highlightedNote` with `highlightedNotes: NoteName[]` and adds `mode: SongPlaybackMode`. `PianoKeyProps.visualState` can now be `'auto-playing'`.

- [ ] **Step 1: Update `usePiano.ts`**

In `src/hooks/usePiano.ts`, replace the `UsePianoResult` interface's `highlightedNote: NoteName | null;` line with:

```ts
  highlightedNotes: NoteName[];
  mode: SongPlaybackMode;
  setMode: (mode: SongPlaybackMode) => void;
```

Add `SongPlaybackMode` to the type import (the existing `import type { ... } from '../types';` block) so it reads:

```ts
import type {
  AudioEngineState,
  KeyboardInteractionHandlers,
  NoteName,
  PianoKeyDefinition,
  ParsedSong,
  SongMetadata,
  SongPlaybackMode,
  SongPlaybackState,
} from '../types';
```

Replace:

```ts
  const {
    songs,
    selectedSong,
    selectSong,
    playbackState,
    startPlayback,
    pausePlayback,
    stopPlayback,
    handleNoteInput,
    songLoadError,
  } = useSong();
```

with:

```ts
  const {
    songs,
    selectedSong,
    selectSong,
    playbackState,
    mode,
    setMode,
    startPlayback,
    pausePlayback,
    stopPlayback,
    handleNoteInput,
    songLoadError,
  } = useSong({ onAutoNoteStart: playNote, onAutoNoteEnd: releaseNote });
```

Replace the return statement's `highlightedNote: playbackState.highlightedNote,` line with:

```ts
    highlightedNotes: playbackState.highlightedNotes,
    mode,
    setMode,
```

- [ ] **Step 2: Update `Keyboard.tsx`**

In `src/components/Keyboard.tsx`, add `SongPlaybackMode` and `KeyVisualState` to the type import:

```ts
import type {
  KeyboardInteractionHandlers,
  KeyVisualState,
  NoteName,
  PianoKeyDefinition,
  SongPlaybackMode,
} from '../types';
```

Replace the `KeyboardProps` interface:

```ts
export interface KeyboardProps {
  keys: PianoKeyDefinition[];
  pressedNotes: Set<NoteName>;
  highlightedNote: NoteName | null;
  handlers: KeyboardInteractionHandlers;
}
```

with:

```ts
export interface KeyboardProps {
  keys: PianoKeyDefinition[];
  pressedNotes: Set<NoteName>;
  highlightedNotes: NoteName[];
  mode: SongPlaybackMode;
  handlers: KeyboardInteractionHandlers;
}
```

Replace `getKeyVisualState`:

```ts
function getKeyVisualState(
  note: NoteName,
  pressedNotes: Set<NoteName>,
  highlightedNote: NoteName | null,
): 'idle' | 'pressed' | 'highlighted' {
  if (pressedNotes.has(note)) {
    return 'pressed';
  }
  if (highlightedNote === note) {
    return 'highlighted';
  }
  return 'idle';
}
```

with:

```ts
function getKeyVisualState(
  note: NoteName,
  pressedNotes: Set<NoteName>,
  highlightedNotes: NoteName[],
  mode: SongPlaybackMode,
): KeyVisualState {
  if (pressedNotes.has(note)) {
    return 'pressed';
  }
  if (highlightedNotes.includes(note)) {
    return mode === 'play' ? 'auto-playing' : 'highlighted';
  }
  return 'idle';
}
```

Update the `Keyboard` function signature:

```ts
export function Keyboard({
  keys,
  pressedNotes,
  highlightedNote,
  handlers,
}: KeyboardProps) {
```

becomes:

```ts
export function Keyboard({
  keys,
  pressedNotes,
  highlightedNotes,
  mode,
  handlers,
}: KeyboardProps) {
```

Update both `getKeyVisualState(...)` call sites (white-key and black-key) from:

```ts
              visualState={getKeyVisualState(
                key.note,
                pressedNotes,
                highlightedNote,
              )}
```

to:

```ts
              visualState={getKeyVisualState(
                key.note,
                pressedNotes,
                highlightedNotes,
                mode,
              )}
```

(and the matching black-key block, same replacement, just indented differently — both currently read `highlightedNote,` as the third argument).

- [ ] **Step 3: Update `PianoKey.tsx` with the new visual state**

In `src/components/PianoKey.tsx`, after the existing:

```ts
  const isPressed = visualState === 'pressed';
  const isHighlighted = visualState === 'highlighted';
```

add:

```ts
  const isAutoPlaying = visualState === 'auto-playing';
```

After the existing `highlightBlack` constant definition, add two new color constants:

```ts
  const autoPlayingWhite =
    'ring-2 ring-teal-400/90 shadow-[0_0_20px_rgba(45,212,191,0.45)] from-teal-400 to-teal-500 light:from-teal-100 light:to-teal-200';
  const autoPlayingBlack =
    'ring-2 ring-teal-400/90 shadow-[0_0_16px_rgba(45,212,191,0.5)] from-teal-500 to-teal-600';
```

Replace the state-selection chain:

```ts
  let stateClasses = isBlack ? idleBlack : idleWhite;
  if (isPressed) {
    stateClasses = isBlack ? pressedBlack : pressedWhite;
  } else if (isHighlighted) {
    stateClasses = isBlack ? highlightBlack : highlightWhite;
  }
```

with:

```ts
  let stateClasses = isBlack ? idleBlack : idleWhite;
  if (isPressed) {
    stateClasses = isBlack ? pressedBlack : pressedWhite;
  } else if (isHighlighted) {
    stateClasses = isBlack ? highlightBlack : highlightWhite;
  } else if (isAutoPlaying) {
    stateClasses = isBlack ? autoPlayingBlack : autoPlayingWhite;
  }
```

Update the note-name label's conditional classes from:

```tsx
            isBlack ? 'text-key-black-label' : 'text-key-white-label'
          } ${isHighlighted ? 'text-amber-600 light:text-amber-700' : ''}`}
```

to:

```tsx
            isBlack ? 'text-key-black-label' : 'text-key-white-label'
          } ${isHighlighted ? 'text-amber-600 light:text-amber-700' : ''} ${isAutoPlaying ? 'text-teal-600 light:text-teal-700' : ''}`}
```

Update the keyboard-key badge's conditional classes from:

```tsx
          } ${isHighlighted ? 'bg-amber-400/30 text-amber-200 light:bg-amber-400/40 light:text-amber-800' : ''}`}
```

to:

```tsx
          } ${isHighlighted ? 'bg-amber-400/30 text-amber-200 light:bg-amber-400/40 light:text-amber-800' : ''} ${isAutoPlaying ? 'bg-teal-400/30 text-teal-200 light:bg-teal-400/40 light:text-teal-800' : ''}`}
```

- [ ] **Step 4: Update `App.tsx`**

In `src/App.tsx`, replace:

```ts
  const {
    pressedNotes,
    highlightedNote,
    keyboardLayout,
    handlers,
    songs,
    selectedSong,
    selectSong,
    playbackState,
    startPlayback,
    pausePlayback,
    stopPlayback,
    audioState,
    ensureAudioReady,
    songLoadError,
    baseOctave,
    canShiftOctaveDown,
    canShiftOctaveUp,
    shiftOctaveDown,
    shiftOctaveUp,
  } = usePiano();
```

with:

```ts
  const {
    pressedNotes,
    highlightedNotes,
    keyboardLayout,
    handlers,
    songs,
    selectedSong,
    selectSong,
    playbackState,
    mode,
    setMode,
    startPlayback,
    pausePlayback,
    stopPlayback,
    audioState,
    ensureAudioReady,
    songLoadError,
    baseOctave,
    canShiftOctaveDown,
    canShiftOctaveUp,
    shiftOctaveDown,
    shiftOctaveUp,
  } = usePiano();
```

Replace the `<Keyboard ... />` element:

```tsx
      <Keyboard
        keys={keyboardLayout}
        pressedNotes={pressedNotes}
        highlightedNote={highlightedNote}
        handlers={handlers}
      />
```

with:

```tsx
      <Keyboard
        keys={keyboardLayout}
        pressedNotes={pressedNotes}
        highlightedNotes={highlightedNotes}
        mode={mode}
        handlers={handlers}
      />
```

(`mode` and `setMode` aren't used by `PlaybackControls` yet at this point — that's Task 13. Leave the existing `<PlaybackControls ... />` element exactly as-is for now.)

- [ ] **Step 5: Type-check and lint**

Run: `npm run build && npm run lint`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/usePiano.ts src/components/Keyboard.tsx src/components/PianoKey.tsx src/App.tsx
git commit -m "feat: support multi-note highlighting and a distinct play-along key color"
```

---

### Task 13: Mode toggle in `PlaybackControls`, and `App.tsx` final wiring

**Files:**
- Modify: `src/components/PlaybackControls.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `mode`, `setMode` from `usePiano()` (Task 12).
- Produces: `PlaybackControlsProps` gains `mode: SongPlaybackMode` and `onModeChange: (mode: SongPlaybackMode) => void`.

- [ ] **Step 1: Update `PlaybackControls.tsx`**

Replace the entire contents of `src/components/PlaybackControls.tsx` with:

```tsx
import { motion } from 'framer-motion';

import type { SongPlaybackMode } from '../types';

/** Props for follow-along/play-along playback controls. */
export interface PlaybackControlsProps {
  mode: SongPlaybackMode;
  onModeChange: (mode: SongPlaybackMode) => void;
  isPlaying: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  songTitle: string | null;
  progress: number;
}

/**
 * Mode toggle plus play, pause, and stop controls for song playback.
 * @param props - Playback state, mode, and control callbacks.
 * @returns Transport control bar.
 */
export function PlaybackControls({
  mode,
  onModeChange,
  isPlaying,
  isPaused,
  onPlay,
  onPause,
  onStop,
  songTitle,
  progress,
}: PlaybackControlsProps) {
  if (!songTitle) {
    return null;
  }

  const modeLocked = isPlaying || isPaused;

  return (
    <section
      aria-label="Playback controls"
      className="w-full max-w-2xl rounded-xl border border-piano-border bg-piano-surface/60 p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="truncate text-sm font-medium text-piano-text">{songTitle}</p>
        <span className="text-xs text-piano-text-subtle">{Math.round(progress * 100)}%</span>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-piano-bg p-1">
        <button
          type="button"
          onClick={() => onModeChange('follow')}
          disabled={modeLocked}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
            mode === 'follow'
              ? 'bg-piano-accent text-white'
              : 'text-piano-text-muted hover:bg-piano-surface'
          }`}
        >
          Follow-Along
        </button>
        <button
          type="button"
          onClick={() => onModeChange('play')}
          disabled={modeLocked}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
            mode === 'play'
              ? 'bg-piano-accent text-white'
              : 'text-piano-text-muted hover:bg-piano-surface'
          }`}
        >
          Play-Along
        </button>
      </div>

      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-piano-progress-track">
        <motion.div
          className="h-full w-full origin-left rounded-full bg-gradient-to-r from-piano-accent to-violet-400"
          animate={{ scaleX: progress }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      <div className="flex gap-2">
        {!isPlaying || isPaused ? (
          <button
            type="button"
            onClick={onPlay}
            className="rounded-lg bg-piano-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {isPaused ? 'Resume' : 'Play'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onPause}
            className="rounded-lg bg-piano-surface px-4 py-2 text-sm font-medium text-piano-text ring-1 ring-piano-border transition hover:bg-piano-bg"
          >
            Pause
          </button>
        )}
        <button
          type="button"
          onClick={onStop}
          className="rounded-lg border border-piano-border px-4 py-2 text-sm font-medium text-piano-text-muted transition hover:bg-piano-surface"
        >
          Stop
        </button>
      </div>

      <p className="mt-3 text-xs text-piano-text-subtle">
        {mode === 'play'
          ? 'Play-along mode plays the song automatically — press keys anytime to join in.'
          : 'Follow-along mode waits for you to press each highlighted key before continuing.'}
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Wire it into `App.tsx`**

In `src/App.tsx`, add a `handlePlay` wrapper so play-along's auto-triggered audio has the engine ready before the Transport starts (mirroring the existing `handleSelectSong` pattern). Add this after the existing `handleSelectSong` callback:

```ts
  const handlePlay = useCallback((): void => {
    void ensureAudioReady().then(() => {
      startPlayback();
    });
  }, [ensureAudioReady, startPlayback]);
```

Replace the `<PlaybackControls ... />` element:

```tsx
      <PlaybackControls
        isPlaying={playbackState.isPlaying}
        isPaused={playbackState.isPaused}
        onPlay={startPlayback}
        onPause={pausePlayback}
        onStop={stopPlayback}
        songTitle={selectedSong?.metadata.title ?? null}
        progress={playbackState.progress}
      />
```

with:

```tsx
      <PlaybackControls
        mode={mode}
        onModeChange={setMode}
        isPlaying={playbackState.isPlaying}
        isPaused={playbackState.isPaused}
        onPlay={handlePlay}
        onPause={pausePlayback}
        onStop={stopPlayback}
        songTitle={selectedSong?.metadata.title ?? null}
        progress={playbackState.progress}
      />
```

- [ ] **Step 3: Type-check and lint**

Run: `npm run build && npm run lint`
Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/PlaybackControls.tsx src/App.tsx
git commit -m "feat: add follow-along/play-along mode toggle to playback controls"
```

---

### Task 14: Full manual verification

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (note the local URL it prints, typically `http://localhost:5173/`).

- [ ] **Step 2: Verify octave shift end-to-end**

Using the Playwright MCP browser tools: `browser_navigate` to the local URL, click "Tap to Start" to dismiss the audio-unlock overlay, then take a `browser_snapshot`. Confirm the "Keys: C4–C6" `OctaveControl` is present. Click its ↑ button twice; re-snapshot and confirm the label now reads "Keys: C6–C8" and the ↑ button is disabled. Click ↓ four times; confirm it reaches "Keys: C1–C3" with ↓ disabled.

- [ ] **Step 3: Verify play-along mode plays real audio and highlights in sync**

Still in the browser: click the song selector's "La Campanella" card, then in the playback panel click "Play-Along" (the toggle should be selectable since playback is stopped), then click "Play". Use `browser_run_code_unsafe` to poll the DOM for elements whose class contains `teal` (the new auto-playing highlight color), e.g.:

```js
async (page) => {
  await page.waitForTimeout(500);
  const handles = await page.$$('button[aria-label^="Piano key"]');
  const highlighted = [];
  for (const h of handles) {
    const cls = await h.getAttribute('class');
    if (cls && cls.includes('teal')) {
      highlighted.push(await h.getAttribute('aria-label'));
    }
  }
  return highlighted;
}
```

Expected: returns at least one `"Piano key D#5..."`-style label (teal-highlighted), confirming play-along is auto-advancing and highlighting without any clicks. Click "Stop" and confirm (via the same script, expecting an empty array) that no key stays stuck highlighted/sounding.

- [ ] **Step 4: Verify mode toggle disables while active, and follow-along still works**

With La Campanella still selected, switch the toggle to "Follow-Along", click "Play", and confirm via `browser_snapshot` that both the "Follow-Along" and "Play-Along" toggle buttons are now disabled (`disabled` attribute present) while playing. Click "Stop", confirm the toggle buttons become enabled again.

- [ ] **Step 5: Verify keyboard fit at multiple widths**

Using `browser_resize`, check 1600×900 and 800×900: take a `browser_take_screenshot` at each and confirm there is no horizontal scrollbar under the keyboard (the keyboard's container should be narrower than or equal to the viewport). Then resize to 390×844 and confirm a horizontal scrollbar/overflow is present (the container's scrollWidth exceeds its clientWidth) — check via `browser_run_code_unsafe`:

```js
async (page) => {
  const el = await page.$('div.overflow-x-auto');
  return await el.evaluate((node) => ({
    scrollWidth: node.scrollWidth,
    clientWidth: node.clientWidth,
  }));
}
```

Expected: at 390px width, `scrollWidth > clientWidth`; at 1600px and 800px widths, `scrollWidth <= clientWidth + 1` (allow 1px rounding).

- [ ] **Step 6: Clean up**

Stop the dev server (kill the background process). Remove any screenshot files written to the repo root during this verification (`rm -f *.png` if any were saved there) and confirm with `git status --short` that no stray files remain before the final commit check.

- [ ] **Step 7: Final full build/lint pass**

Run: `npm run build && npm run lint`
Expected: both PASS — this is the final gate confirming all 13 prior tasks compose correctly.
