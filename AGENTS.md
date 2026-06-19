# Piano App — Agent Context

## What this project is
A browser-based piano app built with Vite + React + 
TypeScript + Tone.js. Users press keyboard keys to 
play piano sounds. Includes follow-along mode for 
example songs loaded from MIDI files.

## Stack
- Vite + React + TypeScript (client-side only, no SSR)
- Tone.js + Tone.Sampler for audio
- @tonejs/midi for MIDI parsing
- Tailwind CSS + Framer Motion for UI
- Deploy target: Vercel (static SPA)

## Project structure
src/
├── components/     # React UI components
├── audio/          # Tone.js engine and sampler
├── songs/          # MIDI files and song metadata
├── hooks/          # Custom React hooks
└── types/          # Shared TypeScript types

## Key conventions
- All code in TypeScript — no .js files in src/
- All functions and components need JSDoc comments
- Use named exports only — no default exports
- Tailwind for all styling — no inline styles, 
  no CSS modules
- Audio must initialise on first user gesture only
  (browser autoplay policy)

## Agentic behaviour
- Decompose large tasks into independent 
  subtasks wherever possible
- Keep each agent's working context focused 
  on one concern at a time
- Prefer parallel execution over sequential 
  when tasks don't depend on each other
- Examples of independent subtasks:
  - Audio engine vs UI components
  - Key mapping logic vs song parser
  - Individual song files vs player logic

## What NOT to do
- Do not add a backend, database, or auth in v1
- Do not use Next.js — this is a plain Vite SPA
- Do not use Web MIDI API yet
- Do not install game engines (Phaser etc.)
- Do not use any — use proper TypeScript types