/**
 * One-off script to generate PWA manifest icons from the brand mark.
 * Reads public/favicon.svg (a 32x32-viewBox SVG with a full-bleed gradient
 * background) and rasterizes it into the PNG sizes a web app manifest needs.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const faviconPath = join(publicDir, 'favicon.svg');

/** Gradient start color from favicon.svg, used as the maskable padding fill. */
const BRAND_COLOR = '#6366f1';

/**
 * Renders favicon.svg directly at the given square size.
 * @param {Buffer} svgBuffer
 * @param {number} size - output width/height in pixels
 * @returns {Promise<Buffer>} PNG buffer
 */
async function renderPlainIcon(svgBuffer, size) {
  return sharp(svgBuffer).resize(size, size).png().toBuffer();
}

/**
 * Renders a maskable icon: the SVG scaled down to fit within the safe zone,
 * then centered on a square canvas filled with the brand color so OS-applied
 * circle/squircle masks never clip the artwork.
 * @param {Buffer} svgBuffer
 * @param {number} canvasSize - final square canvas size in pixels
 * @param {number} padding - padding on each side in pixels
 * @returns {Promise<Buffer>} PNG buffer
 */
async function renderMaskableIcon(svgBuffer, canvasSize, padding) {
  const innerSize = canvasSize - padding * 2;
  const innerPng = await sharp(svgBuffer).resize(innerSize, innerSize).png().toBuffer();

  return sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: BRAND_COLOR,
    },
  })
    .composite([{ input: innerPng, top: padding, left: padding }])
    .png()
    .toBuffer();
}

const svgBuffer = readFileSync(faviconPath);

const icon192 = await renderPlainIcon(svgBuffer, 192);
await sharp(icon192).toFile(join(publicDir, 'pwa-192x192.png'));
console.log('Generated public/pwa-192x192.png');

const icon512 = await renderPlainIcon(svgBuffer, 512);
await sharp(icon512).toFile(join(publicDir, 'pwa-512x512.png'));
console.log('Generated public/pwa-512x512.png');

const maskableIcon512 = await renderMaskableIcon(svgBuffer, 512, 51);
await sharp(maskableIcon512).toFile(join(publicDir, 'pwa-maskable-512x512.png'));
console.log('Generated public/pwa-maskable-512x512.png');
