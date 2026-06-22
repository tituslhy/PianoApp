import { useCallback, useEffect, useRef, useState } from 'react';

import { SONGS } from '../songs/index';
import { loadSong } from '../songs/parser';
import { SongPlayer } from '../songs/player';
import type {
  NoteName,
  ParsedSong,
  SongMetadata,
  SongPlaybackMode,
  SongPlaybackState,
} from '../types';

const INITIAL_PLAYBACK_STATE: SongPlaybackState = {
  mode: 'follow',
  isPlaying: false,
  isPaused: false,
  currentNoteIndex: 0,
  highlightedNotes: [],
  progress: 0,
};

/** Callbacks the song player uses to drive real audio during play-along mode. */
export interface UseSongOptions {
  onAutoNoteStart: (note: NoteName) => void;
  onAutoNoteEnd: (note: NoteName) => void;
}

/** Song catalogue, selection, mode, and playback controls. */
export interface UseSongResult {
  songs: SongMetadata[];
  selectedSong: ParsedSong | null;
  selectSong: (id: string) => void;
  playbackState: SongPlaybackState;
  mode: SongPlaybackMode;
  setMode: (mode: SongPlaybackMode) => void;
  startPlayback: () => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  handleNoteInput: (note: NoteName) => void;
  songLoadError: string | null;
}

/**
 * Manages song selection, MIDI loading, mode, and playback state.
 * @param options - Callbacks wired to the audio engine for play-along mode.
 * @returns Song list, active song, mode, playback controls, and note-input handler.
 */
export const useSong = ({ onAutoNoteStart, onAutoNoteEnd }: UseSongOptions): UseSongResult => {
  const [selectedSong, setSelectedSong] = useState<ParsedSong | null>(null);
  const [playbackState, setPlaybackState] = useState<SongPlaybackState>(
    INITIAL_PLAYBACK_STATE,
  );
  const [songLoadError, setSongLoadError] = useState<string | null>(null);
  const playerRef = useRef<SongPlayer | null>(null);
  const activeSelectionRef = useRef<string | null>(null);
  const modeRef = useRef<SongPlaybackMode>('follow');

  /**
   * Disposes the active song player instance.
   */
  const destroyPlayer = useCallback((): void => {
    playerRef.current?.destroy();
    playerRef.current = null;
  }, []);

  /**
   * Loads a song by id and prepares a player in the current mode.
   * @param id - Song metadata id from the catalogue.
   */
  const selectSong = useCallback(
    (id: string): void => {
      const metadata = SONGS.find((song) => song.id === id);
      if (!metadata) {
        console.error(`Song not found: ${id}`);
        return;
      }

      activeSelectionRef.current = id;
      destroyPlayer();
      setSelectedSong(null);
      setPlaybackState({ ...INITIAL_PLAYBACK_STATE, mode: modeRef.current });
      setSongLoadError(null);

      void loadSong(metadata)
        .then((parsedSong) => {
          if (activeSelectionRef.current !== id) {
            return;
          }

          setSelectedSong(parsedSong);
          const player = new SongPlayer({
            onStateChange: setPlaybackState,
            callbacks: { onAutoNoteStart, onAutoNoteEnd },
          });
          player.load(parsedSong);
          player.setMode(modeRef.current);
          playerRef.current = player;
        })
        .catch((error: unknown) => {
          if (activeSelectionRef.current !== id) {
            return;
          }

          activeSelectionRef.current = null;
          setSelectedSong(null);
          setPlaybackState({ ...INITIAL_PLAYBACK_STATE, mode: modeRef.current });
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          setSongLoadError(`Failed to load "${metadata.title}": ${message}`);
          console.error(`Failed to load song "${metadata.title}":`, error);
        });
    },
    [destroyPlayer, onAutoNoteStart, onAutoNoteEnd],
  );

  useEffect(() => {
    return () => {
      destroyPlayer();
    };
  }, [destroyPlayer]);

  /**
   * Switches playback mode. Ignored while playback is active — the UI should
   * disable mode controls in that state, and the underlying player also
   * guards against changing mode mid-playback.
   * @param mode - 'follow' to wait for keypresses, 'play' to auto-play.
   */
  const setMode = useCallback(
    (mode: SongPlaybackMode): void => {
      if (playbackState.isPlaying || playbackState.isPaused) {
        return;
      }

      modeRef.current = mode;
      playerRef.current?.setMode(mode);
      setPlaybackState((previous) => ({ ...previous, mode }));
    },
    [playbackState.isPlaying, playbackState.isPaused],
  );

  /**
   * Starts or resumes playback for the selected song.
   */
  const startPlayback = useCallback((): void => {
    try {
      playerRef.current?.start();
    } catch (error: unknown) {
      console.error('Failed to start song playback:', error);
    }
  }, []);

  /**
   * Pauses playback without resetting progress.
   */
  const pausePlayback = useCallback((): void => {
    try {
      playerRef.current?.pause();
    } catch (error: unknown) {
      console.error('Failed to pause song playback:', error);
    }
  }, []);

  /**
   * Stops playback and resets player position.
   */
  const stopPlayback = useCallback((): void => {
    try {
      playerRef.current?.reset();
    } catch (error: unknown) {
      console.error('Failed to stop song playback:', error);
    }
  }, []);

  /**
   * Forwards a played note to the active song player for follow-along mode.
   * @param note - Scientific notation note name, e.g. "C4".
   */
  const handleNoteInput = useCallback((note: NoteName): void => {
    try {
      playerRef.current?.handleNoteInput(note);
    } catch (error: unknown) {
      console.error(`Failed to handle song note input for ${note}:`, error);
    }
  }, []);

  return {
    songs: SONGS,
    selectedSong,
    selectSong,
    playbackState,
    mode: playbackState.mode,
    setMode,
    startPlayback,
    pausePlayback,
    stopPlayback,
    handleNoteInput,
    songLoadError,
  };
};
