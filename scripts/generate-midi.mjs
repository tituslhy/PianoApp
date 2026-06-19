/**
 * One-off script to generate simplified example MIDI files.
 * Run: node scripts/generate-midi.mjs
 */
import tonejsMidi from '@tonejs/midi';

const { Midi } = tonejsMidi;
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, '..', 'public', 'songs');

/**
 * Adds a sequence of quarter notes to a track.
 * @param {import('@tonejs/midi').Track} track
 * @param {number[]} midiNotes
 * @param {number} startTime - seconds
 * @param {number} noteDuration - seconds per note
 */
function addQuarterNotes(track, midiNotes, startTime, noteDuration) {
  let time = startTime;
  for (const midi of midiNotes) {
    track.addNote({
      midi,
      time,
      duration: noteDuration * 0.9,
      velocity: 0.85,
    });
    time += noteDuration;
  }
  return time;
}

/**
 * Adds notes with individual durations in seconds.
 * @param {import('@tonejs/midi').Track} track
 * @param {{ midi: number; duration: number }[]} sequence
 * @param {number} startTime
 */
function addTimedNotes(track, sequence, startTime) {
  let time = startTime;
  for (const { midi, duration } of sequence) {
    track.addNote({
      midi,
      time,
      duration: duration * 0.9,
      velocity: 0.85,
    });
    time += duration;
  }
  return time;
}

/**
 * Creates the simplified Twinkle Twinkle Little Star MIDI.
 * @returns {Midi}
 */
function createTwinkleMidi() {
  const midi = new Midi();
  midi.name = 'Twinkle Twinkle Little Star';
  midi.header.setTempo(120);

  const track = midi.addTrack();
  track.name = 'Melody';

  const melody = [
    60, 60, 67, 67, 69, 69, 67, // C4 C4 G4 G4 A4 A4 G4
    65, 65, 64, 64, 62, 62, 60, // F4 F4 E4 E4 D4 D4 C4
  ];

  addQuarterNotes(track, melody, 0, 0.5);
  return midi;
}

/**
 * Creates a simplified Für Elise opening snippet.
 * @returns {Midi}
 */
function createFurEliseMidi() {
  const midi = new Midi();
  midi.name = 'Für Elise';
  midi.header.setTempo(72);

  const track = midi.addTrack();
  track.name = 'Melody';

  const eighth = 60 / 72 / 2; // ~0.417s at 72 BPM
  const quarter = eighth * 2;
  const dottedQuarter = eighth * 3;

  const opening = [
    { midi: 76, duration: eighth }, // E5
    { midi: 75, duration: eighth }, // D#5
    { midi: 76, duration: eighth }, // E5
    { midi: 75, duration: eighth }, // D#5
    { midi: 76, duration: eighth }, // E5
    { midi: 71, duration: eighth }, // B4
    { midi: 74, duration: eighth }, // D5
    { midi: 72, duration: dottedQuarter }, // C5
    { midi: 69, duration: quarter }, // A4
    { midi: 60, duration: eighth }, // C4
    { midi: 64, duration: eighth }, // E4
    { midi: 69, duration: eighth }, // A4
    { midi: 71, duration: quarter }, // B4
    { midi: 64, duration: eighth }, // E4
    { midi: 68, duration: eighth }, // G#4
    { midi: 71, duration: eighth }, // B4
    { midi: 72, duration: quarter }, // C5
  ];

  addTimedNotes(track, opening, 0);
  return midi;
}

mkdirSync(outputDir, { recursive: true });

const twinkle = createTwinkleMidi();
writeFileSync(join(outputDir, 'twinkle.mid'), Buffer.from(twinkle.toArray()));

const furElise = createFurEliseMidi();
writeFileSync(join(outputDir, 'fur-elise.mid'), Buffer.from(furElise.toArray()));

console.log('Generated public/songs/twinkle.mid');
console.log('Generated public/songs/fur-elise.mid');
