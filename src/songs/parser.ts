import { Midi } from '@tonejs/midi';

import type { NoteName, ParsedNote, ParsedSong, SongMetadata } from '../types/index.ts';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/**
 * Converts a MIDI note number to scientific notation (e.g. 60 → "C4").
 * @param midi - Raw MIDI note number (0–127).
 * @returns Note name in scientific notation.
 */
export function midiToNoteName(midi: number): NoteName {
  const pitch = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${pitch}${octave}`;
}

/**
 * Extracts and sorts all notes from a parsed @tonejs/midi instance.
 * @param midi - Parsed MIDI file.
 * @returns Notes sorted by start time.
 */
function extractNotes(midi: Midi): ParsedNote[] {
  const notes: ParsedNote[] = [];

  for (const track of midi.tracks) {
    for (const note of track.notes) {
      notes.push({
        note: note.name as NoteName,
        time: note.time,
        duration: note.duration,
        velocity: note.velocity,
      });
    }
  }

  return notes.sort((a, b) => a.time - b.time);
}

/**
 * Fetches a MIDI file and parses it into a follow-along song structure.
 * @param metadata - Song metadata including the path to the MIDI file.
 * @returns Parsed song with notes sorted by time.
 */
export async function loadSong(metadata: SongMetadata): Promise<ParsedSong> {
  const response = await fetch(metadata.midiPath);

  if (!response.ok) {
    throw new Error(`Failed to load MIDI file: ${metadata.midiPath}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const midi = new Midi(arrayBuffer);
  const notes = extractNotes(midi);

  const lastNote = notes.at(-1);
  const duration = lastNote ? lastNote.time + lastNote.duration : 0;

  return {
    metadata,
    notes,
    duration,
  };
}
