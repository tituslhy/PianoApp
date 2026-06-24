# PWA Conversion Plan

## Decisions (locked in)

- **Offline scope:** everything, including piano sound — no network needed after first visit.
- **Audio samples:** vendor the ~29 Salamander piano mp3s into the repo (`public/audio/salamander/`) instead of relying on the `tonejs.github.io` CDN at runtime.
- **Fonts:** self-host Inter (drop the Google Fonts `<link>` tags in `index.html`).
- **Icons:** generate the required PNG manifest icons from the existing `public/favicon.svg` gradient design.
- **Update strategy:** service worker auto-updates silently (`registerType: 'autoUpdate'`), no "new version available" prompt UI.
- **Tooling:** `vite-plugin-pwa` with the `generateSW` (Workbox) strategy — no hand-rolled service worker.
- **Manifest defaults** (not separately discussed, low-risk): `display: 'standalone'`, `theme_color: '#6366f1'` (existing accent), `background_color: '#0f0f14'` (existing dark bg), `start_url`/`scope: '/'`.

## Task sequence

Same number = can be done in parallel (no shared file/dependency conflicts); letter suffix denotes the parallel branch. A task may only start once all of its numerically-lower dependencies are complete.

### Task 1 — Install dependencies ✓
- Add devDependencies: `vite-plugin-pwa`, `sharp` (SVG→PNG rasterization for icons), `@fontsource/inter` (self-hosted font package).
- No parallel split — single `package.json`/lockfile change.
- **Depends on:** nothing.

### Task 2A — Vendor piano samples locally ✓
- New script `scripts/fetch-piano-samples.mjs` downloads the 29 sample files from `https://tonejs.github.io/audio/salamander/` into `public/audio/salamander/`.
- Edit `src/audio/engine.ts`: change `SALAMANDER_BASE_URL` from the CDN URL to `/audio/salamander/`.
- **Depends on:** Task 1.

### Task 2B — Self-host the Inter font ✓
- Remove the three Google Fonts `<link>` tags from `index.html` (preconnects + stylesheet).
- Import `@fontsource/inter` weights 400/500/600/700 (e.g. in `src/main.tsx` or `src/index.css`).
- **Depends on:** Task 1.

### Task 2C — Generate PWA icons ✓
- New script `scripts/generate-pwa-icons.mjs` rasterizes `public/favicon.svg` into:
  - `public/pwa-192x192.png`
  - `public/pwa-512x512.png`
  - `public/pwa-maskable-512x512.png` (rendered with safe-zone padding for maskable display)
- Run the script to produce the actual files.
- **Depends on:** Task 1.

> Tasks 2A, 2B, 2C touch disjoint files (`engine.ts` / `index.html`+font import / new icon files) — safe to parallelize.

### Task 3 — Configure `vite-plugin-pwa` ✓
- Edit `vite.config.ts`: add the `VitePWA` plugin with:
  - `registerType: 'autoUpdate'`
  - `manifest`: name/short_name/description, `theme_color: '#6366f1'`, `background_color: '#0f0f14'`, `display: 'standalone'`, `start_url`/`scope: '/'`, `icons` referencing the 3 files from Task 2C.
  - `workbox.globPatterns` extended to include `mp3` and `woff2` (defaults only cover `js,css,html,ico,png,svg`) so the vendored samples and fonts get precached.
- Edit `index.html`: add `<link rel="apple-touch-icon">`, `apple-mobile-web-app-capable`, and `theme-color` meta tags for iOS homescreen support.
- **Depends on:** 2A, 2B, 2C (needs final filenames/extensions to reference).

### Task 4 — Register the service worker ✓
- Edit `src/main.tsx`: import `virtual:pwa-register` and call `registerSW()` with no update-prompt UI (matches the silent auto-update decision).
- **Depends on:** Task 3.

### Task 5A — Build/lint verification ✓
- Run `npm run build` and `npm run lint`; fix any TS/ESLint issues introduced by the new scripts or `vite.config.ts` changes.
- **Depends on:** Task 4.

### Task 5B — Manual offline + installability verification ✓
- `npm run preview` → DevTools Application tab: manifest valid, icons render, service worker registered/activated.
- Run a Lighthouse PWA audit.
- DevTools Network → Offline, reload: confirm app shell loads, song selection works, all 3 songs play with sound, fonts render as Inter (no fallback flash).
- Check "Add to Home Screen" prompt/icon.
- **Depends on:** Task 4 (runs in parallel with 5A — independent checks).

### Task 6 — Update CLAUDE.md commands list ✓
- Add the two new scripts (`scripts/fetch-piano-samples.mjs`, `scripts/generate-pwa-icons.mjs`) to the `## Commands` section, matching the existing `generate-midi.mjs` convention.
- **Depends on:** 2A, 2C (script names must be final).
