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
- `src/ui/surface.ts` updates the HTML panels.

## Progress

The chapter moves through briefing, communications, radio pickup, suit preparation, meeting Riley, and boarding. Required actions cannot be completed out of order. Optional talks with Val Ortiz and Dr. Patel do not change the objective.

Riley walks a fixed two-point path. There is no pathfinding.

Refreshing the page starts the chapter again. The astronaut name is stored locally so the form can be prefilled. Progress is not restored, because a half-saved chapter could skip a conversation and lock the story.

## HyperFrames

The title card is a separate HTML composition. It is not the game engine. The game only plays the rendered MP4, and only if that file loads. `npx hyperframes check` passed with warnings about nested timeline elements. The draft render produced an 8 second, 432 KB MP4.

## Known limits

- Characters are drawn from shapes, not illustrated sprites.
- Sound is a few generated tones, with a mute button. There is no music.
- The openings between rooms are wide, so the player is not stopped by a narrow doorway.
- `window.__SELENE__` exposes teleport, interact, and snapshot helpers for local testing.
