import * as Tone from 'tone';

import type { Dispatch, SetStateAction } from 'react';

import type { NoteName, ParsedNote, ParsedSong, SongPlaybackState } from '../types/index.ts';

/** Callbacks invoked during follow-along playback. */
export interface SongPlayerCallbacks {
  onHighlight?: (note: NoteName) => void;
  onNotePlayed?: (note: NoteName) => void;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
}

/** Options for configuring a song player instance. */
export interface SongPlayerOptions {
  callbacks?: SongPlayerCallbacks;
  /** When true, playback pauses until the user presses the highlighted note. */
  waitForCorrectKey?: boolean;
  /** Optional React state setter for playback UI integration. */
  onStateChange?: Dispatch<SetStateAction<SongPlaybackState>>;
}

const INITIAL_PLAYBACK_STATE: SongPlaybackState = {
  isPlaying: false,
  isPaused: false,
  currentNoteIndex: 0,
  highlightedNote: null,
  progress: 0,
};

/**
 * Follow-along song player that highlights notes in time with a parsed MIDI song.
 * Supports a "wait for correct key" mode that pauses Transport until the user
 * presses the expected note.
 */
export class SongPlayer {
  private parsedSong: ParsedSong | null = null;
  private callbacks: SongPlayerCallbacks;
  private onStateChange: Dispatch<SetStateAction<SongPlaybackState>> | null;
  private waitForCorrectKey: boolean;
  private currentIndex = 0;
  private isPlaying = false;
  private isPaused = false;
  private waitingForNote: NoteName | null = null;
  private waitingForNotes = new Set<NoteName>();
  private scheduledEventIds: number[] = [];

  /**
   * Creates a song player with optional callbacks and wait mode.
   * @param parsedSongOrOptions - Parsed song or player configuration.
   * @param onStateChange - Optional React state setter for playback UI.
   */
  constructor(
    parsedSongOrOptions?: ParsedSong | SongPlayerOptions,
    onStateChange?: Dispatch<SetStateAction<SongPlaybackState>>,
  ) {
    if (parsedSongOrOptions && 'notes' in parsedSongOrOptions) {
      this.callbacks = {};
      this.onStateChange = onStateChange ?? null;
      this.waitForCorrectKey = true;
      this.parsedSong = parsedSongOrOptions;
      return;
    }

    const options = (parsedSongOrOptions as SongPlayerOptions | undefined) ?? {};
    this.callbacks = options.callbacks ?? {};
    this.onStateChange = options.onStateChange ?? null;
    this.waitForCorrectKey = options.waitForCorrectKey ?? false;
  }

  /**
   * Enables or disables wait-for-correct-key mode.
   * @param enabled - Whether to pause for user input on each note.
   */
  setWaitForCorrectKey(enabled: boolean): void {
    this.waitForCorrectKey = enabled;
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

      if (this.waitForCorrectKey && this.waitingForNotes.size > 0) {
        return;
      }

      Tone.Transport.start();
      return;
    }

    this.isPlaying = true;
    this.isPaused = false;
    this.clearScheduledEvents();
    this.schedulePlayback();
    this.syncState();
    Tone.Transport.start();
  }

  /**
   * Pauses playback while preserving the current position.
   */
  pause(): void {
    if (!this.isPlaying) {
      return;
    }

    Tone.Transport.pause();
    this.isPaused = true;
    this.isPlaying = false;
    this.syncState();
  }

  /**
   * Stops playback, clears scheduled events, and resets position.
   */
  stop(): void {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    this.clearScheduledEvents();
    this.isPlaying = false;
    this.isPaused = false;
    this.waitingForNote = null;
    this.waitingForNotes.clear();
    this.currentIndex = 0;
    this.emitProgress();
    this.syncState({
      highlightedNote: null,
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
   * Handles a user key press during wait mode.
   * @param note - The note the user pressed.
   * @returns True if the pressed note matched an expected highlight.
   */
  handleKeyPress(note: NoteName): boolean {
    if (!this.waitForCorrectKey || this.waitingForNotes.size === 0) {
      return false;
    }

    if (!this.waitingForNotes.has(note)) {
      return false;
    }

    this.waitingForNotes.delete(note);
    this.callbacks.onNotePlayed?.(note);

    if (this.waitingForNotes.size > 0) {
      this.waitingForNote = [...this.waitingForNotes][0] ?? null;
      this.syncState({ highlightedNote: this.waitingForNote });
      return true;
    }

    this.waitingForNote = null;
    this.currentIndex += 1;
    this.emitProgress();

    if (!this.parsedSong || this.currentIndex >= this.parsedSong.notes.length) {
      this.finishPlayback();
      return true;
    }

    if (this.isPlaying) {
      Tone.Transport.start();
    }

    this.syncState({ highlightedNote: null });
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
   * Schedules note highlights on Tone.Transport.
   */
  private schedulePlayback(): void {
    if (!this.parsedSong) {
      return;
    }

    Tone.Transport.bpm.value = this.parsedSong.metadata.tempo;
    Tone.Transport.seconds = 0;

    const notes = this.parsedSong.notes;

    for (let index = 0; index < notes.length; index += 1) {
      const note = notes[index];
      const eventId = Tone.Transport.schedule(() => {
        this.handleNoteReached(note, index);
      }, note.time);

      this.scheduledEventIds.push(eventId);
    }

    const completeId = Tone.Transport.schedule(() => {
      if (!this.waitForCorrectKey || this.waitingForNotes.size === 0) {
        this.finishPlayback();
      }
    }, this.parsedSong.duration);

    this.scheduledEventIds.push(completeId);
  }

  /**
   * Called when Transport reaches a note's scheduled time.
   * @param note - The note that was reached.
   * @param index - Index of the note in the song.
   */
  private handleNoteReached(note: ParsedNote, index: number): void {
    this.currentIndex = index;
    this.callbacks.onHighlight?.(note.note);
    this.emitProgress();

    if (this.waitForCorrectKey) {
      Tone.Transport.pause();
      this.waitingForNotes.add(note.note);
      this.waitingForNote = note.note;
      this.syncState({ highlightedNote: note.note });
      return;
    }

    this.syncState({ highlightedNote: note.note });
  }

  /**
   * Emits progress based on the current note index.
   */
  private emitProgress(): void {
    if (!this.parsedSong || this.parsedSong.notes.length === 0) {
      this.callbacks.onProgress?.(0);
      this.syncState({ progress: 0, currentNoteIndex: 0 });
      return;
    }

    const progress = Math.min(this.currentIndex / this.parsedSong.notes.length, 1);
    this.callbacks.onProgress?.(progress);
    this.syncState({ progress, currentNoteIndex: this.currentIndex });
  }

  /**
   * Pushes the current playback snapshot to React state when configured.
   * @param partial - Optional partial state overrides.
   */
  private syncState(partial: Partial<SongPlaybackState> = {}): void {
    if (!this.onStateChange) {
      return;
    }

    const resolvedHighlight =
      partial.highlightedNote !== undefined
        ? partial.highlightedNote
        : this.waitingForNote;

    this.onStateChange((previous) => ({
      ...previous,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentNoteIndex: partial.currentNoteIndex ?? this.currentIndex,
      progress: partial.progress ?? previous.progress,
      highlightedNote: resolvedHighlight,
    }));
  }

  /**
   * Clears all Transport schedule event ids tracked by this player.
   */
  private clearScheduledEvents(): void {
    for (const eventId of this.scheduledEventIds) {
      Tone.Transport.clear(eventId);
    }
    this.scheduledEventIds = [];
  }

  /**
   * Ends playback and fires the completion callback.
   */
  private finishPlayback(): void {
    this.stop();
    this.currentIndex = this.parsedSong?.notes.length ?? 0;
    this.callbacks.onProgress?.(1);
    this.callbacks.onComplete?.();
    this.syncState({
      progress: 1,
      currentNoteIndex: this.currentIndex,
      highlightedNote: null,
    });
  }
}
