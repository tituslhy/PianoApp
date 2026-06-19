import { motion } from 'framer-motion';

import type { KeyVisualState, NoteName } from '../types';

/** Props for a single piano key on the on-screen keyboard. */
export interface PianoKeyProps {
  note: NoteName;
  isBlack: boolean;
  keyboardKey?: string;
  visualState: KeyVisualState;
  onPointerDown: (note: NoteName) => void;
  onPointerUp: (note: NoteName) => void;
  onPointerLeave: (note: NoteName) => void;
}

/**
 * Renders one piano key with Framer Motion press animation and follow-along highlight.
 * @param props - Key identity, visual state, and pointer handlers.
 * @returns A clickable white or black piano key.
 */
export function PianoKey({
  note,
  isBlack,
  keyboardKey,
  visualState,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
}: PianoKeyProps) {
  const isPressed = visualState === 'pressed';
  const isHighlighted = visualState === 'highlighted';

  const whiteBase =
    'relative flex h-44 w-11 flex-col items-center justify-end rounded-b-lg border bg-gradient-to-b from-key-white-from to-key-white-to border-key-white-border pb-2 shadow-[var(--shadow-key-white)] select-none touch-none sm:h-52 sm:w-12';
  const blackBase =
    'relative z-10 flex h-28 w-7 flex-col items-center justify-end rounded-b-md border bg-gradient-to-b from-key-black-from to-key-black-to border-key-black-border pb-1.5 shadow-[var(--shadow-key-black)] select-none touch-none sm:h-32 sm:w-8';

  const pressedWhite = 'from-indigo-200 to-indigo-300 shadow-inner translate-y-0.5 light:from-indigo-300 light:to-indigo-400';
  const pressedBlack = 'from-indigo-900 to-indigo-950 shadow-inner translate-y-0.5';
  const highlightWhite =
    'ring-2 ring-amber-400/90 shadow-[0_0_20px_rgba(251,191,36,0.45)] from-amber-50 to-amber-100 light:from-amber-100 light:to-amber-200';
  const highlightBlack =
    'ring-2 ring-amber-400/90 shadow-[0_0_16px_rgba(251,191,36,0.5)] from-amber-900/80 to-amber-950';

  let stateClasses = '';
  if (isPressed) {
    stateClasses = isBlack ? pressedBlack : pressedWhite;
  } else if (isHighlighted) {
    stateClasses = isBlack ? highlightBlack : highlightWhite;
  }

  return (
    <motion.button
      type="button"
      aria-label={`Piano key ${note}${keyboardKey ? `, keyboard ${keyboardKey}` : ''}`}
      className={`${isBlack ? blackBase : whiteBase} ${stateClasses}`}
      animate={{
        y: isPressed ? 3 : 0,
        scale: isPressed ? 0.98 : 1,
      }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onPointerDown={(event) => {
        event.preventDefault();
        onPointerDown(note);
      }}
      onPointerUp={() => onPointerUp(note)}
      onPointerLeave={() => onPointerLeave(note)}
      onPointerCancel={() => onPointerLeave(note)}
    >
      <span
        className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${
          isBlack ? 'text-key-black-label' : 'text-key-white-label'
        } ${isHighlighted ? 'text-amber-600 light:text-amber-700' : ''}`}
      >
        {note}
      </span>
      {keyboardKey ? (
        <span
          className={`rounded px-1 py-0.5 text-[10px] font-medium ${
            isBlack
              ? 'bg-key-black-badge-bg text-key-black-badge-text'
              : 'bg-key-white-badge-bg text-key-white-badge-text'
          } ${isHighlighted ? 'bg-amber-400/30 text-amber-200 light:bg-amber-400/40 light:text-amber-800' : ''}`}
        >
          {keyboardKey}
        </span>
      ) : null}
    </motion.button>
  );
}
