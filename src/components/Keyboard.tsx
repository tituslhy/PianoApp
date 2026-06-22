import type { CSSProperties } from 'react';

import type {
  KeyboardInteractionHandlers,
  NoteName,
  PianoKeyDefinition,
} from '../types';

import { useKeyboardWidth } from '../hooks/useKeyboardWidth';
import { PianoKey } from './PianoKey';

/** Props for the full on-screen piano keyboard. */
export interface KeyboardProps {
  keys: PianoKeyDefinition[];
  pressedNotes: Set<NoteName>;
  highlightedNote: NoteName | null;
  handlers: KeyboardInteractionHandlers;
}

/**
 * Resolves the visual state for a key from pressed and highlight sets.
 * @param note - Scientific notation note name.
 * @param pressedNotes - Currently held notes.
 * @param highlightedNote - Follow-along target note, if any.
 * @returns Visual state for the key component.
 */
function getKeyVisualState(
  note: NoteName,
  pressedNotes: Set<NoteName>,
  highlightedNote: NoteName | null,
): 'idle' | 'pressed' | 'highlighted' {
  if (pressedNotes.has(note)) {
    return 'pressed';
  }
  if (highlightedNote === note) {
    return 'highlighted';
  }
  return 'idle';
}

/** Fraction of a white key's width that a black key sits left of the next white-key boundary. */
const BLACK_KEY_BOUNDARY_OFFSET = 1 / 3;

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
  highlightedNote,
  handlers,
}: KeyboardProps) {
  const whiteKeys = keys.filter((key) => !key.isBlack);
  const blackKeys = keys.filter((key) => key.isBlack);
  const whiteKeysBeforeByNote = countWhiteKeysBefore(keys);
  const { containerRef, whiteKeyWidth } = useKeyboardWidth(whiteKeys.length);

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
              visualState={getKeyVisualState(
                key.note,
                pressedNotes,
                highlightedNote,
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
                  visualState={getKeyVisualState(
                    key.note,
                    pressedNotes,
                    highlightedNote,
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
