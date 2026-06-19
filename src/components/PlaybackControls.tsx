import { motion } from 'framer-motion';

/** Props for follow-along playback controls. */
export interface PlaybackControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  songTitle: string | null;
  progress: number;
}

/**
 * Play, pause, and stop controls for follow-along song mode.
 * @param props - Playback state and control callbacks.
 * @returns Transport control bar.
 */
export function PlaybackControls({
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

  return (
    <section
      aria-label="Playback controls"
      className="w-full max-w-2xl rounded-xl border border-piano-border bg-piano-surface/60 p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="truncate text-sm font-medium text-piano-text">{songTitle}</p>
        <span className="text-xs text-piano-text-subtle">{Math.round(progress * 100)}%</span>
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
        Follow-along mode waits for you to press each highlighted key before continuing.
      </p>
    </section>
  );
}
