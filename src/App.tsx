import { useCallback } from 'react';

import { AudioUnlockOverlay } from './components/AudioUnlockOverlay';
import { Header } from './components/Header';
import { Keyboard } from './components/Keyboard';
import { OctaveControl } from './components/OctaveControl';
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
    highlightedNotes,
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

  /**
   * Ensures audio is ready before starting playback (for play-along mode).
   */
  const handlePlay = useCallback((): void => {
    void ensureAudioReady().then(() => {
      startPlayback();
    });
  }, [ensureAudioReady, startPlayback]);

  return (
    <div className="flex min-h-full flex-col items-center gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <AudioUnlockOverlay audioState={audioState} onUnlock={() => void ensureAudioReady()} />

      <Header />

      {songLoadError ? (
        <p className="text-sm text-rose-400 light:text-rose-600">{songLoadError}</p>
      ) : null}

      <div className="flex w-full max-w-2xl justify-end">
        <OctaveControl
          baseOctave={baseOctave}
          canShiftDown={canShiftOctaveDown}
          canShiftUp={canShiftOctaveUp}
          onShiftDown={shiftOctaveDown}
          onShiftUp={shiftOctaveUp}
        />
      </div>

      <Keyboard
        keys={keyboardLayout}
        pressedNotes={pressedNotes}
        highlightedNotes={highlightedNotes}
        mode={mode}
        handlers={handlers}
      />

      <SongSelector
        songs={songs}
        selectedId={selectedSong?.metadata.id ?? null}
        onSelect={handleSelectSong}
      />

      <PlaybackControls
        mode={mode}
        onModeChange={setMode}
        isPlaying={playbackState.isPlaying}
        isPaused={playbackState.isPaused}
        onPlay={handlePlay}
        onPause={pausePlayback}
        onStop={stopPlayback}
        songTitle={selectedSong?.metadata.title ?? null}
        progress={playbackState.progress}
      />
    </div>
  );
}
