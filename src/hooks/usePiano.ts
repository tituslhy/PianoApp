import { useCallback, useMemo, useRef } from 'react';

import { buildKeyToNote, getKeyboardLayout } from '../audio/keyMap';
import type {
  AudioEngineState,
  KeyboardInteractionHandlers,
  NoteName,
  PianoKeyDefinition,
  ParsedSong,
  SongMetadata,
  SongPlaybackMode,
  SongPlaybackState,
} from '../types';
import { useAudio } from './useAudio';
import { useKeyboard } from './useKeyboard';
import { useOctaveShift } from './useOctaveShift';
import { useSong } from './useSong';

/** Combined piano interaction surface for the root app component. */
export interface UsePianoResult {
  pressedNotes: Set<NoteName>;
  highlightedNotes: NoteName[];
  mode: SongPlaybackMode;
  setMode: (mode: SongPlaybackMode) => void;
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
  baseOctave: number;
  canShiftOctaveDown: boolean;
  canShiftOctaveUp: boolean;
  shiftOctaveDown: () => void;
  shiftOctaveUp: () => void;
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
    mode,
    setMode,
    startPlayback,
    pausePlayback,
    stopPlayback,
    handleNoteInput,
    songLoadError,
  } = useSong({ onAutoNoteStart: playNote, onAutoNoteEnd: releaseNote });
  const {
    baseOctave,
    canShiftDown: canShiftOctaveDown,
    canShiftUp: canShiftOctaveUp,
    shiftDown: shiftOctaveDown,
    shiftUp: shiftOctaveUp,
  } = useOctaveShift();

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

  const keyMap = useMemo(() => buildKeyToNote(baseOctave), [baseOctave]);

  const { pressedNotes, trackNoteDown, trackNoteUp } = useKeyboard({
    enabled: true,
    onNoteDown: handleNoteDown,
    onNoteUp: handleNoteUp,
    keyMap,
  });

  const keyboardLayout = useMemo(() => getKeyboardLayout(baseOctave), [baseOctave]);

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
    highlightedNotes: playbackState.highlightedNotes,
    mode,
    setMode,
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
    baseOctave,
    canShiftOctaveDown,
    canShiftOctaveUp,
    shiftOctaveDown,
    shiftOctaveUp,
  };
};
