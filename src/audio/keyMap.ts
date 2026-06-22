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
