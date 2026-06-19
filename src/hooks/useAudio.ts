import { useCallback, useSyncExternalStore } from 'react';

import {
  getAudioState,
  initAudio,
  playNote as enginePlayNote,
  releaseNote as engineReleaseNote,
  subscribeAudioState,
} from '../audio/engine';
import type { AudioEngineState, NoteName } from '../types';

/** UI-facing audio controls and lifecycle state. */
export interface UseAudioResult {
  audioState: AudioEngineState;
  ensureAudioReady: () => Promise<void>;
  playNote: (note: NoteName) => void;
  releaseNote: (note: NoteName) => void;
}

/**
 * Subscribes to audio engine lifecycle state and exposes note playback helpers.
 * Sampler state lives in the engine module — only loading/ready/error is mirrored in React.
 * @returns Audio state and methods that require a prior user gesture via `ensureAudioReady`.
 */
export const useAudio = (): UseAudioResult => {
  const audioState = useSyncExternalStore(
    subscribeAudioState,
    getAudioState,
    getAudioState,
  );

  /**
   * Starts the audio engine on first user interaction (browser autoplay policy).
   * @returns Resolves when the sampler is ready to play notes.
   */
  const ensureAudioReady = useCallback(async (): Promise<void> => {
    try {
      await initAudio();
    } catch (error: unknown) {
      console.error('Failed to initialize audio engine:', error);
      throw error;
    }
  }, []);

  /**
   * Triggers note attack on the sampler.
   * @param note - Scientific notation note name, e.g. "C4".
   */
  const playNote = useCallback((note: NoteName): void => {
    try {
      enginePlayNote(note);
    } catch (error: unknown) {
      console.error(`Failed to play note ${note}:`, error);
    }
  }, []);

  /**
   * Triggers note release on the sampler.
   * @param note - Scientific notation note name, e.g. "C4".
   */
  const releaseNote = useCallback((note: NoteName): void => {
    try {
      engineReleaseNote(note);
    } catch (error: unknown) {
      console.error(`Failed to release note ${note}:`, error);
    }
  }, []);

  return {
    audioState,
    ensureAudioReady,
    playNote,
    releaseNote,
  };
};
