import type { Dir } from "../types";
import type { PaintActor } from "./draw";

const FRAME = { width: 320, height: 512, anchorX: 160, anchorY: 488, scale: 0.15 };
const VIEWS: Record<Dir, string> = { down: "front", up: "back", left: "left", right: "right" };
const sprites = Object.fromEntries(Object.entries(VIEWS).map(([direction, view]) => {
  const image = new Image();
  image.src = `/assets/riley-v1/riley-${view}.png`;
  return [direction, image];
})) as Record<Dir, HTMLImageElement>;

export function drawRileyArt(ctx: CanvasRenderingContext2D, actor: PaintActor): boolean {
  const image = sprites[actor.facing];
  if (!image.complete || image.naturalWidth !== FRAME.width || image.naturalHeight !== FRAME.height) return false;
  ctx.save();
  ctx.translate(actor.x, actor.y - (actor.seated ? 7 : 0));
  ctx.fillStyle = "rgba(6, 10, 18, 0.4)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, -FRAME.anchorX * FRAME.scale, -FRAME.anchorY * FRAME.scale,
    FRAME.width * FRAME.scale, FRAME.height * FRAME.scale);
  ctx.restore();
  return true;
}
