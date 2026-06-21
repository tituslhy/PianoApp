/**
 * One-off transcription script: converts a Virtual Piano letter-notation
 * sheet for "No Batidão" into a MIDI file for the follow-along catalogue.
 *
 * Run: node scripts/transcribe-no-batidao.mjs
 */
import tonejsMidi from '@tonejs/midi';

const { Midi } = tonejsMidi;
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, '..', 'public', 'songs');

// Virtual Piano (virtualpiano.net) letter -> MIDI note number map.
// Lowercase/digits = white keys, uppercase/shift-symbols = black keys (sharps).
// Four keyboard rows = four consecutive octave bands.
const NOTE_MAP = {
  // Row 1 (digits) - C3..E4
  '1': 48, '2': 50, '3': 52, '4': 53, '5': 55, '6': 57, '7': 59, '8': 60, '9': 62, '0': 64,
  '!': 49, '@': 51, $: 54, '%': 56, '^': 58, '*': 61, '(': 63,
  // Row 2 (qwertyuiop) - F4..A5
  q: 65, w: 67, e: 69, r: 71, t: 72, y: 74, u: 76, i: 77, o: 79, p: 81,
  Q: 66, W: 68, E: 70, T: 73, Y: 75, I: 78, O: 80, P: 82,
  // Row 3 (asdfghjkl) - B5..C7
  a: 83, s: 84, d: 86, f: 88, g: 89, h: 91, j: 93, k: 95, l: 96,
  S: 85, D: 87, G: 90, H: 92, J: 94,
  // Row 4 (zxcvbnm) - D7..C8
  z: 98, x: 100, c: 101, v: 103, b: 105, n: 107, m: 108,
  Z: 99, C: 102, V: 104, B: 106,
};

const SHEET = `
[5w]-w y [5tw]-[5w]E [5wy]
t [5w] [5Ew]-[(@E] t[(@]E [(@e]
[(@w] [(@] [(@w] y [8t]-[8E]E [8y]
t [8]E[8E]-[29E]Et[29]E [29e]
w [29] [29w] [29w] [5wy]-[5w]w [5w]
y [5w] [5w] w [(@E] t[(@]E [(@e]
w [(@] [(@w] w [8y]-[8w]w [8w]
y [8w] [8w] w [29o]-[29]o [29o]
o [29] [29o] [29d] [5hsw]-[5vw]P [5dwz]
s [5lw] [5JPw] [5lw] [(@hP] s[(@v] P[(@pz]
o [(@l] [(@Jo] [(@dl] [8hs]-[8v]P [8dz]
s [8l] [8JP] [8l] [29hP] s[29v]P [29pz]
[oz] [29l] [29Jo] [29lo] [5dhw]-[5ovw]o [5owz]
d [5low] [5Jow] [5low] [(@hP] s[(@v]P [(@pz]
[oz] [(@l] [(@Jo] [(@lo] [8dh]-[8ov]o [8oz]
d [8lo] [8Jo] [8lo] [29w]-[29]w [29w]
w [29] [29w] [29y] [5t]-5E [5y]
t 5 [5E] 5 [@E] t@E [@e]
w @ [@w] [@y] [8t]-[8E]E [8y]
t 8E[8E] 8 [2E]Et2E [2e]
w 2 [2w] [2w] [5wy]-[5w]w [5w]
y [5w] [5w] w [(@E] t[(@]E [(@e]
[(@w] [(@] [(@w] w [8y]-[8w]w [8w]
y [8w] [8w] w [29o]-[29]o [29o]
o [29] [29o] [29d] [5hsw]-[5vw]P [5dwz]
s [5lw] [5JPw] l [(@hP] s[(@v] P[(@pz]
o [(@l] [(@Jo] [(@dl] [8hs]-[8v]P [8dz]
s [8l] [8JP] l [29hP] s[29v]P [29pz]
[oz] [29l] [29Jo] [29lo] [5dhw]-[5ovw]o [5owz]
d [5low] [5Jow] [lo] [(@hP] s[(@v]P [(@pz]
[oz] [(@l] [(@Jo] [(@lo] [8dh]-[8ov]o [8oz]
d [8lo] [8Jo] [lo] [29w]-[29]w [29w]
w [29] [29w] [29y] [5otw]-[5hw]E [5dwy]
t [5sw] [5EPw] s [(@Eo] t[(@h] E[(@de]
w [(@s] [(@Pw] [(@sy] [8ot]-[8h]E [8dy]
t [8s] [8EP] s [29Eo] t[29h]E [29de]
[dw] [29s] [29Pw] [29sw] [5owy]-[5hw]w [5dw]
y [5sw] [5Pw] [sw] [(@Eo] t[(@h]E [(@de]
[dw] [(@s] [(@Pw] [(@sw] [8oy]-[8hw]w [8dw]
y [8sw] [8Pw] [sw] [29o]-[29]o [29o]
o [29] [29o] [29d] [5ow]-[hw][5w] [dw]
[5w] s [5Pw] s [(@o]-[(h][(@] [(d]
[(@] s [(@P] s [8o]-[8h][8] [8d]
[8] s [8P] s [29o]-[9h][29] [9d]
[29] s [29P] s [5ow]-[hw][5w] [dw]
[5w] s [5Pw] s [(@o]-[(h][(@] [(d]
[(@] s [(@P] s [8o]-[8h][8] [8d]
[8] s [8P] s [29o]-[9h][29] [9d]
[29] s [29P] s [5ow]
`;

/**
 * Parses one whitespace-delimited token into an ordered list of chords
 * (each chord is an array of MIDI note numbers played simultaneously).
 * Brackets group simultaneous notes; '-' is a no-op sub-event separator.
 * @param {string} token
 * @returns {number[][]}
 */
function parseToken(token) {
  const subEvents = [];
  let i = 0;
  while (i < token.length) {
    const ch = token[i];
    if (ch === '-') {
      i += 1;
      continue;
    }
    if (ch === '[') {
      const end = token.indexOf(']', i);
      const inner = token.slice(i + 1, end);
      const chord = [...inner].map((c) => NOTE_MAP[c]).filter((n) => n !== undefined);
      if (chord.length > 0) subEvents.push(chord);
      i = end + 1;
      continue;
    }
    const midi = NOTE_MAP[ch];
    if (midi !== undefined) subEvents.push([midi]);
    i += 1;
  }
  return subEvents;
}

/**
 * Parses the full sheet into an ordered list of chord sub-events.
 * @param {string} sheet
 * @returns {number[][]}
 */
function parseSheet(sheet) {
  const events = [];
  const tokens = sheet.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    events.push(...parseToken(token));
  }
  return events;
}

/**
 * Reduces each chord to its top (lead melody) note.
 * @param {number[][]} events
 * @returns {number[]}
 */
function toMelodyLine(events) {
  return events.map((chord) => Math.max(...chord));
}

/**
 * Shifts a melody by whole octaves so its average pitch centers within
 * the app's playable C4-C6 keyboard range (MIDI 60-84).
 * @param {number[]} notes
 * @returns {number[]}
 */
function transposeToRange(notes) {
  const average = notes.reduce((sum, n) => sum + n, 0) / notes.length;
  const shift = Math.round((72 - average) / 12) * 12;
  return notes.map((n) => Math.min(84, Math.max(60, n + shift)));
}

function createNoBatidaoMidi() {
  const tempo = 130; // estimated phonk/funk tempo; adjust to taste
  const eighth = 60 / tempo / 2;

  const events = parseSheet(SHEET);
  const melody = transposeToRange(toMelodyLine(events));

  const midi = new Midi();
  midi.name = 'No Batidão';
  midi.header.setTempo(tempo);

  const track = midi.addTrack();
  track.name = 'Melody';

  let time = 0;
  for (let i = 0; i < melody.length; i += 1) {
    track.addNote({
      midi: melody[i],
      time,
      duration: eighth * 0.9,
      velocity: 0.85,
    });
    time += eighth;
  }

  return { midi, noteCount: melody.length, duration: time, min: Math.min(...melody), max: Math.max(...melody) };
}

mkdirSync(outputDir, { recursive: true });

const { midi, noteCount, duration, min, max } = createNoBatidaoMidi();
writeFileSync(join(outputDir, 'no-batidao.mid'), Buffer.from(midi.toArray()));

console.log('Generated public/songs/no-batidao.mid');
console.log(`Notes: ${noteCount}, Duration: ${duration.toFixed(1)}s, MIDI range: ${min}-${max}`);
