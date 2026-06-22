# Handoff — Octave-Shift Hotkeys, Play-Along Mode, Responsive Keyboard

**Date:** 2026-06-22
**Branch:** `feature/lacampanella`
**HEAD at handoff:** `b54e89f` (`feat: add SongPlaybackMode and generalize highlight state to a set`)
**Status:** Mid-implementation, executing via subagent-driven-development. 9 of 14 plan tasks complete and reviewed clean. Stopped before Task 10 due to approaching context limit.

This file is a snapshot for whoever (human or fresh agent session) picks this up next. Read this first, then the plan file, then the progress ledger.

---

## 1. Current Architecture

This is a React 19 + TypeScript + Vite piano app (Tone.js for audio/scheduling, Tailwind for styling, framer-motion for key-press animation). No backend, no test framework.

**Core data flow (before this session's work):**
- `src/audio/keyMap.ts` — physical-keyboard-key ↔ note-name mapping, and the on-screen keyboard's chromatic layout.
- `src/audio/engine.ts` — Tone.Sampler singleton (Salamander Grand Piano samples), `playNote`/`releaseNote`.
- `src/songs/parser.ts` — loads a `.mid` file into a `ParsedSong` (notes with time/duration/velocity).
- `src/songs/player.ts` — `SongPlayer` class: schedules notes on `Tone.Transport`, drives "follow-along" playback (pause + wait for correct keypress).
- `src/hooks/useAudio.ts`, `useKeyboard.ts`, `useSong.ts` → composed by `src/hooks/usePiano.ts` → consumed by `src/App.tsx`.
- `src/components/Keyboard.tsx` / `PianoKey.tsx` — on-screen keyboard rendering.
- `src/components/PlaybackControls.tsx` — Play/Pause/Stop + progress bar.
- `src/components/SongSelector.tsx` — song catalogue picker.

**What changed earlier this session (already committed, before the formal plan):**
- Added a new song, **La Campanella** (Liszt), via `src/songs/index.ts` + `public/songs/la-campanella.mid` (sourced from BitMidi).
- This song spans 6+ octaves (D#1–F#7), but the keyboard only covered C4–C6 and follow-along mode pauses-and-waits-for-keypress on every note — so it would have **deadlocked** on the first out-of-range note (~3s in, since there's no key to press). Fixed by extending the on-screen keyboard + sampler to **C1–C8** (commit `10b9508`).

**What this session's plan is building (in progress):** see `docs/superpowers/specs/2026-06-22-octave-shift-and-play-along-design.md` (approved spec) and `docs/superpowers/plans/2026-06-22-octave-shift-and-play-along.md` (14-task implementation plan, currently executing).

Three sub-features:
1. **Octave-shift hotkeys** — the keyboard is now 85 keys (C1–C8) but only 25 have physical-keyboard shortcuts. Solution: the same 25 keys keep fixed relative semitone offsets, resolved against a movable `baseOctave` (1–6), shiftable via Arrow Up/Down or on-screen buttons.
2. **Play-along mode** — a new auto-play mode alongside the existing follow-along: the app itself triggers the sampler on schedule (no pause-and-wait), with keys lighting up in sync. Built by finishing a half-built, previously-unused `waitForCorrectKey`-style branch already lurking in `SongPlayer`.
3. **Responsive keyboard sizing** — the 85-key keyboard was always overflowing/scrolling, even on desktop. Fixed by dropping the width floor above a 640px breakpoint so it always fits without scroll; below 640px (phone), unchanged scrollable behavior. Key labels hide below 36px key width (a graceful degradation, not a regression — see Known Gotchas).

---

## 2. Decisions Made and Why

These were explicitly discussed with the user (not unilateral calls) — see the brainstorming transcript earlier in this conversation for full context:

- **Hotkey scheme = octave-shift, not full remap.** A standard keyboard has ~47 usable keys; 25 are already spoken for. Rather than trying to cram 85 unique bindings (impossible) or leaving 60 keys mouse-only (user rejected), the chosen approach reuses the existing 25-key relative layout and shifts which absolute octave it points to. **Shift keys: Arrow Up/Down** (chosen over `-`/`=` — unused, no collision risk). **Indicator: yes**, with both a text label and clickable ↓/↑ buttons (buttons are necessary, not just nice-to-have, since touch-only devices have no arrow keys).
- **Play-along plays REAL audio automatically** (not a silent visual-only metronome) — user's explicit choice. This is why `SongPlayer` needed new `onAutoNoteStart`/`onAutoNoteEnd` callbacks wired to the actual audio engine, not just a UI-only change.
- **Unify `SongPlayer` into one class with a `mode` flag**, rather than a separate `AutoPlayer` class — recommended and accepted because the class already had an unused, half-built second constructor branch and a `waitForCorrectKey` flag nothing called; finishing that path was less duplication than writing a parallel scheduler.
- **Generalize highlight state from a single note to a set** (`highlightedNote: NoteName | null` → `highlightedNotes: NoteName[]`) — needed for play-along chords, and as a deliberate, approved side effect, this also fixes a latent bug where follow-along only ever visually highlighted the *first* note of a chord even though it internally waited for all of them.
- **Mode switching only allowed while stopped** (not mid-playback) — avoids ambiguous states like "paused mid-chord in follow mode, now switched to auto-play." Enforced in two places: `SongPlayer.setMode()` no-ops if playing/paused, and `useSong.setMode()` (the React-facing wrapper) also guards, so UI state and player state never disagree even if the disabled-button UI guard is somehow bypassed.
- **Play-along highlight gets a distinct color (teal)** from follow-along's existing amber — they mean different things ("this is sounding now" vs. "press this to continue").
- **Responsive breakpoint is viewport/container width (640px), not device detection.** "Aside from iPhone" was interpreted as "narrow phone-width viewports" generically — explicitly confirmed with the user, since real device detection is unreliable and this covers any narrow phone, not just iPhone.
- **Labels hide below 36px key width** rather than always rendering (and clipping/overflowing) or always hiding. This was an explicit choice — keys remain fully clickable even unlabeled, "like a real piano."
- **No test framework introduced.** This repo has zero automated tests (`package.json` has no test runner). Per explicit Global Constraint in the plan, all verification is `npm run build` (tsc type-check) + `npm run lint`, plus manual Playwright-MCP-driven browser checks at specific tasks. Do not add vitest/jest as part of this work — it's out of scope.

---

## 3. Remaining Tasks

Source of truth: `docs/superpowers/plans/2026-06-22-octave-shift-and-play-along.md` (read each task's full brief there before resuming — don't rely on this summary alone).

**Done and reviewed clean (commits `4b8111d..b54e89f`):**
- Task 1 — Dynamic base-octave support in `keyMap.ts`
- Task 2 — `useOctaveShift` hook
- Task 3 — `useKeyboard` accepts a dynamic key map
- Task 4 — Wire octave shift into `usePiano`
- Task 5 — `OctaveControl` component + `App.tsx` wiring
- Task 6 — Breakpoint-aware keyboard width
- Task 7 — `PianoKey` hides labels when narrow
- Task 8 — `Keyboard` computes and passes `showLabels`
- Task 9 — Types for play-along mode + multi-highlight (`SongPlaybackMode`, `highlightedNotes: NoteName[]`, `'auto-playing'` visual state)

**Not started — pick up here:**
- **Task 10 — `SongPlayer` mode toggle rewrite** (`src/songs/player.ts`, full-file replacement, code given verbatim in the plan). This is the biggest remaining task. After this task, `npm run build` is EXPECTED to still fail (only in `src/hooks/useSong.ts`, which still constructs `SongPlayer` the old way) — that's correct per the plan, not a regression.
- **Task 11 — `useSong` wires audio callbacks + mode** (`src/hooks/useSong.ts`, full-file replacement). After this, build is expected to fail only in `usePiano.ts` (calls `useSong()` with no args) — correct, not a regression.
- **Task 12 — Wire multi-highlight + mode through `usePiano`/`Keyboard`/`PianoKey`/`App`** (four files touched together in one task, because they only compile as one consistent unit — `usePiano` changes the shape it hands to `Keyboard`). This is where `npm run build && npm run lint` should go green again.
- **Task 13 — Mode toggle in `PlaybackControls` + `App.tsx` final wiring** (adds the Follow-Along/Play-Along UI toggle, disabled while playing/paused; wires `ensureAudioReady()` before play-along starts).
- **Task 14 — Full manual verification** (Playwright-MCP-driven: octave shift end-to-end, play-along audio+highlight sync on La Campanella, mode-toggle disabling while active, keyboard fit at multiple viewport widths). **After Task 14, still need to:** dispatch the final whole-branch code-reviewer (per `superpowers:requesting-code-review`), then run `superpowers:finishing-a-development-branch` to decide merge/PR/cleanup. Neither of those has happened yet.

**How to resume the subagent-driven-development loop:**
1. `cat .superpowers/sdd/progress.md` — confirms Tasks 1–9 are done; resume at Task 10.
2. Re-invoke `superpowers:subagent-driven-development` (or just follow its pattern manually): for each remaining task, run `scripts/task-brief docs/superpowers/plans/2026-06-22-octave-shift-and-play-along.md N`, dispatch an implementer subagent with that brief, then `scripts/review-package BASE HEAD` + dispatch a task-reviewer subagent, per the templates in `~/.claude/plugins/cache/claude-plugins-official/superpowers/6.0.3/skills/subagent-driven-development/`.
3. Model selection used so far: `haiku` for mechanical full-file-replacement tasks (1, 2, 3, 4, 6, 7, 9), `sonnet` for tasks needing manual browser verification/judgment (5, 8) and all task reviewers. Tasks 10–12 involve more cross-file judgment than 1–9; consider `sonnet` for the implementer on at least Task 10 and Task 12.

---

## 4. Known Bugs / Gotchas (not blockers, but worth knowing)

- **Label-hiding threshold (36px) means labels are hidden on most common desktop widths, not just small ones.** Independently verified: at 1920px viewport, computed white-key width is exactly 36px (boundary, labels just barely show); at 1600px it's ~30px (labels hidden). With 50 white keys, you need a roughly 1900px+ wide viewport before labels reappear in "fit" mode. This is **correct behavior per the approved design** (hide labels when too small to render legibly), not a bug — but the original plan document's Task 8 manual-check prose incorrectly predicted labels would be visible at 1600×900. If anyone re-reads that section of the plan, don't trust that specific prediction; trust the `>= 36px` logic in the code.
- **Play-along + extremely close-together notes can skip a beat.** Verified earlier (during the original La Campanella keyboard-range work, before this formal plan) that some of La Campanella's ornamental passages have notes as little as ~8ms apart. The follow-along player's pause-on-every-note design can occasionally skip pausing on one of two near-simultaneous notes due to Tone.js's scheduling lookahead. This is a pre-existing characteristic of the scheduler, not something introduced by this plan's work, and is not slated to be fixed by this plan.
- **`.claude/settings.local.json` shows as locally modified throughout this session** (permission allowlist entries auto-added by the harness as tools were approved). This is not part of the feature work — don't commit it as part of any task, and don't be alarmed that `git status` always shows it as dirty.
- **Minor doc nit (not fixed, not blocking):** `useKeyboard`'s JSDoc `@param options` comment (from Task 3) doesn't mention the new `keyMap` field it added. Cosmetic only.

---

## 5. Important Files

| File | Role |
|---|---|
| `docs/superpowers/specs/2026-06-22-octave-shift-and-play-along-design.md` | Approved design spec — the "why" and exact decisions. Read if a plan task seems ambiguous. |
| `docs/superpowers/plans/2026-06-22-octave-shift-and-play-along.md` | The 14-task implementation plan — the source of truth for exact code to write. |
| `.superpowers/sdd/progress.md` | Ledger of which tasks are done/reviewed. **Trust this over your own memory after any context loss.** |
| `.superpowers/sdd/task-N-brief.md`, `task-N-report.md`, `review-*.diff` | Per-task artifacts from tasks 1–9 (briefs, implementer reports, diff packages). Scratch files, git-ignored — regenerable via the scripts if missing. |
| `src/audio/keyMap.ts` | Octave-shiftable key↔note mapping (Task 1, done). |
| `src/hooks/useOctaveShift.ts` | New hook owning `baseOctave` state + arrow-key listener (Task 2, done). |
| `src/hooks/useKeyboard.ts` | Now takes `keyMap` as a param instead of a static import (Task 3, done). |
| `src/hooks/usePiano.ts` | Composes everything; touched in Task 4 (done) and will be touched AGAIN in Task 12 (not started). |
| `src/components/OctaveControl.tsx` | New "Keys: C4–C6" indicator + ↓/↑ buttons (Task 5, done). |
| `src/hooks/useKeyboardWidth.ts` | Breakpoint-aware sizing (Task 6, done). |
| `src/components/PianoKey.tsx` | `showLabels` prop added (Task 7, done); will need the `'auto-playing'` teal color treatment in Task 12 (not started). |
| `src/components/Keyboard.tsx` | `showLabels` wiring done (Task 8); still has the OLD singular `highlightedNote` prop — **will be rewritten in Task 12**, not yet touched for play-along. |
| `src/types/index.ts` | `SongPlaybackMode`, `'auto-playing'`, `highlightedNotes: NoteName[]` all added (Task 9, done). |
| `src/songs/player.ts` | **Not yet touched this plan** — still has the OLD dual-constructor `SongPlayer` and singular highlight tracking. This is Task 10. |
| `src/hooks/useSong.ts` | **Not yet touched this plan.** This is Task 11. |
| `src/components/PlaybackControls.tsx` | **Not yet touched this plan.** This is Task 13. |

---

## 6. Commands to Run

```bash
# Verify current state compiles (expected to FAIL right now — see below)
npm run build
npm run lint

# Start dev server for manual checks
npm run dev   # http://localhost:5173/

# Resume the plan from where it left off
cat .superpowers/sdd/progress.md
"$HOME/.claude/plugins/cache/claude-plugins-official/superpowers/6.0.3/skills/subagent-driven-development/scripts/task-brief" \
  docs/superpowers/plans/2026-06-22-octave-shift-and-play-along.md 10

# After an implementer finishes a task, generate the review package:
"$HOME/.claude/plugins/cache/claude-plugins-official/superpowers/6.0.3/skills/subagent-driven-development/scripts/review-package" <BASE_SHA> HEAD
```

**Expected current build state:** `npm run build` currently FAILS — this is intentional/in-progress, not a regression. As of HEAD (`b54e89f`, after Task 9), `src/hooks/usePiano.ts`, `src/hooks/useSong.ts`, and `src/songs/player.ts` all reference the old `highlightedNote`/old `SongPlayer` constructor shape that Task 9's type changes invalidated. Tasks 10–12 resolve this; build should be green again right after Task 12.

---

## 7. Assumptions

- **No automated test framework will be introduced.** Confirmed multiple times against the plan's Global Constraints. If a future task or reviewer suggests adding one, that's out of scope — flag it rather than doing it.
- **The user is the sole developer / approver** for this branch (`feature/lacampanella`); commits so far were made directly on this branch, no PR opened yet. Don't push or open a PR without asking — `finishing-a-development-branch` (after Task 14) is where that conversation happens.
- **Playwright MCP browser tools are available** and were used successfully throughout (`mcp__plugin_playwright_playwright__browser_*`) for all manual verification steps. Subagents were explicitly told they have access to these tools and used them successfully (Tasks 5, 8).
- **`git log`/the ledger are more trustworthy than conversation memory** if this session's context is lost or compacted — this is explicitly called out by the `subagent-driven-development` skill itself, and it's been followed throughout (each task's commit SHA is recorded immediately after review approval).
- **The implementer/reviewer subagent pattern from `subagent-driven-development` should continue to be used** for Tasks 10–14, not ad-hoc manual edits — this preserves the review-gate quality bar already established for Tasks 1–9.

---

## 8. Next Recommended Steps

1. **Resume immediately at Task 10** (`SongPlayer` mode toggle rewrite) using the subagent-driven-development pattern described above. This is the largest remaining task — consider `sonnet` rather than `haiku` for the implementer given its size and the number of behavioral edge cases (mode guarding, multi-note active-count tracking, stop-time cleanup) even though the plan gives complete code.
2. Continue sequentially through Tasks 11, 12, 13 — each depends on the prior one's exact interface, so don't skip ahead or parallelize them.
3. **Task 12 note:** the plan already correctly anticipates that `Keyboard.tsx` doesn't show a build error until Task 12 itself rewires its props — this was independently confirmed by a Task 9 reviewer. Don't be alarmed if intermediate build states between Tasks 10–11 don't match a naive file-by-file error count; trust the plan's stated expected-failure file lists over intuition.
4. **Task 14** requires a real browser session against the actual La Campanella song to verify play-along audio. Budget for this — it's the most involved manual-verification task in the plan (mode toggle, audio triggering, multi-width screenshots).
5. **After Task 14:** dispatch a final whole-branch code-reviewer (`superpowers:requesting-code-review`'s `code-reviewer.md` template) covering the FULL branch diff (`git merge-base main HEAD` as the base), not just the last task — this hasn't happened yet for any of the work in this branch, including the pre-plan La Campanella song addition.
6. **After the final review:** invoke `superpowers:finishing-a-development-branch` to decide whether this merges to `main`, becomes a PR, or needs further cleanup — do not assume; ask the user.
7. Clean up `.superpowers/sdd/*.md` and `*.diff` scratch files at the very end if desired (they're git-ignored working files, not part of the deliverable) — but keep `docs/superpowers/specs/` and `docs/superpowers/plans/` permanently, they're the durable record of why this was built this way.
