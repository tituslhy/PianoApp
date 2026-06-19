import type { SongMetadata } from '../types';

/** Props for the song selection panel. */
export interface SongSelectorProps {
  songs: SongMetadata[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const DIFFICULTY_STYLES: Record<SongMetadata['difficulty'], string> = {
  easy: 'bg-badge-easy-bg text-badge-easy-text ring-badge-easy-ring',
  medium: 'bg-badge-medium-bg text-badge-medium-text ring-badge-medium-ring',
  hard: 'bg-badge-hard-bg text-badge-hard-text ring-badge-hard-ring',
};

/**
 * Renders selectable song cards with title, difficulty, and tempo.
 * @param props - Song catalogue, current selection, and select handler.
 * @returns Song picker UI.
 */
export function SongSelector({ songs, selectedId, onSelect }: SongSelectorProps) {
  return (
    <section aria-label="Song selection" className="w-full max-w-2xl">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-piano-text-muted">
        Follow-along songs
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {songs.map((song) => {
          const isSelected = selectedId === song.id;
          return (
            <button
              key={song.id}
              type="button"
              onClick={() => onSelect(song.id)}
              className={`rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-piano-accent/60 bg-piano-accent/10 shadow-lg shadow-piano-accent/10 ring-1 ring-piano-accent/40'
                  : 'border-piano-border bg-piano-surface/60 hover:border-piano-border-hover hover:bg-piano-surface'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-piano-text">{song.title}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${DIFFICULTY_STYLES[song.difficulty]}`}
                >
                  {song.difficulty}
                </span>
              </div>
              <p className="mt-1 text-xs text-piano-text-subtle">{song.tempo} BPM</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
