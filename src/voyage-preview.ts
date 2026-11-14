// Stand-alone preview of the long flight (voyage-preview.html). Not part of the game.
// ?t=12.5 shows a still frame at that time with the controls hidden (used for storyboards).
import { VOYAGE2_DURATION } from "./content/voyage2";
import { drawVoyage2 } from "./render/voyage2-art";

const canvas = document.querySelector<HTMLCanvasElement>("#view")!;
const ctx = canvas.getContext("2d")!;
const play = document.querySelector<HTMLButtonElement>("#play")!;
const scrub = document.querySelector<HTMLInputElement>("#scrub")!;
const timeLabel = document.querySelector<HTMLElement>("#time")!;

const still = new URLSearchParams(location.search).get("t");
let t = still ? Number(still) : 0;
let playing = !still;
if (still) document.body.classList.add("still");
scrub.max = String(VOYAGE2_DURATION);

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener("resize", resize);
resize();

play.addEventListener("click", () => {
  if (t >= VOYAGE2_DURATION) t = 0;
  playing = !playing;
});
scrub.addEventListener("input", () => {
  t = Number(scrub.value);
  playing = false;
});

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (playing) {
    t += dt;
    if (t >= VOYAGE2_DURATION) {
      t = VOYAGE2_DURATION;
      playing = false;
    }
  }
  play.textContent = playing ? "Pause" : "Play";
  scrub.value = String(t);
  timeLabel.textContent = `${t.toFixed(1)} / ${VOYAGE2_DURATION} s`;
  drawVoyage2(ctx, innerWidth, innerHeight, t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

declare global {
  interface Window {
    __VOYAGE2__?: { seek: (time: number) => void };
  }
}
window.__VOYAGE2__ = { seek: (time) => { t = time; playing = false; } };
