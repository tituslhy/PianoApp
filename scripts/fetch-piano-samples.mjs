/**
 * One-off script to vendor the Salamander Grand Piano samples used by
 * src/audio/engine.ts into the repo, so the PWA can run fully offline
 * instead of fetching samples from the tonejs.github.io CDN at runtime.
 * Run: node scripts/fetch-piano-samples.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, '..', 'public', 'audio', 'salamander');

const SAMPLE_BASE_URL = 'https://tonejs.github.io/audio/salamander/';

/** Exact filenames from src/audio/engine.ts's SAMPLER_URLS values. */
const SAMPLE_FILENAMES = [
  'A0.mp3',
  'C1.mp3',
  'Ds1.mp3',
  'Fs1.mp3',
  'A1.mp3',
  'C2.mp3',
  'Ds2.mp3',
  'Fs2.mp3',
  'A2.mp3',
  'C3.mp3',
  'Ds3.mp3',
  'Fs3.mp3',
  'A3.mp3',
  'C4.mp3',
  'Ds4.mp3',
  'Fs4.mp3',
  'A4.mp3',
  'C5.mp3',
  'Ds5.mp3',
  'Fs5.mp3',
  'A5.mp3',
  'C6.mp3',
  'Ds6.mp3',
  'Fs6.mp3',
  'A6.mp3',
  'C7.mp3',
  'Ds7.mp3',
  'Fs7.mp3',
  'A7.mp3',
  'C8.mp3',
];

/**
 * Downloads a single sample file from the Salamander CDN and writes it to disk.
 * @param {string} filename - e.g. "A0.mp3".
 * @returns {Promise<void>}
 */
async function downloadSample(filename) {
  const url = `${SAMPLE_BASE_URL}${filename}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  writeFileSync(join(outputDir, filename), Buffer.from(arrayBuffer));
  console.log(`Downloaded ${filename}`);
}

mkdirSync(outputDir, { recursive: true });

for (const filename of SAMPLE_FILENAMES) {
  await downloadSample(filename);
}

console.log(`Downloaded ${SAMPLE_FILENAMES.length} piano samples to public/audio/salamander/`);
