import * as Tone from 'tone';

import type { Dispatch, SetStateAction } from 'react';

import type {
  NoteName,
  ParsedNote,
  ParsedSong,
  SongPlaybackMode,
  SongPlaybackState,
} from '../types/index.ts';

/** Callbacks invoked during playback. */
export interface SongPlayerCallbacks {
  /** Fired when play-along mode starts sounding a note automatically. */
  onAutoNoteStart?: (note: NoteName) => void;
  /** Fired when play-along mode releases an automatically-sounded note. */
  onAutoNoteEnd?: (note: NoteName) => void;
  /** Fired in follow-along mode when the user successfully presses an expected note. */
  onNotePlayed?: (note: NoteName) => void;
  /** Fired when the song finishes playing. */
  onComplete?: () => void;
}

/** Options for configuring a song player instance. */
export interface SongPlayerOptions {
  callbacks?: SongPlayerCallbacks;
  /** Optional React state setter for playback UI integration. */
  onStateChange?: Dispatch<SetStateAction<SongPlaybackState>>;
}

const INITIAL_PLAYBACK_STATE: SongPlaybackState = {
  mode: 'follow',
  isPlaying: false,
  isPaused: false,
  currentNoteIndex: 0,
  highlightedNotes: [],
  progress: 0,
};

/**
 * Song player that highlights notes in time with a parsed MIDI song.
 * In follow-along mode it pauses the Transport and waits for the user to press
 * each expected note. In play-along mode it auto-triggers and releases the
 * sampler itself, on schedule, without pausing.
 */
export class SongPlayer {
  private parsedSong: ParsedSong | null = null;
  private callbacks: SongPlayerCallbacks;
  private onStateChange: Dispatch<SetStateAction<SongPlaybackState>> | null;
  private mode: SongPlaybackMode = 'follow';
  private currentIndex = 0;
  private isPlaying = false;
  private isPaused = false;
  private waitingForNotes = new Set<NoteName>();
  private activeNoteCounts = new Map<NoteName, number>();
  private scheduledEventIds: number[] = [];

  /**
   * Creates a song player with optional callbacks and state-change subscriber.
   * @param options - Callbacks and React state setter for playback UI.
   */
  constructor(options: SongPlayerOptions = {}) {
    this.callbacks = options.callbacks ?? {};
    this.onStateChange = options.onStateChange ?? null;
  }

  /**
   * Sets the playback mode. Only takes effect while playback is stopped
   * (not playing and not paused) — callers should disable mode-switch UI
   * while active rather than rely solely on this guard.
   * @param mode - 'follow' to wait for keypresses, 'play' to auto-play.
   */
  setMode(mode: SongPlaybackMode): void {
    if (this.isPlaying || this.isPaused) {
      return;
    }

    this.mode = mode;
    this.syncState();
  }

  /**
   * Loads a parsed song, replacing any previously loaded song.
   * @param parsedSong - Parsed song ready for playback.
   */
  load(parsedSong: ParsedSong): void {
    this.stop();
    this.parsedSong = parsedSong;
    this.currentIndex = 0;
    this.emitProgress();
  }

  /**
   * Starts or resumes playback from the current position.
   */
  start(): void {
    if (!this.parsedSong || this.parsedSong.notes.length === 0) {
      return;
    }

    if (this.isPaused) {
      this.isPaused = false;
      this.isPlaying = true;
      this.syncState();

      if (this.mode === 'follow' && this.waitingForNotes.size > 0) {
        return;
      }

      Tone.getTransport().start();
      return;
    }

    this.isPlaying = true;
    this.isPaused = false;
    this.clearScheduledEvents();
    this.schedulePlayback();
    this.syncState();
    Tone.getTransport().start();
  }

  /**
   * Pauses playback while preserving the current position. Notes already
   * sounding in play-along mode ring out naturally; the Transport clock
   * itself halts, so not-yet-fired release events stay correctly queued.
   */
  pause(): void {
    if (!this.isPlaying) {
      return;
    }

    Tone.getTransport().pause();
    this.isPaused = true;
    this.isPlaying = false;
    this.syncState();
  }

  /**
   * Stops playback, clears scheduled events, force-releases any notes still
   * sounding from play-along mode, and resets position.
   */
  stop(): void {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    this.clearScheduledEvents();
    this.releaseAllActiveNotes();
    this.isPlaying = false;
    this.isPaused = false;
    this.waitingForNotes.clear();
    this.currentIndex = 0;
    this.emitProgress();
    this.syncState({
      progress: 0,
      currentNoteIndex: 0,
    });
  }

  /**
   * Resets playback to the beginning without starting.
   */
  reset(): void {
    this.stop();
  }

  /**
   * Tears down the player and releases Transport schedules.
   */
  destroy(): void {
    this.stop();
    this.parsedSong = null;
    this.onStateChange?.(INITIAL_PLAYBACK_STATE);
  }

  /**
   * Handles a user key press during follow-along mode. No-ops in play-along
   * mode, since playback isn't gated on user input there.
   * @param note - The note the user pressed.
   * @returns True if the pressed note matched an expected highlight.
   */
  handleKeyPress(note: NoteName): boolean {
    if (this.mode !== 'follow' || this.waitingForNotes.size === 0) {
      return false;
    }

    if (!this.waitingForNotes.has(note)) {
      return false;
    }

    this.waitingForNotes.delete(note);
    this.callbacks.onNotePlayed?.(note);

    if (this.waitingForNotes.size > 0) {
      this.syncState();
      return true;
    }

    this.currentIndex += 1;
    this.emitProgress();

    if (!this.parsedSong || this.currentIndex >= this.parsedSong.notes.length) {
      this.finishPlayback();
      return true;
    }

    if (this.isPlaying) {
      Tone.getTransport().start();
    }

    this.syncState();
    return true;
  }

  /**
   * Forwards a played note to wait-for-correct-key handling.
   * @param note - Scientific notation note name, e.g. "C4".
   */
  handleNoteInput(note: NoteName): void {
    this.handleKeyPress(note);
  }

  /**
   * Schedules note events on the Tone.js Transport. Every note gets a
   * start event; play-along mode additionally schedules a release event at
   * `note.time + note.duration`.
   */
  private schedulePlayback(): void {
    if (!this.parsedSong) {
      return;
    }

    Tone.getTransport().bpm.value = this.parsedSong.metadata.tempo;
    Tone.getTransport().seconds = 0;

    const notes = this.parsedSong.notes;

    for (let index = 0; index < notes.length; index += 1) {
      const note = notes[index];

      const startId = Tone.getTransport().schedule(() => {
        this.handleNoteReached(note, index);
      }, note.time);
      this.scheduledEventIds.push(startId);

      if (this.mode === 'play') {
        const endId = Tone.getTransport().schedule(() => {
          this.handleAutoNoteEnd(note.note);
        }, note.time + note.duration);
        this.scheduledEventIds.push(endId);
      }
    }

    const completeId = Tone.getTransport().schedule(() => {
      if (this.mode === 'play' || this.waitingForNotes.size === 0) {
        this.finishPlayback();
      }
    }, this.parsedSong.duration);

    this.scheduledEventIds.push(completeId);
  }

  /**
   * Called when Transport reaches a note's scheduled start time.
   * @param note - The note that was reached.
   * @param index - Index of the note in the song.
   */
  private handleNoteReached(note: ParsedNote, index: number): void {
    this.currentIndex = index;

    if (this.mode === 'play') {
      this.activeNoteCounts.set(note.note, (this.activeNoteCounts.get(note.note) ?? 0) + 1);
      this.callbacks.onAutoNoteStart?.(note.note);
      this.emitProgress();
      this.syncState();
      return;
    }

    this.waitingForNotes.add(note.note);
    this.emitProgress();
    Tone.getTransport().pause();
    this.syncState();
  }

  /**
   * Called when Transport reaches a play-along note's scheduled release time.
   * @param note - Scientific notation note name being released.
   */
  private handleAutoNoteEnd(note: NoteName): void {
    const count = this.activeNoteCounts.get(note) ?? 0;

    if (count <= 1) {
      this.activeNoteCounts.delete(note);
    } else {
      this.activeNoteCounts.set(note, count - 1);
    }

    this.callbacks.onAutoNoteEnd?.(note);
    this.syncState();
  }

  /**
   * Immediately releases every note still active from play-along mode.
   * Called on stop so nothing keeps sounding after playback ends.
   */
  private releaseAllActiveNotes(): void {
    for (const note of this.activeNoteCounts.keys()) {
      this.callbacks.onAutoNoteEnd?.(note);
    }
    this.activeNoteCounts.clear();
  }

  /**
   * Emits progress based on the current note index.
   */
  private emitProgress(): void {
    if (!this.parsedSong || this.parsedSong.notes.length === 0) {
      this.syncState({ progress: 0, currentNoteIndex: 0 });
      return;
    }

    const progress = Math.min(this.currentIndex / this.parsedSong.notes.length, 1);
    this.syncState({ progress, currentNoteIndex: this.currentIndex });
  }

  /**
   * Resolves the set of notes that should currently render as highlighted,
   * sourced from whichever bookkeeping structure the active mode uses.
   * @returns Highlighted note names for the active mode.
   */
  private currentHighlightedNotes(): NoteName[] {
    return this.mode === 'play' ? [...this.activeNoteCounts.keys()] : [...this.waitingForNotes];
  }

  /**
   * Pushes the current playback snapshot to React state when configured.
   * @param partial - Optional partial state overrides.
   */
  private syncState(partial: Partial<SongPlaybackState> = {}): void {
    if (!this.onStateChange) {
      return;
    }

    this.onStateChange((previous) => ({
      ...previous,
      mode: this.mode,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentNoteIndex: partial.currentNoteIndex ?? this.currentIndex,
      progress: partial.progress ?? previous.progress,
      highlightedNotes: this.currentHighlightedNotes(),
    }));
  }

  /**
   * Clears all Transport schedule event ids tracked by this player.
   */
  private clearScheduledEvents(): void {
    for (const eventId of this.scheduledEventIds) {
      Tone.getTransport().clear(eventId);
    }
    this.scheduledEventIds = [];
  }

  /**
   * Ends playback and fires the completion callback.
   */
  private finishPlayback(): void {
    this.stop();
    this.currentIndex = this.parsedSong?.notes.length ?? 0;
    this.callbacks.onComplete?.();
    this.syncState({
      progress: 1,
      currentNoteIndex: this.currentIndex,
    });
  }
}
