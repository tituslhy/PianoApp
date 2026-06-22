import type { SongMetadata } from '../types/index.ts';

/** Catalogue of follow-along songs available in the app. */
export const SONGS: SongMetadata[] = [
  {
    id: 'twinkle',
    title: 'Twinkle Twinkle Little Star',
    difficulty: 'easy',
    tempo: 120,
    midiPath: '/songs/twinkle.mid',
  },
  {
    id: 'fur-elise',
    title: 'Für Elise',
    difficulty: 'medium',
    tempo: 72,
    midiPath: '/songs/fur-elise.mid',
  },
  {
    id: 'la-campanella',
    title: 'La Campanella',
    difficulty: 'hard',
    tempo: 120,
    midiPath: '/songs/la-campanella.mid',
  },
];

/**
 * Finds song metadata by its unique id.
 * @param id - Song identifier (e.g. "twinkle").
 * @returns Matching metadata or undefined.
 */
export function getSongById(id: string): SongMetadata | undefined {
  return SONGS.find((song) => song.id === id);
}
