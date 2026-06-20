import { useEffect, useRef, useState } from 'react';

import type { RefObject } from 'react';

/** Minimum white key width in pixels — keeps tap targets usable on small phones. */
const MIN_WHITE_KEY_WIDTH = 40;

/** Maximum white key width in pixels — avoids absurdly large keys on wide monitors. */
const MAX_WHITE_KEY_WIDTH = 68;

/** Number of white keys rendered (C4 through C6). */
const WHITE_KEY_COUNT = 15;

/** Horizontal padding (both sides) of the keyboard surface, in pixels. */
const SURFACE_PADDING = 32;

/** Return value from {@link useKeyboardWidth}. */
export interface UseKeyboardWidthResult {
  containerRef: RefObject<HTMLDivElement | null>;
  whiteKeyWidth: number;
}

/**
 * Measures the keyboard's scroll container and computes a white key width that
 * fills as much of the available space as possible, clamped to a sensible range.
 * @returns A ref to attach to the scroll container, and the computed key width.
 */
export function useKeyboardWidth(): UseKeyboardWidthResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [whiteKeyWidth, setWhiteKeyWidth] = useState(MIN_WHITE_KEY_WIDTH);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateWidth = (containerWidth: number): void => {
      const available = containerWidth - SURFACE_PADDING;
      const next = Math.min(
        MAX_WHITE_KEY_WIDTH,
        Math.max(MIN_WHITE_KEY_WIDTH, Math.floor(available / WHITE_KEY_COUNT)),
      );
      setWhiteKeyWidth(next);
    };

    updateWidth(container.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        updateWidth(entry.contentRect.width);
      }
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return { containerRef, whiteKeyWidth };
}
