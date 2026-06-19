import { useCallback, useEffect, useRef, useState } from 'react';

import { SONGS } from '../songs/index';
import { loadSong } from '../songs/parser';
import { SongPlayer } from '../songs/player';
import type { NoteName, ParsedSong, SongMetadata, SongPlaybackState } from '../types';

const INITIAL_PLAYBACK_STATE: SongPlaybackState = {
  isPlaying: false,
  isPaused: false,
  currentNoteIndex: 0,
  highlightedNote: null,
  progress: 0,
};

/** Song catalogue, selection, and follow-along playback controls. */
export interface UseSongResult {
  songs: SongMetadata[];
  selectedSong: ParsedSong | null;
  selectSong: (id: string) => void;
  playbackState: SongPlaybackState;
  startPlayback: () => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  handleNoteInput: (note: NoteName) => void;
  songLoadError: string | null;
}

/**
 * Manages song selection, MIDI loading, and follow-along playback state.
 * @returns Song list, active song, playback controls, and note-input handler.
 */
export const useSong = (): UseSongResult => {
  const [selectedSong, setSelectedSong] = useState<ParsedSong | null>(null);
  const [playbackState, setPlaybackState] = useState<SongPlaybackState>(
    INITIAL_PLAYBACK_STATE,
  );
  const [songLoadError, setSongLoadError] = useState<string | null>(null);
  const playerRef = useRef<SongPlayer | null>(null);
  const activeSelectionRef = useRef<string | null>(null);

  /**
   * Disposes the active song player instance.
   */
  const destroyPlayer = useCallback((): void => {
    playerRef.current?.destroy();
    playerRef.current = null;
  }, []);

  /**
   * Loads a song by id and prepares a player for follow-along mode.
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
      setPlaybackState(INITIAL_PLAYBACK_STATE);
      setSongLoadError(null);

      void loadSong(metadata)
        .then((parsedSong) => {
          if (activeSelectionRef.current !== id) {
            return;
          }

          setSelectedSong(parsedSong);
          playerRef.current = new SongPlayer(parsedSong, setPlaybackState);
        })
        .catch((error: unknown) => {
          if (activeSelectionRef.current !== id) {
            return;
          }

          activeSelectionRef.current = null;
          setSelectedSong(null);
          setPlaybackState(INITIAL_PLAYBACK_STATE);
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          setSongLoadError(`Failed to load "${metadata.title}": ${message}`);
          console.error(`Failed to load song "${metadata.title}":`, error);
        });
    },
    [destroyPlayer],
  );

  useEffect(() => {
    return () => {
      destroyPlayer();
    };
  }, [destroyPlayer]);

  /**
   * Starts or resumes follow-along playback for the selected song.
   */
  const startPlayback = useCallback((): void => {
    try {
      playerRef.current?.start();
    } catch (error: unknown) {
      console.error('Failed to start song playback:', error);
    }
  }, []);

  /**
   * Pauses follow-along playback without resetting progress.
   */
  const pausePlayback = useCallback((): void => {
    try {
      playerRef.current?.pause();
    } catch (error: unknown) {
      console.error('Failed to pause song playback:', error);
    }
  }, []);

  /**
   * Stops follow-along playback and resets player position.
   */
  const stopPlayback = useCallback((): void => {
    try {
      playerRef.current?.reset();
    } catch (error: unknown) {
      console.error('Failed to stop song playback:', error);
    }
  }, []);

  /**
   * Forwards a played note to the active song player for wait-for-correct-key mode.
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
    startPlayback,
    pausePlayback,
    stopPlayback,
    handleNoteInput,
    songLoadError,
  };
};
