# Project Selene: Junior Astronaut

A lunar mission game for children aged 7–12, made for the NASA Space Apps Challenge 2026 ("Build a Junior Astronaut Mission Trainer").

1. **Earth:** register, walk through the Selene preparation facility, get a radio, suit up, meet crewmate Riley and board.
2. **Flight:** a 33-second animated Earth-to-Moon flight with NASA-sourced fact cards.
3. **Selene Base (lunar south pole, 2048):** explore the base and the open surface. Examine craters, a drill rig, solar masts, a boulder track, a seismometer and a rover; each gives a NASA fact in the always-visible Mission data panel.
4. **NEXUS:** a 3×3 decision cube in the Grand Hall. It rises out of the floor; ORBI, a small helper robot, explains it. Each side is a colony need (Energy, Signal, Water, Air, Shield, Food). Players turn layers **by dragging**; every turn needs one of **11 NEXUS keys** hidden on the surface. Opposite faces can be turned in either order, so the story branches and merges, and the 11th turn always solves the cube (2048). Rooms in the base dim when their need is low.
5. **Rover Rescue:** through the Rover Exit the view tilts into a side-scrolling EVA with real Moon gravity (1.62 m/s²): find 3 parts, survive a dark crater and a solar storm, repair the rover, drive it home.
6. **Finale:** NEXUS at 2048 plus the rover rescued gives "Junior Astronaut certified".

**Real NASA data:** `src/content/sky.ts` holds Earth and Sun elevation seen from 89.5° S on the Moon, every 6 hours through November 2048, from NASA JPL Horizons. It dates each NEXUS turn, draws the sky chart, and sets the Sun and Earth in the EVA sky. In that month the Sun never rises above 1.05° and Earth is above the horizon 46% of the time. See `docs/SCIENCE.md` for what is real and what is fictional.

**Demo menu:** the registration screen has *Demo · jump to: Launch, Moon base, NEXUS cube, Rover Rescue*.

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
- NEXUS: drag empty space to look around; drag a glowing layer the way its arrows flow to turn it; Esc to leave
- Rover Rescue: ← → or A D to move, Space to jump, E to repair

Restart Mission returns to registration. The last astronaut name is kept in this browser.

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
