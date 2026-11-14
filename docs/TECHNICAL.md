# Technical notes

## Stack

Vite 6 and TypeScript, with no runtime libraries. The facility is drawn on one canvas. Registration, dialogue, radio, objectives, the suit checklist, and the ending are HTML and CSS.

A game engine was not added. The chapter is one small map, and the interface is mostly text. Canvas plus HTML keeps the dialogue system easy to read and the install small.

## Layout

- `src/main.ts` starts the page, registration, and the cinematic.
- `src/game.ts` owns the loop, movement, collisions, and story actions.
- `src/systems/mission.ts` is the only place that changes chapter progress.
- `src/systems/dialogue.ts` types and advances lines. It does not know the plot.
- `src/systems/radio.ts` queues transmissions and hides them while a conversation is open.
- `src/content/story.ts` holds the script.
- `src/content/world.ts` holds rooms, people, and furniture.
- `src/render/draw.ts` draws the facility and characters.
- `src/render/player-art.ts` draws the approved directional player PNGs and the outfit transition; missing art falls back to shapes.
- `src/render/facility-art.ts` renders the illustrated equipment kit, cached wall/floor surfaces and doorway frames. See `public/assets/facility/README.md` for asset packaging and extension notes.
- `src/content/voyage.ts` holds the flight sequence timeline, phase labels, sound cues, and the sourced on-screen facts.
- `src/render/voyage-art.ts` draws the flight sequence on the same canvas. Scenes use a 1280 × 720 stage scaled to cover the screen; the phase panel, mission clock, descent readout and fact card are drawn in screen space. `voyage-preview.html` (dev server only) plays the sequence with a scrub bar; `?t=12.5` shows a still frame.
- `src/ui/surface.ts` updates the HTML panels.

## Progress

The chapter moves through briefing, communications, radio pickup, suit preparation, meeting Riley, and boarding. Required actions cannot be completed out of order. Optional talks with Val Ortiz and Dr. Patel do not change the objective.

Riley walks a fixed two-point path. There is no pathfinding.

Aboard the spacecraft the player checks flight systems, verifies communications, and takes the seat. When Mission Control's final radio call (R007) finishes, `Game.finishChapter` marks the chapter complete and shows the Chapter 1 card. The flight sequence starts after 6 seconds or when the player presses Begin Launch. It runs for `VOYAGE_DURATION` (33.5 s), plays its sound cues from `CUES`, and ends on the touchdown card. Esc or Skip jumps to the end.

Refreshing the page starts the chapter again. The astronaut name is stored locally so the form can be prefilled. Progress is not restored, because a half-saved chapter could skip a conversation and lock the story.

## HyperFrames

The title card is a separate HTML composition. It is not the game engine. The game only plays the rendered MP4, and only if that file loads. `npx hyperframes check` passed with warnings about nested timeline elements. The draft render produced an 8 second, 432 KB MP4.

## Known limits

- The player uses illustrated PNG idle poses and four-frame directional walk cycles for both outfits. NPCs still use animated shapes.
- Sound is a few generated tones, with a mute button. There is no music. The flight sequence adds a filtered-noise launch rumble, countdown beeps, descent pulses, and a touchdown chime. Exterior space shots stay nearly silent, because sound does not travel in a vacuum.
- The reception doorway has a reusable automatic sliding door with panel collision. Other room openings remain decorative.
- `window.__SELENE__` exposes teleport, interact, snapshot, `voyage()` and `skipVoyage()` helpers for local testing.
