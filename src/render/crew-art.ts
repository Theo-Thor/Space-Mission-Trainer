import type { Dir } from "../types";
import type { PaintActor } from "./draw";

// Earth facility and lunar base crew: recoloured copies of the player's uniform art (same 320 × 512 frame, feet at 160, 488).
const FRAME = { width: 320, height: 512, anchorX: 160, anchorY: 488, scale: 0.15 };
const VIEWS: Record<Dir, string> = { down: "front", up: "back", left: "left", right: "right" };
export const CREW_LOOKS = ["jun", "mara", "omar", "val", "chen", "patel", "leo", "nia", "crew", "crew2"] as const;
type CrewLook = typeof CREW_LOOKS[number];

const sprites = Object.fromEntries(CREW_LOOKS.map((look) => [look, Object.fromEntries(Object.entries(VIEWS).map(([dir, view]) => {
  const image = new Image();
  image.src = `/assets/crew/${look}-${view}.png`;
  return [dir, image];
}))])) as Record<CrewLook, Record<Dir, HTMLImageElement>>;

export function isCrewLook(look: string): look is CrewLook {
  return (CREW_LOOKS as readonly string[]).includes(look);
}

/** Returns false until the sprite has loaded so the shape fallback can draw instead. */
export function drawCrewArt(ctx: CanvasRenderingContext2D, actor: PaintActor, time: number): boolean {
  if (!isCrewLook(actor.look)) return false;
  const image = sprites[actor.look][actor.facing];
  if (!image.complete || image.naturalWidth !== FRAME.width || image.naturalHeight !== FRAME.height) return false;
  const breath = Math.sin(time * 2.1 + actor.bob);
  ctx.save();
  ctx.translate(actor.x, actor.y);
  ctx.fillStyle = "rgba(6, 10, 18, 0.4)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(1 + breath * 0.004, 1 + breath * 0.006);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, -FRAME.anchorX * FRAME.scale, -FRAME.anchorY * FRAME.scale, FRAME.width * FRAME.scale, FRAME.height * FRAME.scale);
  ctx.restore();
  return true;
}
