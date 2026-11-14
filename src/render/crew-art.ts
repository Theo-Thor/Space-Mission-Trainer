import type { Dir, Look } from "../types";
import type { PaintActor } from "./draw";

const FRAME = { width: 320, height: 512, anchorX: 160, anchorY: 488, scale: 0.15 };
const VIEWS: Record<Dir, string> = { down: "front", up: "back", left: "left", right: "right" };
const CREW = ["val", "chen", "patel", "leo", "nia", "crew", "crew2"] as const;
type CrewLook = (typeof CREW)[number];

function load(look: CrewLook): Record<Dir, HTMLImageElement> {
  return Object.fromEntries(Object.entries(VIEWS).map(([direction, view]) => {
    const image = new Image();
    image.src = `/assets/crew/${look}-${view}.png`;
    return [direction, image];
  })) as Record<Dir, HTMLImageElement>;
}

const sprites = Object.fromEntries(CREW.map((look) => [look, load(look)])) as Record<CrewLook, Record<Dir, HTMLImageElement>>;

function isCrew(look: Look): look is CrewLook {
  return (CREW as readonly string[]).includes(look);
}

/** Idle crew views. Returns false when a PNG is missing or the wrong size. */
export function drawCrewArt(ctx: CanvasRenderingContext2D, actor: PaintActor, time: number): boolean {
  if (!isCrew(actor.look)) return false;
  const image = sprites[actor.look][actor.facing];
  if (!image.complete || image.naturalWidth !== FRAME.width || image.naturalHeight !== FRAME.height) return false;

  const gait = actor.gait ?? (actor.walking ? 1 : 0);
  const breath = Math.sin(time * 2.1 + actor.bob) * (1 - gait);
  ctx.save();
  ctx.translate(actor.x, actor.y);
  ctx.fillStyle = "rgba(6, 10, 18, 0.4)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, -Math.abs(Math.sin(actor.walkPhase)) * gait * 0.9 + (actor.seated ? 8 : 0));
  ctx.rotate(actor.lean ?? 0);
  ctx.scale(1 + breath * 0.004, 1 + breath * 0.006);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, -FRAME.anchorX * FRAME.scale, -FRAME.anchorY * FRAME.scale,
    FRAME.width * FRAME.scale, FRAME.height * FRAME.scale);
  ctx.restore();
  return true;
}
