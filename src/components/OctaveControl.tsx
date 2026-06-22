/** Props for the octave-shift indicator and controls. */
export interface OctaveControlProps {
  baseOctave: number;
  canShiftDown: boolean;
  canShiftUp: boolean;
  onShiftDown: () => void;
  onShiftUp: () => void;
}

/**
 * Formats the current 25-key hotkey window as a human-readable range.
 * @param baseOctave - Octave of the window's lowest C.
 * @returns Range label, e.g. "C4–C6".
 */
function octaveRangeLabel(baseOctave: number): string {
  return `C${baseOctave}–C${baseOctave + 2}`;
}

/**
 * Shows the current keyboard-shortcut octave range with up/down shift buttons.
 * Mirrors the Arrow Up/Down keyboard shortcuts for touch-only devices.
 * @param props - Current base octave, clamp-limit flags, and shift handlers.
 * @returns Small inline control bar.
 */
export function OctaveControl({
  baseOctave,
  canShiftDown,
  canShiftUp,
  onShiftDown,
  onShiftUp,
}: OctaveControlProps) {
  return (
    <div className="flex items-center gap-3 text-sm text-piano-text-muted">
      <span>Keys: {octaveRangeLabel(baseOctave)}</span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onShiftDown}
          disabled={!canShiftDown}
          aria-label="Shift hotkeys down an octave"
          className="rounded-md border border-piano-border px-2 py-1 text-xs font-medium text-piano-text transition hover:bg-piano-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={onShiftUp}
          disabled={!canShiftUp}
          aria-label="Shift hotkeys up an octave"
          className="rounded-md border border-piano-border px-2 py-1 text-xs font-medium text-piano-text transition hover:bg-piano-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
