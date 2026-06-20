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

/** Tailwind left-offset classes for black keys (15 white keys, fixed layout). */
const BLACK_KEY_LEFT_CLASS: Record<string, string> = {
  'C#4': 'left-[4.5%]',
  'D#4': 'left-[11%]',
  'F#4': 'left-[24%]',
  'G#4': 'left-[31%]',
  'A#4': 'left-[38%]',
  'C#5': 'left-[51%]',
  'D#5': 'left-[58%]',
  'F#5': 'left-[71%]',
  'G#5': 'left-[78%]',
  'A#5': 'left-[85%]',
};

/**
 * Returns the Tailwind class for positioning a black key.
 * @param note - Black key note name.
 * @returns Tailwind left-offset utility class.
 */
function getBlackKeyLeftClass(note: NoteName): string {
  return BLACK_KEY_LEFT_CLASS[note] ?? 'left-0';
}

/**
 * Renders a two-octave piano keyboard with white and black keys.
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
  const { containerRef, whiteKeyWidth } = useKeyboardWidth();

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
          {blackKeys.map((key) => (
            <div
              key={key.note}
              className={`pointer-events-auto absolute top-0 -translate-x-1/2 ${getBlackKeyLeftClass(key.note)}`}
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
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}
