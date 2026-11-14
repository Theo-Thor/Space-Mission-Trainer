# Project Selene — Chapter 1

A top-down chapter of a fictional lunar mission game for the NASA Space Apps Challenge 2026. The player registers, walks through a preparation facility on Earth, receives a radio, puts on a spacesuit, meets crewmate Riley Morgan, and boards the spacecraft.

After the crew is seated and Mission Control authorizes launch, the Chapter 1 card appears. A 33-second animated flight follows: countdown, liftoff, booster separation, the burn toward the Moon, the coast, Earthrise through the craft window, lunar orbit, and a powered descent to Selene Base at the lunar south pole, ending with a pull-back over the base and a touchdown card. Seven real NASA figures appear on screen during the flight; see `docs/SCIENCE.md`.

This facility, crew, spacecraft, Selene Base, and the year 2048 are fictional. They are not NASA missions or certified hardware. See `docs/SCIENCE.md`.

## Run

Requires Node.js 22 or newer. This project was built with Node.js 24.

```powershell
npm install
npm run dev
```

Open http://127.0.0.1:5173/

Production build:

```powershell
npm run build
npm run preview
```

The preview server prints its local URL. The checked build completed with `npm run build`.

## Controls

- W A S D or arrow keys — move
- E — talk or use the nearest object
- Enter or Space — continue dialogue
- Click the dialogue panel — continue dialogue
- Esc or the Skip button — skip the flight sequence

Restart Chapter returns to registration. The last astronaut name is kept in this browser.

## Opening cinematic

`cinematics/` is a HyperFrames title card. The rendered file is `public/cinematics/before-the-launch.mp4` (8 seconds). The game plays it on startup. Skip closes it. If the file is missing or cannot play, registration still works.

To render it again:

```powershell
cd cinematics
npx hyperframes render -o ../public/cinematics/before-the-launch.mp4 --quality draft --fps 30 --workers 2
```

HyperFrames needs Node.js 22+, FFmpeg, and Chrome. Those were already available on this machine. The HyperFrames agent skills were not installed. The composition follows the local scaffold in `cinematics/AGENTS.md`.

## Docs

- `docs/TECHNICAL.md` — architecture
- `docs/SCIENCE.md` — what is real, what is fictional, and what data is not in this chapter yet
