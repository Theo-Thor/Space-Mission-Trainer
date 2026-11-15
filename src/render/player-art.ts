import type { Dir } from "../types";
import type { PaintActor } from "./draw";

// Matches the approved asset manifest: 320 × 512, feet at (160, 488).
const FRAME = { width: 320, height: 512, anchorX: 160, anchorY: 488, scale: 0.15 };
const VIEWS: Record<Dir, string> = { down: "front", up: "back", left: "left", right: "right" };
type Sprite = { image: HTMLImageElement; ready: boolean };

function loadOutfit(outfit: "uniform" | "spacesuit"): Record<Dir, Sprite> {
  return Object.fromEntries(Object.entries(VIEWS).map(([direction, view]) => {
    const image = new Image();
    const sprite: Sprite = { image, ready: false };
    image.onload = () => {
      sprite.ready = image.naturalWidth === FRAME.width && image.naturalHeight === FRAME.height;
      if (!sprite.ready) console.warn(`Unexpected player artwork dimensions: ${image.src}`);
    };
    image.onerror = () => console.warn(`Player artwork unavailable; using shape fallback: ${image.src}`);
    image.src = `/assets/astronaut-v2/${outfit}-${view}.png`;
    return [direction, sprite];
  })) as Record<Dir, Sprite>;
}

// Preload once while the cinematic/registration runs, never inside the draw loop.
const uniform = loadOutfit("uniform");
const spacesuit = loadOutfit("spacesuit");
const ROW: Record<Dir, number> = { down: 0, up: 1, left: 2, right: 3 };
type WalkSprite = { image: HTMLImageElement; frames: CanvasImageSource; ready: boolean };
/** The walk atlases carry a faint grey haze (alpha ≈ 6) around each frame; clear it once on load. */
function cleanHaze(image: HTMLImageElement): CanvasImageSource {
  const c = document.createElement("canvas");
  c.width = image.naturalWidth;
  c.height = image.naturalHeight;
  const x = c.getContext("2d", { willReadFrequently: true });
  if (!x) return image;
  x.drawImage(image, 0, 0);
  const data = x.getImageData(0, 0, c.width, c.height);
  const px = data.data;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 24) px[i] = 0;
  x.putImageData(data, 0, 0);
  // Copy into a normal (GPU-backed) canvas: drawing from a read-optimised canvas re-uploads it every frame.
  const fast = document.createElement("canvas");
  fast.width = c.width;
  fast.height = c.height;
  fast.getContext("2d")?.drawImage(c, 0, 0);
  fast.dataset.src = image.src;
  return fast;
}
function loadWalk(outfit: string): WalkSprite {
  const image = new Image();
  const sprite: WalkSprite = { image, frames: image, ready: false };
  image.onload = () => {
    sprite.ready = image.naturalWidth === 1280 && image.naturalHeight === 2048;
    if (sprite.ready) sprite.frames = cleanHaze(image);
  };
  image.onerror = () => console.warn(`Walk artwork unavailable; using idle pose: ${image.src}`);
  image.src = `/assets/astronaut-v2/${outfit}-walk.png`;
  return sprite;
}
const uniformWalk = loadWalk("uniform");
const spacesuitWalk = loadWalk("spacesuit");
const poseCanvases = new Map<WalkSprite, HTMLCanvasElement>();

function pose(idle: Sprite, walk: WalkSprite, actor: PaintActor): CanvasImageSource {
  const gait = actor.gait ?? (actor.walking ? 1 : 0);
  if (!walk.ready || gait < 0.01) return idle.image;
  let canvas = poseCanvases.get(walk);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = FRAME.width;
    canvas.height = FRAME.height;
    poseCanvases.set(walk, canvas);
  }
  const context = canvas.getContext("2d");
  if (!context) return idle.image;
  const frame = Math.floor(actor.walkPhase / (Math.PI * 2) * 4) % 4;
  context.clearRect(0, 0, FRAME.width, FRAME.height);
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1 - gait;
  context.drawImage(idle.image, 0, 0);
  context.globalCompositeOperation = "lighter";
  context.globalAlpha = gait;
  context.drawImage(walk.frames, frame * FRAME.width, ROW[actor.facing] * FRAME.height,
    FRAME.width, FRAME.height, 0, 0, FRAME.width, FRAME.height);
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
  return canvas;
}
let blendCanvas: HTMLCanvasElement | undefined;
let blendContext: CanvasRenderingContext2D | null | undefined;

/** Returns false while required art is unavailable so the existing renderer stays usable. */
export function drawPlayerArt(ctx: CanvasRenderingContext2D, actor: PaintActor, time: number): boolean {
  const amount = Math.max(0, Math.min(1, actor.suitBlend));
  const before = uniform[actor.facing];
  const after = spacesuit[actor.facing];
  if ((amount < 1 && !before.ready) || (amount > 0 && !after.ready)) return false;

  const beforePose = amount < 1 ? pose(before, uniformWalk, actor) : before.image;
  const afterPose = amount > 0 ? pose(after, spacesuitWalk, actor) : after.image;
  let artwork: CanvasImageSource = amount === 1 ? afterPose : beforePose;
  if (amount > 0 && amount < 1) {
    if (!blendCanvas) {
      blendCanvas = document.createElement("canvas");
      blendCanvas.width = FRAME.width;
      blendCanvas.height = FRAME.height;
      blendContext = blendCanvas.getContext("2d");
    }
    if (!blendContext) return false;
    blendContext.clearRect(0, 0, FRAME.width, FRAME.height);
    // Add premultiplied alpha layers so the overlapping body stays opaque mid-change.
    blendContext.globalCompositeOperation = "source-over";
    blendContext.globalAlpha = 1 - amount;
    blendContext.drawImage(beforePose, 0, 0);
    blendContext.globalCompositeOperation = "lighter";
    blendContext.globalAlpha = amount;
    blendContext.drawImage(afterPose, 0, 0);
    blendContext.globalAlpha = 1;
    blendContext.globalCompositeOperation = "source-over";
    artwork = blendCanvas;
  }

  const gait = actor.gait ?? (actor.walking ? 1 : 0);
  const breath = Math.sin(time * 2.1 + actor.bob) * (1 - gait);
  ctx.save();
  ctx.translate(actor.x, actor.y);
  if (actor.shadow !== false) {
    ctx.fillStyle = "rgba(6, 10, 18, 0.4)";
    ctx.beginPath();
    ctx.ellipse(0, 4, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Reuse the existing gait/lean envelope; the approved frames remain intact.
  ctx.translate(0, -Math.abs(Math.sin(actor.walkPhase)) * gait * 0.9 + (actor.seated ? 8 : 0));
  ctx.rotate(actor.lean ?? 0);
  ctx.scale(1 + breath * 0.004, 1 + breath * 0.006);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(artwork, -FRAME.anchorX * FRAME.scale, -FRAME.anchorY * FRAME.scale,
    FRAME.width * FRAME.scale, FRAME.height * FRAME.scale);
  if (actor.radioLight && actor.facing !== "up") {
    const radioX = actor.facing === "left" ? -6 : actor.facing === "right" ? 6 : -7;
    ctx.fillStyle = "#55D5E9";
    ctx.beginPath();
    ctx.arc(radioX, -37, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return true;
}
