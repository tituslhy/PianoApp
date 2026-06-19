# Piano App

A browser-based piano built with Vite, React, TypeScript, Tone.js, Tailwind CSS, and Framer Motion.

## Features

- **2+ octaves** (C4–C6) with QWERTY labels on mapped keys
- **Real piano samples** via Tone.Sampler (Salamander Grand Piano)
- **Framer Motion** key press animations
- **Follow-along mode** with amber highlights — play Twinkle Twinkle or Für Elise
- **Wait-for-correct-key** — the song pauses until you press the highlighted note

## Keyboard mapping

| Keys | Notes |
|------|-------|
| `A S D F G H J` | C4–B4 (white) |
| `W E T Y U` | C#4–A#4 (black) |
| `K L ; ' \ Z X` | C5–B5 (white) |
| `O P [ ] /` | C#5–A#5 (black) |
| `C` | C6 |

## Development

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Stack

- Vite + React + TypeScript
- Tone.js + @tonejs/midi
- Tailwind CSS v4 + Framer Motion
- Deploy target: Vercel (static SPA)
