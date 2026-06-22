import { useCallback, useEffect, useState } from 'react';

import {
  clampBaseOctave,
  DEFAULT_BASE_OCTAVE,
  MAX_BASE_OCTAVE,
  MIN_BASE_OCTAVE,
} from '../audio/keyMap';

/** Return value from {@link useOctaveShift}. */
export interface UseOctaveShiftResult {
  baseOctave: number;
  canShiftDown: boolean;
  canShiftUp: boolean;
  shiftDown: () => void;
  shiftUp: () => void;
}

/**
 * Tracks the movable base octave for the 25-key hotkey window and listens for
 * Arrow Up / Arrow Down to shift it, clamped to the keyboard's valid range.
 * @returns Current base octave, shift helpers, and clamp-limit flags.
 */
export function useOctaveShift(): UseOctaveShiftResult {
  const [baseOctave, setBaseOctave] = useState(DEFAULT_BASE_OCTAVE);

  const shiftBy = useCallback((delta: number): void => {
    setBaseOctave((current) => clampBaseOctave(current + delta));
  }, []);

  const shiftDown = useCallback((): void => shiftBy(-1), [shiftBy]);
  const shiftUp = useCallback((): void => shiftBy(1), [shiftBy]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat) {
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        shiftUp();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        shiftDown();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shiftUp, shiftDown]);

  return {
    baseOctave,
    canShiftDown: baseOctave > MIN_BASE_OCTAVE,
    canShiftUp: baseOctave < MAX_BASE_OCTAVE,
    shiftDown,
    shiftUp,
  };
}
