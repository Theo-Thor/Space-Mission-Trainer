# Animation guidelines — Phase 1

The game remains TypeScript and Canvas 2D with no runtime animation dependency. The player uses approved transparent directional artwork; NPCs use the existing shapes. Controls, actor interactions and mission progression are preserved.

## Relevant files and architecture

- `src/systems/animation.ts`: reusable CharacterAnimator and Motion interface; no Canvas dependency.
- `src/systems/doors.ts`: reusable AutomaticDoor, actorFootprint, overlaps and doorPanels. Rendering and collision consume identical panel geometry.
- `src/game.ts`: owns animator and door instances, updates sensors before movement and animation after player/NPC/scripted movement, and checks panels alongside existing map collisions.
- `src/render/draw.ts`: routes the player to the artwork renderer and retains shape art for NPCs and the missing-image fallback.
- `src/render/player-art.ts`: preloads the eight approved PNGs, draws them at the shared foot anchor, and blends outfits using the existing suitBlend signal.
- `public/assets/astronaut-v2/`: approved uniform/spacesuit art, manifest, source sheet and prompts.
- `src/content/world.ts`: existing doorway definitions (unchanged).
- `tests/animation.cjs`: dependency-free Node assertions using the existing TypeScript development dependency.

## Character states and timing

Idle uses a 2.1 radians/second breathing rhythm: less than half a world unit of chest lift and under one percent torso scaling. Feet and ground shadows stay anchored. Walking uses a 112-world-unit full stride cycle, opposite arm/leg movement, four existing facing views, and less than one unit of body lift. Side-facing characters mirror the same geometry. Back views hide face/visor and chest badge.

The above procedural limb motion applies to shape-rendered NPCs and the player fallback. The player now has four illustrated walk frames per direction in each outfit, with distinct arm/leg poses. `uniform-walk.png` and `spacesuit-walk.png` are 1280 × 2048 atlases: four columns of stepping frames and rows down, up, left, right. Each cell uses the existing 320 × 512 size and (160, 488) foot anchor. The existing distance-driven phase chooses the frame, giving about 8.2 frames/second at 230 world units/second. The 90 ms gait envelope blends idle into walking and back using a reusable canvas, while the shadow stays on the ground. Missing walk atlases retain the idle artwork. NPC identities and existing animation remain unchanged.

Walking art was generated from the approved source sheet; the original generated sheets and exact prompts are alongside the atlases. `tests/package-walk-art.ps1` reproducibly slices and aligns the frames by head center and foot baseline. These are four-frame demo cycles; additional in-between frames can improve smoothness later. The artwork review page also plays all eight directional cycles.

Player frames are 320 × 512, rendered at 0.15 scale with the foot anchor (160, 488) mapped to the actor position. Uniform and suit preloads start once at module initialization. Missing, invalid or pending art returns control to the original shape renderer. Direction changes select the matching image without mirroring clothing details. The equipment sequence's existing 0–1 suitBlend crossfades both outfits on a reusable offscreen canvas with additive premultiplied alpha; no story timing changes are needed.

Pass seconds to update. Phase is radians and is advanced from actual displacement, including slower NPC walking. Animation runs only when movement succeeds; pushing a wall does not produce a walk cycle. The 90 ms exponential envelope settles limbs into idle without resetting phase. Small lateral posture lean eases during turns; facing changes immediately to preserve control responsiveness. No movement easing is applied to physics.

Call track(actor) after constructing or teleporting an actor. The animator also rejects displacement exceeding the supported 240 units/second plus a one-unit tolerance to avoid treating accidental jumps as steps. Increase that bound if future gameplay introduces faster movement. Motion objects must retain identity across updates; render copies are fine. All existing NPCs share the utility. Do not separately increment walkPhase in controllers.

## Automatic doors

Only `to-reception` is enabled for Phase 1. Other facility openings and the story-controlled spacecraft hatch retain their existing behavior. The current map dimensions are unchanged.

Each instance owns openness (0 closed to 1 open) and a hold timer. A rectangular sensor extends 120 units beyond the doorway on every side and includes the player's existing 28 by 18 collision footprint and NPC footprints. Panels open over 0.42 seconds. Once all occupants leave, the door waits 0.65 seconds and closes over 0.65 seconds. Re-entry reverses closing immediately. Proposed closing panels are checked against occupants before applying their positions. Occupancy continues to hold doors open during dialogue or suit actions.

Two panels retract toward opposite jambs along the doorway's long axis. The same rectangles are drawn and checked for collision; partially open doors cannot be walked through except where there is actual clearance. Cyan indicates fully open; orange indicates closed or moving. Motion is linear so reversal preserves position and speed has a predictable bound.

To enable another existing doorway, include its id in Game's automaticDoors selection. Both horizontal and vertical definitions work without new drawing or collision code. Keep door updates before movement and include every moving occupant in the sensor list. Sensor range should exceed maximum travel during opening plus the footprint margin. Scripted movement currently remains separate from player collision and must be checked if future NPC routes cross new doors.

## Validation and limitations

Run `node tests/animation.cjs` and `npm run build`. Tests cover both axes, twenty repeated open/close cycles, sustained occupancy, delayed closing, re-entry reversal, full-speed crossing without panel overlap, frame-rate-independent stride, stopping and teleport rejection. Production TypeScript/Vite build passes.

After building, `node tests/player-art-browser.cjs` runs the production game in an isolated installed Chrome via its debugging protocol, without browser dependencies. It checks eight rendered views, keyboard movement/stopping, wall/door collision, suit transition, radio pickup, NPC dialogue progression, Riley's path, chapter completion and a missing-art fallback. It writes screenshots to a unique system temporary folder. Set SELENE_CHROME if Chrome is installed somewhere other than the default Windows path. Direction silhouettes change immediately; posture eases between movement states. The demo retains its existing discrete movement collision scheme.

HyperFrames is configured in the separate `cinematics/` project for the title card, with a pinned npx invocation. No standalone HyperFrames command was found on PATH. Interactive animations use Canvas; no HyperFrames dependency was installed and no cinematic was generated.
