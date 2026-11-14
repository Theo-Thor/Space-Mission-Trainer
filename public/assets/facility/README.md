# Selene facility environment kit

Integrated illustrated props for all six existing rooms. The built-in image-generation tool produced the reception concept and a twelve-object atlas. `mockup-prompt.txt`, `kit-prompt.txt` and `cleanup-prompt.txt` preserve the exact prompts. The final cleanup removes background halos so the assets work on dark floors.

`reception-concept.png` is a visual target, not a flattened game background. `kit-source.png` is the final transparent master. The individual desk, seat, plant, console, locker, storage, table, board, hatch, arch, platform and moon PNGs are tightly extracted with `tests/package-facility-art.ps1`. Run the script from the repository to reproduce those files; it uses the Windows drawing library and adds no project dependency.

## Integration

- `src/render/facility-art.ts` loads the props once, draws shadows and interactive status overlays, and caches wall/floor artwork separately for each room.
- `src/render/draw.ts` keeps the existing depth ordering and uses viewport culling for rooms, props and actors. The original shape renderer remains the fallback while an image is unavailable.
- `src/content/world.ts` remains the authority for map positions, collision rectangles, interaction anchors and paths. It was not changed for this visual pass.

Walls stay within the existing 28-unit boundaries. Floors have large slabs, service covers, furniture insets, restrained room numbers and reception insignia. Door thresholds use the existing horizontal/vertical axes; automatic panel positions still come from the collision system. Decorative door frames do not introduce extra blockers.

Props share upper-left illumination, navy outlines, ivory shells, cyan screens and orange details. The bottom of each sprite aligns to the original prop rectangle's lower edge, and its raised portion extends upward. Some sprites are fitted to the existing footprints, so their apparent proportions vary slightly across rooms. Waiting seats repeat in modules across longer benches. The communications pickup uses a display workbench and a removable radio overlay. Spare suits remain in the lockers after equipment preparation, with a completion indicator. The spacecraft hatch retains its existing open/closed story signal.

## Verification and limits

`npm run build`, `node tests/animation.cjs`, and `node tests/player-art-browser.cjs` cover build/type checking, repeated doors, all environment images, six browser room captures, character animation, movement, collision, equipment and chapter completion. The browser script records frame timing and saves screenshots to a unique temporary directory. Headless/software-rendering timings are machine-dependent and are not a hardware performance guarantee.

The new artwork does not replace NPC designs. The original NPC silhouettes remain a separate visual limitation. The reception concept is an art-direction reference; the game implementation uses modular assets and preserves the playable map instead of reproducing the concept pixel for pixel.
