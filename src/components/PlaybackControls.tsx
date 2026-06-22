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
