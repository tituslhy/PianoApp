import { useCallback, useEffect, useRef, useState } from 'react';

import type { NoteName } from '../types';

/** Options for wiring physical keyboard input to note callbacks. */
export interface UseKeyboardOptions {
  enabled: boolean;
  onNoteDown: (note: NoteName) => void;
  onNoteUp: (note: NoteName) => void;
  keyMap: Record<string, NoteName>;
}

/** Pressed-note tracking plus helpers for on-screen key sync. */
export interface UseKeyboardResult {
  pressedNotes: Set<NoteName>;
  isNotePressed: (note: NoteName) => boolean;
  trackNoteDown: (note: NoteName) => boolean;
  trackNoteUp: (note: NoteName) => boolean;
}

/**
 * Maps window keyboard events to piano notes and tracks which notes are held.
 * Ignores `event.repeat` to prevent key-repeat spam.
 * @param options - Enable flag and note down/up callbacks.
 * @returns Pressed notes and tracking helpers for on-screen key interaction.
 */
export const useKeyboard = ({
  enabled,
  onNoteDown,
  onNoteUp,
  keyMap,
}: UseKeyboardOptions): UseKeyboardResult => {
  const [pressedNotes, setPressedNotes] = useState<Set<NoteName>>(
    () => new Set(),
  );
  const pressedNotesRef = useRef<Set<NoteName>>(pressedNotes);
  const onNoteDownRef = useRef(onNoteDown);
  const onNoteUpRef = useRef(onNoteUp);
  const keyMapRef = useRef(keyMap);

  useEffect(() => {
    pressedNotesRef.current = pressedNotes;
  }, [pressedNotes]);

  useEffect(() => {
    onNoteDownRef.current = onNoteDown;
    onNoteUpRef.current = onNoteUp;
  }, [onNoteDown, onNoteUp]);

  useEffect(() => {
    keyMapRef.current = keyMap;
  }, [keyMap]);

  /**
   * Returns whether a note is currently held down.
   * @param note - Scientific notation note name, e.g. "C4".
   * @returns True when the note is in the pressed set.
   */
  const isNotePressed = useCallback((note: NoteName): boolean => {
    return pressedNotesRef.current.has(note);
  }, []);

  /**
   * Adds a note to the pressed set without invoking callbacks.
   * @param note - Scientific notation note name, e.g. "C4".
   * @returns True when the note was newly pressed.
   */
  const trackNoteDown = useCallback((note: NoteName): boolean => {
    if (pressedNotesRef.current.has(note)) {
      return false;
    }

    const next = new Set(pressedNotesRef.current);
    next.add(note);
    pressedNotesRef.current = next;
    setPressedNotes(next);
    return true;
  }, []);

  /**
   * Removes a note from the pressed set without invoking callbacks.
   * @param note - Scientific notation note name, e.g. "C4".
   * @returns True when the note was released from a pressed state.
   */
  const trackNoteUp = useCallback((note: NoteName): boolean => {
    if (!pressedNotesRef.current.has(note)) {
      return false;
    }

    const next = new Set(pressedNotesRef.current);
    next.delete(note);
    pressedNotesRef.current = next;
    setPressedNotes(next);
    return true;
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    /**
     * Releases all held notes when the window loses focus.
     */
    const releaseAll = (): void => {
      const held = [...pressedNotesRef.current];
      if (held.length === 0) {
        return;
      }

      pressedNotesRef.current = new Set();
      setPressedNotes(new Set());

      for (const note of held) {
        onNoteUpRef.current(note);
      }
    };

    /**
     * Handles physical key press and maps it to a piano note.
     * @param event - Browser keyboard event.
     */
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat) {
        return;
      }

      const note = keyMapRef.current[event.key.toLowerCase()];
      if (!note) {
        return;
      }

      event.preventDefault();

      if (!trackNoteDown(note)) {
        return;
      }

      onNoteDownRef.current(note);
    };

    /**
     * Handles physical key release and maps it to a piano note.
     * @param event - Browser keyboard event.
     */
    const handleKeyUp = (event: KeyboardEvent): void => {
      const note = keyMapRef.current[event.key.toLowerCase()];
      if (!note) {
        return;
      }

      if (!trackNoteUp(note)) {
        return;
      }

      onNoteUpRef.current(note);
    };

    /**
     * Releases held notes when the tab becomes hidden.
     */
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        releaseAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, trackNoteDown, trackNoteUp]);

  return {
    pressedNotes,
    isNotePressed,
    trackNoteDown,
    trackNoteUp,
  };
};
