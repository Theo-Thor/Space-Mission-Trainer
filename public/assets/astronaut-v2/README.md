# Astronaut artwork v2 — approved and integrated

Eight original transparent RGBA PNG assets, generated with the built-in image-generation tool. The exact prompts are in `generation-prompt.txt` and `refinement-prompt.txt`; the final generated master is `source-sheet.png` (1536 × 1024). The refinement made the uniform's orange shoulder panels consistent on both shoulders. No paid API integration or new dependencies were added.

Open `../../character-preview/index.html` directly in a browser, or run the existing Vite server and visit `/character-preview/`. The preview works with file URLs as well as HTTP; it shows native pixels and approximate gameplay scale. Its status checks that all eight PNGs decode at the expected dimensions. Background controls reveal alpha edges; game-scale buttons cover the existing camera's 0.75–1.25 zoom range.

## Files and alignment

`uniform-{front,back,left,right}.png` and `spacesuit-{front,back,left,right}.png` are each 320 × 512. All share a foot anchor at (160, 488). Front maps to game direction `down`, back to `up`. The manifest records source cells, integer translation and visible bounds. Packaging only extracts and translates source pixels; it does not redraw or resample the generated art.

At 0.15 scale the frame is 48 × 76.8 world units, with visible uniform height approximately 70 and suited height 72.5. This fits the current roughly 38 × 72 character envelope with a modest suit-size increase. The renderer places the frame's top-left at `(actor.x - 24, actor.y - 73.2)` before posture transforms. The visual anchor does not define collision geometry.

## Design and future animation

The same swept-haired astronaut appears in a tailored navy jacket and trousers, then in a matching ivory suit with orange and cyan details. The dark visor retains a subdued view of the same face. The views use elevated adventure-game perspective, with visible head and shoulder tops.

The original eight files are flattened raster idle views. The integrated `uniform-walk.png` and `spacesuit-walk.png` atlases add four illustrated stepping frames for each direction (32 new poses total). Atlas size is 1280 × 2048 with 320 × 512 cells; rows are front, back, left, right and columns are sequential walk phases. Source sheets and prompts are saved as `*-walk-source.png` and `*-walk-prompt.txt`. Packaging is reproducible with `tests/package-walk-art.ps1`. Keep the canvas size, foot anchor, lighting, anatomy, patch and outfit colors consistent in future frames.

The uniform's crescent badge sits on the left chest; the suit also repeats the crescent on its upper sleeves. Four-frame cycles provide a compact demo animation; extra in-between frames can refine the cadence later.

## Integration status

Approved by the user and integrated for the player through `src/render/player-art.ts`. The existing suitBlend selects/blends the outfits; facing chooses the atlas row and distance-driven walkPhase selects the stepping frame. The gait envelope blends back to idle when movement stops. NPC artwork, controls, collisions, dialogue, story and mission logic are unchanged. Missing idle images use the shape renderer; missing walk atlases retain the idle artwork.

## Verification

Opened the standalone preview in installed headless Chrome. All eight assets decoded successfully at 320 × 512 in both preview rows (16 image elements). Inspected the browser screenshot at native and game size. The captured review is `../../character-preview/review.png`. This was an artwork-preview check, not a gameplay test.

The later integration check is `tests/player-art-browser.cjs`, run against the production build. It verifies directional rendering and movement, collisions, the equipment transition, chapter progression and fallback when one PNG fails. The earlier review screenshot retains the original approval-stage banner; the live preview reflects integration status.
