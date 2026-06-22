import type { NoteName, PianoKeyDefinition } from '../types/index.ts';

/** Keyboard key → note mapping (single source of truth). */
export const KEY_TO_NOTE: Record<string, NoteName> = {
  // Octave 4 — white keys
  a: 'C4',
  s: 'D4',
  d: 'E4',
  f: 'F4',
  g: 'G4',
  h: 'A4',
  j: 'B4',
  // Octave 4 — black keys
  w: 'C#4',
  e: 'D#4',
  t: 'F#4',
  y: 'G#4',
  u: 'A#4',
  // Octave 5 — white keys
  k: 'C5',
  l: 'D5',
  ';': 'E5',
  "'": 'F5',
  '\\': 'G5',
  z: 'A5',
  x: 'B5',
  // Octave 5 — black keys
  o: 'C#5',
  p: 'D#5',
  '[': 'F#5',
  ']': 'G#5',
  '/': 'A#5',
  // C6 (extends range by one note)
  c: 'C6',
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
 * Reverse lookup built from {@link KEYBOARD_TO_NOTE}.
 * Maps each note to its primary keyboard key.
 */
export const noteToKeyboardKey: Record<NoteName, string> = Object.fromEntries(
  Object.entries(KEY_TO_NOTE).map(([key, note]) => [note, key]),
) as Record<NoteName, string>;

/**
 * Returns a copy of the keyboard-to-note mapping.
 * @returns Record of keyboard key strings to scientific note names.
 */
export function getKeyMap(): Record<string, NoteName> {
  return { ...KEY_TO_NOTE };
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
 * Returns piano key definitions for every key from C4 through C6.
 * @returns Ordered array suitable for rendering the keyboard layout.
 */
export function getKeyboardLayout(): PianoKeyDefinition[] {
  return LAYOUT_NOTES.map((note) => ({
    note,
    isBlack: isBlackNote(note),
    keyboardKey: noteToKeyboardKey[note],
    octave: getOctaveFromNote(note),
  }));
}
