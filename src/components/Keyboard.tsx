import type { CSSProperties } from 'react';

import type {
  KeyboardInteractionHandlers,
  KeyVisualState,
  NoteName,
  PianoKeyDefinition,
  SongPlaybackMode,
} from '../types';

import { useKeyboardWidth } from '../hooks/useKeyboardWidth';
import { PianoKey } from './PianoKey';

/** Props for the full on-screen piano keyboard. */
export interface KeyboardProps {
  keys: PianoKeyDefinition[];
  pressedNotes: Set<NoteName>;
  highlightedNotes: NoteName[];
  mode: SongPlaybackMode;
  handlers: KeyboardInteractionHandlers;
}

/**
 * Resolves the visual state for a key from pressed and highlight sets.
 * @param note - Scientific notation note name.
 * @param pressedNotes - Currently held notes.
 * @param highlightedNotes - Follow-along target notes.
 * @param mode - Playback mode determining highlight style.
 * @returns Visual state for the key component.
 */
function getKeyVisualState(
  note: NoteName,
  pressedNotes: Set<NoteName>,
  highlightedNotes: NoteName[],
  mode: SongPlaybackMode,
): KeyVisualState {
  if (pressedNotes.has(note)) {
    return 'pressed';
  }
  if (highlightedNotes.includes(note)) {
    return mode === 'play' ? 'auto-playing' : 'highlighted';
  }
  return 'idle';
}

/** Fraction of a white key's width that a black key sits left of the next white-key boundary. */
const BLACK_KEY_BOUNDARY_OFFSET = 1 / 3;

/** White-key width, in pixels, below which note/shortcut labels are hidden for legibility. */
const LABEL_MIN_WIDTH = 36;

/**
 * Counts how many white keys precede each key in layout order.
 * @param keys - Ordered piano key definitions.
 * @returns Map from note name to the number of preceding white keys.
 */
function countWhiteKeysBefore(keys: PianoKeyDefinition[]): Map<NoteName, number> {
  const counts = new Map<NoteName, number>();
  let whiteCount = 0;

  for (const key of keys) {
    counts.set(key.note, whiteCount);
    if (!key.isBlack) {
      whiteCount += 1;
    }
  }

  return counts;
}

/**
 * Renders the on-screen piano keyboard with white and black keys.
 * @param props - Layout, interaction handlers, and visual state.
 * @returns Responsive piano keyboard component.
 */
export function Keyboard({
  keys,
  pressedNotes,
  highlightedNotes,
  mode,
  handlers,
}: KeyboardProps) {
  const whiteKeys = keys.filter((key) => !key.isBlack);
  const blackKeys = keys.filter((key) => key.isBlack);
  const whiteKeysBeforeByNote = countWhiteKeysBefore(keys);
  const { containerRef, whiteKeyWidth } = useKeyboardWidth(whiteKeys.length);
  const showLabels = whiteKeyWidth >= LABEL_MIN_WIDTH;

  return (
    <div ref={containerRef} className="w-full overflow-x-auto pb-2">
      <div className="mx-auto w-fit">
        <div
          className="relative flex rounded-xl bg-piano-surface/80 p-4 shadow-2xl ring-1 ring-piano-ring light:shadow-lg light:shadow-slate-400/20"
          style={{
            '--key-w': `${whiteKeyWidth}px`,
            '--key-h': `${Math.min(208, Math.max(176, Math.round(whiteKeyWidth * 4.1)))}px`,
          } as CSSProperties}
        >
        <div className="flex">
          {whiteKeys.map((key) => (
            <PianoKey
              key={key.note}
              note={key.note}
              isBlack={false}
              keyboardKey={key.keyboardKey}
              showLabels={showLabels}
              visualState={getKeyVisualState(
                key.note,
                pressedNotes,
                highlightedNotes,
                mode,
              )}
              onPointerDown={handlers.onKeyDown}
              onPointerUp={handlers.onKeyUp}
              onPointerLeave={handlers.onKeyUp}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-4 top-4 bottom-4">
          {blackKeys.map((key) => {
            const whiteKeysBefore = whiteKeysBeforeByNote.get(key.note) ?? 0;
            const leftOffset = whiteKeysBefore - BLACK_KEY_BOUNDARY_OFFSET;
            return (
              <div
                key={key.note}
                className="pointer-events-auto absolute top-0 -translate-x-1/2"
                style={{ left: `calc(var(--key-w) * ${leftOffset})` }}
              >
                <PianoKey
                  note={key.note}
                  isBlack
                  keyboardKey={key.keyboardKey}
                  showLabels={showLabels}
                  visualState={getKeyVisualState(
                    key.note,
                    pressedNotes,
                    highlightedNotes,
                    mode,
                  )}
                  onPointerDown={handlers.onKeyDown}
                  onPointerUp={handlers.onKeyUp}
                  onPointerLeave={handlers.onKeyUp}
                />
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}
