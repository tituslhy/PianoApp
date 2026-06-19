import type { AudioEngineState } from '../types';

/** Props for the iOS-style audio unlock overlay. */
export interface AudioUnlockOverlayProps {
  audioState: AudioEngineState;
  onUnlock: () => void;
}

/**
 * Full-screen overlay requiring a tap before any audio loads. iOS Safari only unlocks
 * an AudioContext from within a real user gesture, so loading samples cannot start until
 * this button is tapped. Hides itself once the engine reaches the "ready" state.
 * @param props - Current audio engine state and the unlock handler to run on tap.
 * @returns The overlay, or null once audio is ready.
 */
export function AudioUnlockOverlay({ audioState, onUnlock }: AudioUnlockOverlayProps) {
  if (audioState === 'ready') {
    return null;
  }

  const isLoading = audioState === 'loading';
  const isError = audioState === 'error';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-piano-bg/95 px-6 text-center backdrop-blur-sm">
      <button
        type="button"
        onClick={onUnlock}
        disabled={isLoading}
        className="rounded-full bg-piano-accent px-8 py-4 text-lg font-semibold text-white shadow-lg transition active:scale-95 disabled:opacity-70"
      >
        {isLoading ? 'Loading piano samples…' : isError ? 'Tap to retry' : 'Tap to Start'}
      </button>
      {isError ? (
        <p className="max-w-xs text-sm text-rose-400 light:text-rose-600">
          Couldn't load the piano sounds. Check your connection and tap to try again.
        </p>
      ) : null}
    </div>
  );
}
