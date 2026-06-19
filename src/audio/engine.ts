import * as Tone from 'tone';
import type { AudioEngineState, NoteName } from '../types/index.ts';

/** CDN base path for Salamander Grand Piano samples. */
const SALAMANDER_BASE_URL = 'https://tonejs.github.io/audio/salamander/';

/** Sparse sample map — Tone.Sampler repitches to fill gaps between notes. */
const SAMPLER_URLS: Record<string, string> = {
  C4: 'C4.mp3',
  'D#4': 'Ds4.mp3',
  'F#4': 'Fs4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
  'D#5': 'Ds5.mp3',
  'F#5': 'Fs5.mp3',
  A5: 'A5.mp3',
  C6: 'C6.mp3',
};

type AudioStateListener = (state: AudioEngineState) => void;

let sampler: Tone.Sampler | null = null;
let initPromise: Promise<void> | null = null;
let engineState: AudioEngineState = 'idle';
const listeners = new Set<AudioStateListener>();

/**
 * Updates engine state and notifies all subscribers.
 * @param nextState - New lifecycle state for the audio engine.
 */
function setEngineState(nextState: AudioEngineState): void {
  engineState = nextState;
  for (const listener of listeners) {
    try {
      listener(nextState);
    } catch (error) {
      console.error('Audio state listener failed:', error);
    }
  }
}

/**
 * Creates and connects the Tone.Sampler singleton.
 * @returns Configured sampler wired to the audio destination.
 */
function createSampler(): Tone.Sampler {
  return new Tone.Sampler({
    urls: SAMPLER_URLS,
    release: 1,
    baseUrl: SALAMANDER_BASE_URL,
  }).toDestination();
}

/**
 * Initializes Tone.js and loads piano samples. Must be called from a user gesture.
 * Safe to call multiple times — subsequent calls return the same promise.
 * @returns Promise that resolves when samples are loaded and ready to play.
 */
export function initAudio(): Promise<void> {
  if (engineState === 'ready' && sampler !== null) {
    return Promise.resolve();
  }

  if (initPromise !== null) {
    return initPromise;
  }

  setEngineState('loading');

  initPromise = (async () => {
    try {
      await Tone.start();
      sampler = createSampler();
      await Tone.loaded();
      setEngineState('ready');
    } catch (error) {
      sampler = null;
      initPromise = null;
      setEngineState('error');
      console.error('Failed to initialize audio engine:', error);
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Triggers the attack phase for a note on the piano sampler.
 * @param note - Scientific note name, e.g. "C4".
 */
export function playNote(note: NoteName): void {
  try {
    if (sampler === null || engineState !== 'ready') {
      console.warn(`Cannot play "${note}": audio engine is not ready (${engineState}).`);
      return;
    }
    sampler.triggerAttack(note);
  } catch (error) {
    console.error(`Failed to play note "${note}":`, error);
    setEngineState('error');
  }
}

/**
 * Triggers the release phase for a note on the piano sampler.
 * @param note - Scientific note name, e.g. "C4".
 */
export function releaseNote(note: NoteName): void {
  try {
    if (sampler === null || engineState !== 'ready') {
      return;
    }
    sampler.triggerRelease(note);
  } catch (error) {
    console.error(`Failed to release note "${note}":`, error);
    setEngineState('error');
  }
}

/**
 * Returns the current lifecycle state of the audio engine.
 * @returns One of idle, loading, ready, or error.
 */
export function getAudioState(): AudioEngineState {
  return engineState;
}

/**
 * Subscribes to audio engine state changes.
 * @param callback - Called immediately with current state and on each change.
 * @returns Unsubscribe function that removes the listener.
 */
export function subscribeAudioState(callback: AudioStateListener): () => void {
  listeners.add(callback);
  callback(engineState);

  return () => {
    listeners.delete(callback);
  };
}
