import { useCallback, useMemo, useRef } from 'react';

import { getKeyboardLayout } from '../audio/keyMap';
import type {
  AudioEngineState,
  KeyboardInteractionHandlers,
  NoteName,
  PianoKeyDefinition,
  ParsedSong,
  SongMetadata,
  SongPlaybackState,
} from '../types';
import { useAudio } from './useAudio';
import { useKeyboard } from './useKeyboard';
import { useSong } from './useSong';

/** Combined piano interaction surface for the root app component. */
export interface UsePianoResult {
  pressedNotes: Set<NoteName>;
  highlightedNote: NoteName | null;
  keyboardLayout: PianoKeyDefinition[];
  handlers: KeyboardInteractionHandlers;
  songs: SongMetadata[];
  selectedSong: ParsedSong | null;
  selectSong: (id: string) => void;
  playbackState: SongPlaybackState;
  startPlayback: () => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  audioState: AudioEngineState;
  ensureAudioReady: () => Promise<void>;
  songLoadError: string | null;
}

/**
 * Orchestrates audio, keyboard, and song follow-along hooks into one app-level API.
 * @returns Everything `App.tsx` needs to render the piano and song player UI.
 */
export const usePiano = (): UsePianoResult => {
  const pendingDownRef = useRef(new Set<NoteName>());
  const { audioState, ensureAudioReady, playNote, releaseNote } = useAudio();
  const {
    songs,
    selectedSong,
    selectSong,
    playbackState,
    startPlayback,
    pausePlayback,
    stopPlayback,
    handleNoteInput,
    songLoadError,
  } = useSong();

  /**
   * Plays a note after ensuring the audio engine has started.
   * Skips attack if the key was released before samples finished loading.
   * @param note - Scientific notation note name, e.g. "C4".
   */
  const handleNoteDown = useCallback(
    (note: NoteName): void => {
      pendingDownRef.current.add(note);

      void ensureAudioReady()
        .then(() => {
          if (!pendingDownRef.current.has(note)) {
            return;
          }

          playNote(note);
          handleNoteInput(note);
        })
        .catch(() => {
          pendingDownRef.current.delete(note);
        });
    },
    [ensureAudioReady, playNote, handleNoteInput],
  );

  /**
   * Releases a held note on the sampler.
   * @param note - Scientific notation note name, e.g. "C4".
   */
  const handleNoteUp = useCallback(
    (note: NoteName): void => {
      pendingDownRef.current.delete(note);
      releaseNote(note);
    },
    [releaseNote],
  );

  const { pressedNotes, trackNoteDown, trackNoteUp } = useKeyboard({
    enabled: true,
    onNoteDown: handleNoteDown,
    onNoteUp: handleNoteUp,
  });

  const keyboardLayout = useMemo(() => getKeyboardLayout(), []);

  const handlers: KeyboardInteractionHandlers = useMemo(
    () => ({
      onKeyDown: (note: NoteName): void => {
        if (!trackNoteDown(note)) {
          return;
        }

        handleNoteDown(note);
      },
      onKeyUp: (note: NoteName): void => {
        if (!trackNoteUp(note)) {
          return;
        }

        handleNoteUp(note);
      },
    }),
    [trackNoteDown, trackNoteUp, handleNoteDown, handleNoteUp],
  );

  return {
    pressedNotes,
    highlightedNote: playbackState.highlightedNote,
    keyboardLayout,
    handlers,
    songs,
    selectedSong,
    selectSong,
    playbackState,
    startPlayback,
    pausePlayback,
    stopPlayback,
    audioState,
    ensureAudioReady,
    songLoadError,
  };
};
