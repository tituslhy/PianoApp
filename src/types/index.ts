/** Scientific notation note name, e.g. "C4" or "F#5". */
export type NoteName = string;

/** Difficulty tier for song metadata. */
export type SongDifficulty = 'easy' | 'medium' | 'hard';

/** Lifecycle state for the audio engine. */
export type AudioEngineState = 'idle' | 'loading' | 'ready' | 'error';

/** Visual state applied to a piano key. */
export type KeyVisualState = 'idle' | 'pressed' | 'highlighted';

/** Static metadata for a follow-along song. */
export interface SongMetadata {
  id: string;
  title: string;
  difficulty: SongDifficulty;
  tempo: number;
  midiPath: string;
}

/** A single note extracted from a MIDI file. */
export interface ParsedNote {
  note: NoteName;
  time: number;
  duration: number;
  velocity: number;
}

/** Parsed song ready for follow-along playback. */
export interface ParsedSong {
  metadata: SongMetadata;
  notes: ParsedNote[];
  duration: number;
}

/** Definition of one piano key on the keyboard layout. */
export interface PianoKeyDefinition {
  note: NoteName;
  isBlack: boolean;
  keyboardKey?: string;
  octave: number;
}

/** Props contract shared between hooks and keyboard UI. */
export interface KeyboardInteractionHandlers {
  onKeyDown: (note: NoteName) => void;
  onKeyUp: (note: NoteName) => void;
}

/** Follow-along playback state exposed to the UI. */
export interface SongPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentNoteIndex: number;
  highlightedNote: NoteName | null;
  progress: number;
}
