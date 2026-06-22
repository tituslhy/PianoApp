# Octave-shift hotkeys, play-along mode, and responsive keyboard sizing

## Context

A prior change extended the on-screen keyboard from 2 octaves (C4–C6, 25 keys) to 7+ octaves (C1–C8, 85 keys) to support the new "La Campanella" song. That left two gaps:

1. Only the original 25 keys (C4–C6) have physical-keyboard shortcuts. The other 60 keys are mouse/touch-only.
2. The only playback mode is "follow-along," which pauses and waits for the user to press each correct key. There's no way to just watch/listen to a song play itself.

Additionally, the keyboard is now wide enough (85 keys) that it overflows every screen and always requires horizontal scrolling, even on desktop.

This spec covers three related changes: octave-shiftable hotkeys, a new "play-along" auto-play mode, and responsive keyboard sizing so the keyboard fits without scrolling except on phone-width screens.

## 1. Octave-shift hotkeys

### Problem

A standard keyboard has ~47 usable keys; 25 are already spoken for by the C4–C6 mapping. There aren't enough distinct keys to give the other 60 notes (C1–B3, C#6–C8) unique shortcuts.

### Design

The 25 existing physical keys keep their fixed **relative** chromatic offset (0–24 semitones) from a movable base octave, instead of being hardcoded to octave 4:

```
a=0  w=1  s=2  e=3  d=4  f=5  t=6  g=7  y=8  h=9  u=10 j=11
k=12 o=13 l=14 p=15 ;=16 '=17 [=18 \=19 ]=20 /=21 z=22 x=23 c=24
```

(This is the exact current C4–C6 mapping, just re-expressed as offsets instead of absolute notes.)

A `baseOctave` value (default 4, clamped to **1–6**) determines what the offsets resolve to: `note = PITCH_CLASSES[offset % 12] + (baseOctave + Math.floor(offset / 12))`. The clamp range exists because the 25-key span needs 2 octaves + 1 note of headroom: base octave 1 reaches up to C3, base octave 6 reaches up to C8 — covering the full keyboard in 6 discrete steps.

- **Arrow Up / Arrow Down** shift `baseOctave` by ±1. Repeated keydown events (`event.repeat`) are ignored, matching how note keys already behave. `preventDefault()` is called so the page doesn't scroll.
- A new `OctaveControl` UI element (near the keyboard) shows the current range as text (e.g. "Keys: C4–C6") and has clickable ↑/↓ buttons, since touch-only devices have no arrow keys. Buttons disable at the clamp limits.
- On-screen `keyboardKey` badges are derived from the current `baseOctave` and update live as it changes.

### Affected files

- `src/audio/keyMap.ts` — replace the static `KEY_TO_NOTE` export with fixed per-key offsets plus a `buildKeyToNote(baseOctave)` function; `getKeyboardLayout` takes `baseOctave` to compute current badges.
- New `src/hooks/useOctaveShift.ts` — owns `baseOctave` state, the arrow-key listener, and clamped increment/decrement helpers.
- `src/hooks/useKeyboard.ts` — takes the current key→note map as a parameter instead of importing the static one; keeps it in a ref so the window listener doesn't need to be re-attached on every change.
- `src/hooks/usePiano.ts` — wires `useOctaveShift` in, passes the derived key map to `useKeyboard` and the derived layout to `Keyboard`.
- New `src/components/OctaveControl.tsx`.

## 2. Play-along mode

### Problem

The only existing mode (`SongPlayer` in `src/songs/player.ts`) pauses on every note and waits for a correct keypress. There's no way to have the app play the song itself while the user just watches (or plays along freely on top).

### Design

`SongPlayer` already has a half-built, currently-unused second code path (a `waitForCorrectKey` flag and an alternate constructor branch that nothing calls). Rather than writing a separate class, this finishes that path into a real `mode: 'follow' | 'play'` toggle on the existing player, removing the dead constructor branch in the process.

- **Follow mode** (current behavior, unchanged): on reaching a note, pause the Transport, add the note(s) to a waiting set, and resume only once the user presses all of them.
- **Play mode** (new): on reaching a note, call an injected `onAutoNoteStart(note)` callback (triggers the sampler) and add it to the highlighted set; schedule a second Transport event at `note.time + note.duration` that calls `onAutoNoteEnd(note)` (releases the sampler) and removes it from the highlighted set. The Transport never pauses. A `Map<NoteName, number>` tracks active-count per pitch so overlapping/repeated notes of the same pitch don't un-highlight or cut audio prematurely.
- Mode can only change while playback is stopped (`isPlaying === false && isPaused === false`); the UI disables the toggle otherwise, and `setMode` is a no-op if called while active as a safety net.
- `stop()` additionally force-releases (via `onAutoNoteEnd`) any notes still in the active-count map, so nothing hangs when the user stops mid-note. `pause()` needs no special handling — the Transport clock itself halts, so already-triggered samples ring out naturally and not-yet-fired release events stay correctly queued for resume.
- Free play (clicking keys or using the physical-keyboard shortcuts) keeps working unchanged in both modes — `handleKeyPress` (the follow-mode-only gate) already no-ops when `mode !== 'follow'`.

`SongPlaybackState.highlightedNote: NoteName | null` becomes `highlightedNotes: NoteName[]`, used by both modes. This is a deliberate small behavior change: follow-along chords will now correctly highlight every note in the chord instead of just the first one.

`SongPlayer` stays decoupled from the audio engine module — it only knows about the `onAutoNoteStart`/`onAutoNoteEnd` callbacks, the same way it already only knows about `onHighlight`/`onNotePlayed`. `useSong` is the one that wires those callbacks to the real `playNote`/`releaseNote` from `useAudio`, since `usePiano` already composes both hooks.

### UI

- `PlaybackControls.tsx` gets a small Follow-Along/Play-Along segmented toggle, disabled while playing or paused. The caption line switches text depending on active mode.
- `Keyboard.tsx`/`PianoKey.tsx`: `KeyVisualState` gains a 4th value (`'auto-playing'`), rendered in a distinct color (teal/blue) from the existing amber `'highlighted'` state, since "this note is sounding now" and "press this note" mean different things. `Keyboard` resolves which of the two to use based on the active mode.
- Before starting play-along playback, the Play button handler calls `ensureAudioReady()` first (mirroring the existing pattern in `handleSelectSong`), since play mode triggers the sampler itself rather than waiting for a user gesture per note.

### Affected files

- `src/songs/player.ts` — mode toggle, dual scheduling paths, active-count tracking, stop-time cleanup.
- `src/types/index.ts` — `SongPlaybackState.highlightedNote` → `highlightedNotes`; `KeyVisualState` gains `'auto-playing'`.
- `src/hooks/useSong.ts` — wires `playNote`/`releaseNote` into the player's new callbacks; exposes `mode`/`setMode`.
- `src/hooks/usePiano.ts` — forwards `mode`/`setMode`/`highlightedNotes` to the UI.
- `src/components/PlaybackControls.tsx` — mode toggle UI, conditional caption.
- `src/components/Keyboard.tsx` / `src/components/PianoKey.tsx` — multi-note highlight set, new visual state/color.

## 3. Responsive keyboard sizing

### Problem

`useKeyboardWidth` computes a key width meant to fill the container, clamped between 40–68px. With 50 white keys, that floor alone (50 × 40px = 2000px) already overflows every common screen, forcing a horizontal scrollbar everywhere — not just on phones.

### Design

The keyboard's scroll-container width (already measured via `ResizeObserver`) is the breakpoint signal — no device sniffing.

- **Below 640px** container width (phone-width viewports): unchanged from today — 40–68px keys, clamped at a 40px floor, horizontal scroll available.
- **At or above 640px**: the 40px floor is dropped. `whiteKeyWidth = clamp(floor(availableWidth / whiteKeyCount), 1, 68)` — the full keyboard always fits with no scroll, and grows up to the existing 68px ceiling on very wide monitors.
- Once `whiteKeyWidth` drops below a 36px label threshold, `PianoKey` hides both the note-name text and the keyboard-shortcut badge (the key remains fully clickable/highlightable — just an unlabeled colored key, like a real piano). Labels reappear once there's room. The threshold is evaluated once on white-key width and applied uniformly to white and black keys, so rows don't show inconsistent labeling.

### Affected files

- `src/hooks/useKeyboardWidth.ts` — breakpoint-aware min-width logic.
- `src/components/PianoKey.tsx` — conditional label rendering based on a `showLabels` prop.
- `src/components/Keyboard.tsx` — computes and passes `showLabels` down.

## Testing

- `npm run build` and `npm run lint` must stay clean.
- Manual verification in a browser (as done for the prior La Campanella change): octave-shift via arrow keys and the on-screen control, play-along audio + highlight sync on a chord-heavy passage, mode-toggle disabling while active, and keyboard fit at a few representative viewport widths (phone, tablet, laptop, wide desktop).
- No automated test suite exists in this project today; this spec doesn't introduce one.
