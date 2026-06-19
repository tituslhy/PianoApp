import { useCallback } from 'react';

import { AudioUnlockOverlay } from './components/AudioUnlockOverlay';
import { Header } from './components/Header';
import { Keyboard } from './components/Keyboard';
import { PlaybackControls } from './components/PlaybackControls';
import { SongSelector } from './components/SongSelector';
import { usePiano } from './hooks/usePiano';

/**
 * Root application component — piano keyboard, song picker, and follow-along controls.
 * @returns The full piano app UI.
 */
export function App() {
  const {
    pressedNotes,
    highlightedNote,
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
  } = usePiano();

  /**
   * Selects a song and ensures audio is ready on first interaction.
   * @param id - Song catalogue id.
   */
  const handleSelectSong = useCallback(
    (id: string): void => {
      selectSong(id);
      void ensureAudioReady();
    },
    [selectSong, ensureAudioReady],
  );

  return (
    <div className="flex min-h-full flex-col items-center gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <AudioUnlockOverlay audioState={audioState} onUnlock={() => void ensureAudioReady()} />

      <Header />

      {songLoadError ? (
        <p className="text-sm text-rose-400 light:text-rose-600">{songLoadError}</p>
      ) : null}

      <Keyboard
        keys={keyboardLayout}
        pressedNotes={pressedNotes}
        highlightedNote={highlightedNote}
        handlers={handlers}
      />

      <SongSelector
        songs={songs}
        selectedId={selectedSong?.metadata.id ?? null}
        onSelect={handleSelectSong}
      />

      <PlaybackControls
        isPlaying={playbackState.isPlaying}
        isPaused={playbackState.isPaused}
        onPlay={startPlayback}
        onPause={pausePlayback}
        onStop={stopPlayback}
        songTitle={selectedSong?.metadata.title ?? null}
        progress={playbackState.progress}
      />
    </div>
  );
}
