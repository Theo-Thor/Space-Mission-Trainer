// Side-view drawing for Rover Rescue. World units: the view is 720 tall; x scrolls.
// Low Sun on the right (south pole): long shadows fall to the left. Earth sits low on the horizon.
import { drawPlayerArt } from "../render/player-art";
import { EvaMission, ENTER_TIME, EXIT_TIME } from "./eva";
import { AIRLOCK_X, CHECKPOINTS, DARK, FACTS, ICE, PARTS, ROVER_X, TERRAIN, BOULDER } from "./level";
import { groundAt, PX_PER_M, TIME_SCALE } from "./physics";

type Ctx = CanvasRenderingContext2D;
const FONT = '"Segoe UI", "Helvetica Neue", sans-serif';
const C = {
  cyan: "#55D5E9",
  amber: "#F0A84B",
  white: "#E8EFF5",
  panel: "rgba(9, 18, 36, 0.86)",
  line: "rgba(85, 213, 233, 0.5)",
  rock: "#7E848D",
  rockDark: "#4B5058",
};

let seed = 5;
const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
const STARS = Array.from({ length: 220 }, () => ({ x: rnd() * 3000, y: rnd() * 520, r: 0.4 + rnd() * 1.3, a: 0.3 + rnd() * 0.7 }));
function ridge(n: number, span: number, base: number, amp: number): [number, number][] {
  const pts: [number, number][] = [];
  let y = base;
  for (let i = 0; i <= n; i += 1) {
    y = base + Math.sin(i * 0.9 + rnd() * 2) * amp * 0.5 + (rnd() - 0.5) * amp;
    pts.push([(i / n) * span, y]);
  }
  return pts;
}
const FAR = ridge(70, 6000, 505, 70);
const MID = ridge(60, 6000, 540, 40);

function smooth(k: number): number {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
}

export function drawEva(ctx: Ctx, viewW: number, viewH: number, m: EvaMission, snapshot: HTMLCanvasElement | null): void {
  let rise = 0;
  let snapK = 0;
  let snapTint = "";
  if (m.phase === "enter") {
    const t = m.phaseT;
    const k = smooth((t - 0.8) / (ENTER_TIME - 0.8));
    rise = (1 - k) * viewH * 0.6;
    snapK = t < 0.8 ? 0 : k;
    snapTint = t < 1.2 ? "rgba(220, 60, 50, " : "";
  } else if (m.phase === "exit") {
    const k = smooth(1 - m.phaseT / EXIT_TIME);
    rise = (1 - k) * viewH * 0.6;
    snapK = k;
    snapTint = "rgba(60, 200, 120, ";
  }

  ctx.fillStyle = "#03050A";
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.save();
  ctx.translate(0, rise);
  drawScene(ctx, viewW, viewH, m);
  ctx.restore();
  if (m.phase === "enter" || m.phase === "exit") {
    drawSnapshot(ctx, viewW, viewH, snapshot, snapK, snapTint, m);
    return;
  }
  drawHud(ctx, viewW, m);
  if (m.phase === "brief") drawBrief(ctx, viewW, viewH, m);
  if (m.phase === "end") drawEnd(ctx, viewW, viewH, m);
}

/** The top-down view tilts away like a floor, while the horizon rises into view. */
function drawSnapshot(ctx: Ctx, w: number, h: number, snap: HTMLCanvasElement | null, k: number, tint: string, m: EvaMission): void {
  if (k >= 1 || !snap) return;
  const enter = m.phase === "enter";
  const pressure = enter ? m.phaseT < 1.2 : m.phaseT > EXIT_TIME - 0.6;
  ctx.save();
  ctx.globalAlpha = 1 - k * 0.85;
  const sh = h * (1 - k);
  ctx.drawImage(snap, 0, 0, snap.width, snap.height, 0, -k * h * 0.35, w, sh);
  ctx.globalAlpha = 1;
  if (tint && pressure) {
    const pulse = 0.18 + 0.12 * Math.sin(m.time * 10);
    ctx.fillStyle = `${tint}${pulse})`;
    ctx.fillRect(0, 0, w, sh);
    ctx.fillStyle = C.white;
    ctx.font = `700 ${Math.round(Math.max(18, w * 0.022))}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(enter ? "DEPRESSURIZING · ROVER EXIT" : "REPRESSURIZING · WELCOME BACK", w / 2, h * 0.5);
  }
  ctx.restore();
}

function drawScene(ctx: Ctx, viewW: number, viewH: number, m: EvaMission): void {
  const s = viewH / 720;
  const W = viewW / s;
  ctx.save();
  ctx.scale(s, s);
  drawSky(ctx, W, m);
  ctx.translate(-m.camX, -m.camY);
  drawWorld(ctx, W, m);
  ctx.restore();
  drawDarkness(ctx, viewW, viewH, s, m);
  drawStorm(ctx, viewW, viewH, s, m);
}

function drawSky(ctx: Ctx, W: number, m: EvaMission): void {
  const cy = m.camY;
  const sky = ctx.createLinearGradient(0, 0, 0, 720);
  sky.addColorStop(0, "#02040A");
  sky.addColorStop(1, "#0B1224");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 720);
  for (const st of STARS) {
    const x = (((st.x - m.camX * 0.03) % 3000) + 3000) % 3000;
    if (x > W) continue;
    ctx.globalAlpha = st.a;
    ctx.fillStyle = "#DCE6FF";
    ctx.fillRect(x, st.y - cy * 0.05, st.r, st.r);
  }
  ctx.globalAlpha = 1;
  // Low Sun just above the far hills on the right.
  const sx = W * 0.9;
  const sy = 470 - cy * 0.2;
  const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, 260);
  sun.addColorStop(0, "rgba(255, 246, 220, 0.95)");
  sun.addColorStop(0.08, "rgba(255, 236, 200, 0.55)");
  sun.addColorStop(1, "rgba(255, 220, 180, 0)");
  ctx.fillStyle = sun;
  ctx.fillRect(sx - 260, sy - 260, 520, 520);
  // Earth, low on the horizon, lit from the right.
  const ex = W * 0.24 - m.camX * 0.008;
  const ey = 452 - cy * 0.15;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ex, ey, 30, 0, Math.PI * 2);
  ctx.fillStyle = "#2B6FC2";
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = "#4E9A6B";
  ctx.beginPath();
  ctx.ellipse(ex + 6, ey - 6, 12, 8, 0.5, 0, Math.PI * 2);
  ctx.ellipse(ex - 10, ey + 10, 9, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillRect(ex - 24, ey - 2, 20, 3);
  ctx.fillRect(ex + 4, ey + 14, 16, 3);
  ctx.fillStyle = "rgba(2, 6, 14, 0.62)";
  ctx.beginPath();
  ctx.arc(ex - 14, ey, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Far hills, then mid hills, with parallax.
  layer(ctx, FAR, m.camX * 0.12, cy * 0.25, W, "#1C2330", "#2E3848");
  layer(ctx, MID, m.camX * 0.35, cy * 0.5, W, "#2C3442", "#47515F");
  // Selene Base domes far behind the airlock.
  const bx = 120 - m.camX * 0.35;
  if (bx > -400) {
    const by = 548 - cy * 0.5;
    ctx.fillStyle = "#5A6577";
    for (const [dx, r] of [[0, 46], [80, 30], [-70, 26]] as const) {
      ctx.beginPath();
      ctx.arc(bx + dx, by, r, Math.PI, 0);
      ctx.fill();
    }
    ctx.fillStyle = C.cyan;
    ctx.fillRect(bx - 4, by - 30, 8, 4);
  }
}

function layer(ctx: Ctx, pts: [number, number][], offX: number, offY: number, W: number, fill: string, edge: string): void {
  const span = pts[pts.length - 1][0];
  const start = Math.floor(offX / span) * span;
  ctx.fillStyle = fill;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  for (let base = start; base < offX + W + span; base += span) {
    ctx.beginPath();
    ctx.moveTo(base - offX, 900);
    for (const [x, y] of pts) ctx.lineTo(base + x - offX, y - offY);
    ctx.lineTo(base + span - offX, 900);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(base + x - offX, y - offY) : ctx.moveTo(base + x - offX, y - offY)));
    ctx.stroke();
  }
}

function drawWorld(ctx: Ctx, W: number, m: EvaMission): void {
  const x0 = m.camX - 80;
  const x1 = m.camX + W + 80;
  const t = m.time;
  drawAirlock(ctx, t);
  drawGround(ctx, x0, x1);
  // Footprints stay: no wind, no rain.
  ctx.fillStyle = "rgba(40, 44, 52, 0.55)";
  for (const f of m.footprints) {
    if (f.x < x0 || f.x > x1) continue;
    ctx.beginPath();
    ctx.ellipse(f.x, f.y + 1, 6, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const p of TERRAIN.platforms) {
    if (p.x + p.w < x0 || p.x > x1) continue;
    if (p.tag === "bridge") {
      if (m.phase === "drive" || m.phase === "end" || m.phase === "exit") drawBridge(ctx, p.x, p.y, p.w);
      continue;
    }
    if (p.x === 7000) drawShelter(ctx, p.x, p.y, p.w, m);
    else drawLedge(ctx, p.x, p.y, p.w);
  }
  CHECKPOINTS.forEach((cp, i) => {
    if (cp.x < x0 || cp.x > x1) return;
    drawBeacon(ctx, cp.x - 34, groundAt(TERRAIN, cp.x - 34), i <= m.checkpoint, t);
  });
  drawSigns(ctx, m);
  drawBoulder(ctx, m);
  for (const part of PARTS) if (!m.parts.has(part.id)) drawPart(ctx, part.id, part.x, part.y + Math.sin(t * 2 + part.x) * 4, t);
  for (const f of FACTS) if (!m.facts.has(f.id)) drawStar(ctx, f.x, f.y + Math.sin(t * 2.4 + f.x) * 4, t);
  if (!m.ice) drawIce(ctx, ICE.x, ICE.y, t);
  drawRover(ctx, m);
  drawArc(ctx, m);
  drawGhost(ctx, m);
  if (m.phase !== "drive" && m.phase !== "end" && m.phase !== "exit") drawPlayer(ctx, m);
  ctx.fillStyle = "#A9AFB8";
  for (const p of m.dust) {
    ctx.globalAlpha = Math.min(1, p.life);
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  drawWorldPrompts(ctx, m);
}

function drawGround(ctx: Ctx, x0: number, x1: number): void {
  const pts = TERRAIN.ground.filter((_p, i, a) => (a[i + 1]?.[0] ?? Infinity) >= x0 && (a[i - 1]?.[0] ?? -Infinity) <= x1);
  const g = ctx.createLinearGradient(0, 480, 0, 1000);
  g.addColorStop(0, "#9AA0A8");
  g.addColorStop(0.35, "#6E747D");
  g.addColorStop(1, "#3B4048");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], 1400);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(pts[pts.length - 1][0], 1400);
  ctx.closePath();
  ctx.fill();
  // Sunlit rim on slopes that face the Sun (right), shaded elsewhere.
  ctx.lineWidth = 3;
  for (let i = 1; i < pts.length; i += 1) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const inCrater = ax >= DARK.x0 && bx <= DARK.x1 + 40 && Math.max(ay, by) > 600;
    ctx.strokeStyle = inCrater ? "#2E333B" : by <= ay ? "#D9DEE5" : "#AEB4BC";
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  // Pebbles and small craters on the surface, with shadows to the left.
  for (let x = Math.floor(x0 / 90) * 90; x < x1; x += 90) {
    const h = Math.sin(x * 12.9898) * 43758.5453;
    const f = h - Math.floor(h);
    const y = groundAt(TERRAIN, x + f * 60);
    if (f < 0.45) {
      ctx.fillStyle = "rgba(20, 24, 30, 0.35)";
      ctx.beginPath();
      ctx.ellipse(x + f * 60 - 10, y + 2, 12 + f * 10, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8C929B";
      ctx.beginPath();
      ctx.ellipse(x + f * 60, y - 3, 5 + f * 8, 4 + f * 3, 0, Math.PI, 0);
      ctx.fill();
    } else if (f > 0.8) {
      ctx.fillStyle = "rgba(30, 34, 40, 0.4)";
      ctx.beginPath();
      ctx.ellipse(x + f * 40, y + 10, 16, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawLedge(ctx: Ctx, x: number, y: number, w: number): void {
  // Long shadow to the left (low Sun on the right).
  ctx.fillStyle = "rgba(10, 12, 18, 0.28)";
  ctx.beginPath();
  ctx.moveTo(x, y + 24);
  ctx.lineTo(x - 70, groundAt(TERRAIN, x - 70));
  ctx.lineTo(x + w * 0.3, groundAt(TERRAIN, x + w * 0.3));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.rockDark;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - 8, y + 22);
  ctx.quadraticCurveTo(x + w / 2, y + 36, x + 8, y + 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.rock;
  ctx.fillRect(x + 2, y, w - 4, 8);
  ctx.fillStyle = "#C9CED5";
  ctx.fillRect(x + w * 0.45, y, w * 0.55 - 2, 3);
}

function drawShelter(ctx: Ctx, x: number, y: number, w: number, m: EvaMission): void {
  const g = groundAt(TERRAIN, x);
  ctx.fillStyle = C.rockDark;
  ctx.fillRect(x, y, 14, g - y);
  ctx.fillRect(x + w - 14, y, 14, g - y);
  ctx.fillStyle = "rgba(10, 12, 18, 0.35)";
  ctx.fillRect(x + 14, y + 40, w - 28, g - y - 40);
  ctx.fillStyle = C.rock;
  ctx.beginPath();
  ctx.moveTo(x - 20, y + 10);
  ctx.quadraticCurveTo(x + w / 2, y - 40, x + w + 20, y + 10);
  ctx.lineTo(x + w + 10, y + 50);
  ctx.lineTo(x - 10, y + 50);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#C9CED5";
  ctx.fillRect(x + w * 0.5, y - 14, w * 0.4, 3);
  if (m.storm.state === "warning" || m.storm.state === "active") {
    ctx.strokeStyle = m.inShelter ? C.cyan : C.amber;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(x + 14, y + 54, w - 28, g - y - 56);
    ctx.setLineDash([]);
    ctx.fillStyle = m.inShelter ? C.cyan : C.amber;
    ctx.font = `700 18px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(m.inShelter ? "SAFE" : "SHELTER", x + w / 2, y + 80);
  }
}

function drawBridge(ctx: Ctx, x: number, y: number, w: number): void {
  ctx.strokeStyle = "#7C8796";
  ctx.lineWidth = 3;
  for (let i = 0; i <= w; i += 60) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + 30, y + 26);
    ctx.lineTo(x + i + 60, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#AEB8C6";
  ctx.fillRect(x, y - 4, w, 6);
  ctx.fillStyle = C.amber;
  for (let i = 0; i < w; i += 120) ctx.fillRect(x + i, y - 4, 40, 3);
}

function drawAirlock(ctx: Ctx, t: number): void {
  const g = 560;
  ctx.fillStyle = "#3A4658";
  ctx.fillRect(-400, g - 240, 700, 240);
  ctx.fillStyle = "#4D5B70";
  for (let i = 0; i < 6; i += 1) ctx.fillRect(-380 + i * 110, g - 228, 96, 60);
  ctx.fillStyle = "#1A2230";
  ctx.fillRect(AIRLOCK_X - 70, g - 130, 64, 130);
  ctx.fillStyle = `rgba(85, 213, 233, ${0.5 + 0.3 * Math.sin(t * 3)})`;
  ctx.fillRect(AIRLOCK_X - 70, g - 136, 64, 5);
  ctx.fillStyle = C.amber;
  for (let i = 0; i < 6; i += 1) ctx.fillRect(AIRLOCK_X - 70 + i * 12, g - 6, 6, 6);
  ctx.fillStyle = C.white;
  ctx.font = `700 16px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("ROVER EXIT", AIRLOCK_X - 38, g - 150);
}

function drawBeacon(ctx: Ctx, x: number, g: number, active: boolean, t: number): void {
  ctx.fillStyle = "#596577";
  ctx.fillRect(x - 2, g - 86, 4, 86);
  const color = active ? C.cyan : C.amber;
  ctx.fillStyle = color;
  ctx.globalAlpha = active ? 1 : 0.5 + 0.5 * Math.sin(t * 4);
  ctx.beginPath();
  ctx.arc(x, g - 90, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(x, g - 90, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#7BD88F";
  ctx.fillRect(x + 8, g - 30, 14, 30);
  ctx.fillStyle = "#2B3F33";
  ctx.fillRect(x + 8, g - 22, 14, 4);
}

function drawSigns(ctx: Ctx, m: EvaMission): void {
  ctx.textAlign = "center";
  ctx.font = `700 18px ${FONT}`;
  const sign = (x: number, y: number, text: string, sub = ""): void => {
    if (Math.abs(x - m.body.x) > 900) return;
    ctx.fillStyle = "rgba(9, 18, 36, 0.7)";
    const w = Math.max(ctx.measureText(text).width, sub ? ctx.measureText(sub).width * 0.8 : 0) + 28;
    ctx.fillRect(x - w / 2, y - 24, w, sub ? 50 : 34);
    ctx.fillStyle = C.white;
    ctx.fillText(text, x, y);
    if (sub) {
      ctx.font = `14px ${FONT}`;
      ctx.fillStyle = C.cyan;
      ctx.fillText(sub, x, y + 20);
      ctx.font = `700 18px ${FONT}`;
    }
  };
  sign(520, 430, "← →  walk");
  sign(790, 400, "SPACE  jump", "Same push as on Earth. Watch!");
  sign(1150, 380, "Grab the star", "Fact stars teach Moon science");
  sign(2620, 330, "PART: spare wheel", "Jump onto the ledge");
  sign(4200, 400, "SHADOW CRATER", "Dark and freezing. Keep moving!");
  sign(6250, 430, "STORM RUN", "Watch for the solar storm alert");
}

function drawBoulder(ctx: Ctx, m: EvaMission): void {
  const bo = m.boulder;
  if (!bo.alive) return;
  const r = BOULDER.r;
  const g = groundAt(TERRAIN, bo.x);
  ctx.fillStyle = "rgba(10, 12, 18, 0.3)";
  ctx.beginPath();
  ctx.ellipse(bo.x - 30, g + 1, 44, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(bo.x, g - r);
  ctx.rotate(bo.angle);
  ctx.fillStyle = "#8A9099";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6A7079";
  for (const [dx, dy, rr] of [[-10, -8, 7], [12, 6, 6], [-4, 14, 5], [14, -12, 4]] as const) {
    ctx.beginPath();
    ctx.arc(dx, dy, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = "rgba(10, 12, 18, 0.35)";
  ctx.beginPath();
  ctx.arc(bo.x - 4, g - r, r, Math.PI * 0.5, Math.PI * 1.5);
  ctx.fill();
}

function glow(ctx: Ctx, x: number, y: number, r: number, color: string, a: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace(")", `, ${a})`).replace("rgb", "rgba"));
  g.addColorStop(1, color.replace(")", ", 0)").replace("rgb", "rgba"));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function drawPart(ctx: Ctx, id: string, x: number, y: number, t: number): void {
  glow(ctx, x, y, 46, "rgb(240, 168, 75)", 0.35 + 0.15 * Math.sin(t * 4));
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 3;
  if (id === "wheel") {
    ctx.fillStyle = "#2C333E";
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#C9D3DE";
    ctx.stroke();
    ctx.strokeStyle = C.amber;
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + t;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
      ctx.stroke();
    }
  } else if (id === "battery") {
    ctx.fillStyle = "#3C4A5E";
    ctx.fillRect(-18, -12, 36, 24);
    ctx.fillStyle = "#7BD88F";
    ctx.fillRect(-14, -8, 18, 16);
    ctx.fillStyle = Math.sin(t * 6) > 0 ? "#FF6B5B" : "#5A2A28";
    ctx.beginPath();
    ctx.arc(11, -4, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = "#C9D3DE";
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(0, -10);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -10, 12, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.fillStyle = C.cyan;
    ctx.beginPath();
    ctx.arc(0, -16, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStar(ctx: Ctx, x: number, y: number, t: number): void {
  glow(ctx, x, y, 34, "rgb(85, 213, 233)", 0.4 + 0.2 * Math.sin(t * 3));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.8);
  ctx.fillStyle = "#E8FBFF";
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 ? 4 : 13;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawIce(ctx: Ctx, x: number, y: number, t: number): void {
  glow(ctx, x, y, 40, "rgb(120, 220, 255)", 0.45 + 0.2 * Math.sin(t * 3));
  ctx.fillStyle = "rgba(170, 235, 255, 0.85)";
  ctx.fillRect(x - 7, y - 20, 14, 30);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x - 3, y - 16, 3, 22);
}

function drawRover(ctx: Ctx, m: EvaMission): void {
  const driving = m.phase === "drive" || m.phase === "end" || m.phase === "exit";
  const x = driving ? m.rover.x : ROVER_X;
  const y = driving ? m.rover.y : groundAt(TERRAIN, ROVER_X);
  const step = m.phase === "repair" ? m.repair.step : driving ? 3 : 0;
  const fixed = driving || step >= 3;
  ctx.fillStyle = "rgba(10, 12, 18, 0.32)";
  ctx.beginPath();
  ctx.ellipse(x - 40, groundAt(TERRAIN, x) + 2, 110, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(driving ? m.rover.angle : step < 2 ? 0.07 : 0);
  const spin = driving ? m.rover.x / 22 : 0;
  // Wheels: the front one is missing until the repair.
  for (const wx of [-52, 52]) {
    if (wx > 0 && step < 2 && !driving) {
      ctx.strokeStyle = "#596577";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(wx - 10, -26);
      ctx.lineTo(wx, -8);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = "#232A34";
    ctx.beginPath();
    ctx.arc(wx, -22, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#AEB8C6";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = C.amber;
    for (let i = 0; i < 4; i += 1) {
      const a = spin + (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(wx, -22);
      ctx.lineTo(wx + Math.cos(a) * 15, -22 + Math.sin(a) * 15);
      ctx.stroke();
    }
  }
  // Chassis.
  ctx.fillStyle = "#D9DFE6";
  ctx.beginPath();
  ctx.roundRect(-84, -62, 168, 30, 8);
  ctx.fill();
  ctx.fillStyle = C.amber;
  ctx.fillRect(-84, -40, 168, 5);
  ctx.fillStyle = "#3A4658";
  ctx.fillRect(-30, -86, 40, 24);
  if (driving) {
    ctx.fillStyle = "#F4F7FA";
    ctx.beginPath();
    ctx.arc(-10, -96, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#E3A94A";
    ctx.beginPath();
    ctx.arc(-6, -96, 8, -0.9, 0.9);
    ctx.fill();
  }
  // Solar panel: dusty until brushed.
  ctx.fillStyle = "#1E3A66";
  ctx.fillRect(18, -82, 70, 10);
  ctx.strokeStyle = "#55D5E9";
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(18 + i * 14, -82);
    ctx.lineTo(18 + i * 14, -72);
    ctx.stroke();
  }
  const dust = step === 0 ? 1 - (m.phase === "repair" ? m.repair.progress : 0) : 0;
  if (dust > 0) {
    ctx.fillStyle = `rgba(150, 140, 120, ${0.85 * dust})`;
    ctx.fillRect(18, -84, 70, 13);
  }
  // Antenna (after the last step).
  if (fixed) {
    ctx.strokeStyle = "#C9D3DE";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-70, -62);
    ctx.lineTo(-70, -118);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-70, -118, 12, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.fillStyle = Math.sin(m.time * 6) > 0 ? C.cyan : "#16424A";
    ctx.beginPath();
    ctx.arc(-70, -124, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawArc(ctx: Ctx, m: EvaMission): void {
  if (m.arc.length < 2) return;
  ctx.fillStyle = C.cyan;
  m.arc.forEach((p, i) => {
    ctx.globalAlpha = 0.25 + (0.5 * i) / m.arc.length;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 50, 2.4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

/** The approved spacesuit art, drawn at the origin (the caller translates and scales). */
function playerActor(facing: "left" | "right", walking: boolean, phase: number): Parameters<typeof drawPlayerArt>[1] {
  return { id: "player", x: 0, y: 0, facing, look: "player", label: "", walking, walkPhase: phase, gait: walking ? 1 : 0, bob: 0, suitBlend: 1, radioLight: true, shadow: false };
}

function drawPlayer(ctx: Ctx, m: EvaMission): void {
  const b = m.body;
  const g = groundAt(TERRAIN, b.x);
  const h = Math.max(0, Math.min(1, (g - b.y) / 160));
  ctx.fillStyle = `rgba(10, 12, 18, ${0.4 * (1 - h * 0.7)})`;
  ctx.beginPath();
  ctx.ellipse(b.x - 8, Math.min(g, b.y + (b.onGround ? 0 : 999)) + 2, 22 * (1 - h * 0.5), 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const walking = !b.onGround || Math.abs(b.vx) > 20;
  const phase = b.onGround ? m.walkPhase : Math.PI * 0.6;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(1.35, 1.35);
  if (m.knock > 0) ctx.rotate(-0.25 * Math.sin(m.knock * 10));
  drawPlayerArt(ctx, playerActor(b.facing, walking, phase), m.time);
  ctx.restore();
}

/** The same jump with Earth's gravity, for comparison (first three jumps). */
function drawGhost(ctx: Ctx, m: EvaMission): void {
  const gh = m.ghost;
  if (!gh) return;
  const hop = EvaMission.earthHop(gh.t);
  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.translate(gh.x - 46, gh.y0 - hop);
  ctx.scale(1.35, 1.35);
  drawPlayerArt(ctx, playerActor(m.body.facing, false, 0), m.time);
  ctx.restore();
  ctx.fillStyle = C.amber;
  ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("EARTH", gh.x - 46, gh.y0 - 118);
  ctx.fillStyle = C.cyan;
  ctx.fillText("MOON", m.body.x, m.body.y - 118);
}

function drawWorldPrompts(ctx: Ctx, m: EvaMission): void {
  ctx.textAlign = "center";
  if (m.nearRover) {
    const ready = m.parts.size === 3;
    bubble(ctx, ROVER_X, 400, ready ? "E — Repair the rover" : `Find all 3 parts (${m.parts.size}/3)`, ready ? C.amber : C.white);
  }
  if (m.phase === "repair") {
    const r = m.repair;
    const steps = [
      ["1 · Brush the dust off the solar panel", "Hold E"],
      ["2 · Bolt on the wheel", "Tap E three times"],
      ["3 · Plug in the battery and antenna", "Hold E"],
      ["Rover repaired!", "Signal relay online"],
    ];
    const [title, how] = steps[Math.min(3, r.step)];
    ctx.fillStyle = C.panel;
    ctx.fillRect(ROVER_X - 190, 300, 380, 88);
    ctx.strokeStyle = C.line;
    ctx.strokeRect(ROVER_X - 190, 300, 380, 88);
    ctx.fillStyle = C.white;
    ctx.font = `700 18px ${FONT}`;
    ctx.fillText(title, ROVER_X, 328);
    ctx.fillStyle = C.amber;
    ctx.font = `15px ${FONT}`;
    ctx.fillText(how, ROVER_X, 350);
    ctx.fillStyle = "#22324A";
    ctx.fillRect(ROVER_X - 160, 362, 320, 12);
    ctx.fillStyle = r.step >= 3 ? C.cyan : C.amber;
    ctx.fillRect(ROVER_X - 160, 362, 320 * (r.step >= 3 ? 1 : Math.min(1, r.progress)), 12);
  }
}

function bubble(ctx: Ctx, x: number, y: number, text: string, color: string): void {
  ctx.font = `700 17px ${FONT}`;
  const w = ctx.measureText(text).width + 30;
  ctx.fillStyle = C.panel;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 24, w, 36, 18);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

let darkCanvas: HTMLCanvasElement | null = null;
function drawDarkness(ctx: Ctx, w: number, h: number, s: number, m: EvaMission): void {
  const dark = m.phase === "walk" || m.phase === "brief" ? m.inDark : 0;
  if (dark <= 0.01) return;
  if (!darkCanvas) darkCanvas = document.createElement("canvas");
  if (darkCanvas.width !== Math.ceil(w) || darkCanvas.height !== Math.ceil(h)) {
    darkCanvas.width = Math.ceil(w);
    darkCanvas.height = Math.ceil(h);
  }
  const d = darkCanvas.getContext("2d")!;
  d.globalCompositeOperation = "source-over";
  d.clearRect(0, 0, w, h);
  d.fillStyle = `rgba(1, 2, 6, ${0.95 * dark})`;
  d.fillRect(0, 0, w, h);
  d.globalCompositeOperation = "destination-out";
  const px = (m.body.x - m.camX) * s;
  const py = (m.body.y - 55 - m.camY) * s;
  const r = m.lampR * s;
  const facing = m.body.facing === "right" ? 1 : -1;
  const lamp = d.createRadialGradient(px + facing * r * 0.25, py, r * 0.1, px + facing * r * 0.25, py, r);
  lamp.addColorStop(0, "rgba(0,0,0,1)");
  lamp.addColorStop(0.6, "rgba(0,0,0,0.85)");
  lamp.addColorStop(1, "rgba(0,0,0,0)");
  d.fillStyle = lamp;
  d.fillRect(0, 0, w, h);
  ctx.drawImage(darkCanvas, 0, 0, w, h);
  // Things worth finding glow faintly through the dark.
  const twinkle = (x: number, y: number, color: string): void => {
    const sx = (x - m.camX) * s;
    const sy = (y - m.camY) * s;
    glow(ctx, sx, sy, 22 * s, color, 0.5 + 0.3 * Math.sin(m.time * 3 + x));
  };
  if (!m.ice) twinkle(ICE.x, ICE.y, "rgb(120, 220, 255)");
  if (!m.parts.has("battery")) twinkle(PARTS[1].x, PARTS[1].y, "rgb(255, 107, 91)");
  const cold = FACTS.find((f) => f.id === "cold");
  if (cold && !m.facts.has("cold")) twinkle(cold.x, cold.y, "rgb(85, 213, 233)");
  // The lamp beam edge.
  ctx.strokeStyle = "rgba(255, 244, 210, 0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px + facing * r * 0.25, py, r * 0.95, 0, Math.PI * 2);
  ctx.stroke();
}

function drawStorm(ctx: Ctx, w: number, h: number, s: number, m: EvaMission): void {
  const st = m.storm;
  if (st.state !== "active" && !(st.state === "warning" && st.t < 3)) return;
  const strength = st.state === "active" ? 1 : (3 - st.t) / 3;
  ctx.strokeStyle = `rgba(255, 236, 170, ${0.55 * strength})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 60 * strength; i += 1) {
    const k = (i * 97.13 + m.time * 900) % (w + h);
    const x = (k * 1.3) % (w + 200) - 100;
    const y = ((i * 53.7 + m.time * 700) % (h + 100)) - 50;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 26 * s, y + 14 * s);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(255, 200, 120, ${0.08 * strength})`;
  ctx.fillRect(0, 0, w, h);
}

// ---------- screen-space HUD and cards ----------

function drawHud(ctx: Ctx, w: number, m: EvaMission): void {
  if (m.phase === "brief") return;
  const pw = Math.min(460, w - 32);
  const x = (w - pw) / 2;
  const y = 12;
  ctx.fillStyle = C.panel;
  ctx.beginPath();
  ctx.roundRect(x, y, pw, m.phase === "drive" ? 52 : 72, 12);
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.font = `700 12px ${FONT}`;
  if (m.phase === "drive" || m.phase === "end") {
    const dist = Math.max(0, (m.rover.x - AIRLOCK_X) / PX_PER_M);
    ctx.fillStyle = C.white;
    ctx.fillText("DRIVE HOME  ← →", x + 16, y + 22);
    ctx.fillStyle = C.cyan;
    ctx.fillText(`Airlock in ${Math.round(dist)} m · follow the crane bridge`, x + 16, y + 40);
    return;
  }
  bar(ctx, x + 16, y + 12, 150, "O₂", m.o2 / m.o2Max, m.o2 / m.o2Max < 0.25 ? "#FF6B5B" : "#7BD88F");
  if (m.cold > 0.01 || m.inDark > 0.3) bar(ctx, x + 186, y + 12, 120, "COLD", m.cold, "#9AD8FF");
  else {
    ctx.fillStyle = "#8FA9D6";
    ctx.fillText(`LAMP ${Math.round(m.lampR / PX_PER_M * 10) / 10} m · from NEXUS energy`, x + 186, y + 24);
  }
  // Parts and facts.
  ctx.fillStyle = C.white;
  ctx.fillText("PARTS", x + 16, y + 56);
  PARTS.forEach((p, i) => {
    ctx.fillStyle = m.parts.has(p.id) ? C.amber : "#2A3A52";
    ctx.beginPath();
    ctx.arc(x + 72 + i * 22, y + 52, 8, 0, Math.PI * 2);
    ctx.fill();
  });
  const found = m.facts.size + (m.ice ? 1 : 0);
  ctx.fillStyle = C.cyan;
  ctx.fillText(`FACTS ${found}/${FACTS.length + 1}`, x + 150, y + 56);
  ctx.fillStyle = "#8FA9D6";
  ctx.textAlign = "right";
  ctx.fillText("g = 1.62 m/s²", x + pw - 14, y + 56);
  if (m.storm.state === "warning") {
    ctx.textAlign = "center";
    ctx.fillStyle = Math.sin(m.time * 8) > 0 ? "#FF6B5B" : C.amber;
    ctx.font = `800 ${Math.round(Math.max(20, w * 0.022))}px ${FONT}`;
    ctx.fillText(`☢ SOLAR STORM IN ${Math.ceil(m.storm.t)} · GET TO THE SHELTER →`, w / 2, y + 110);
  } else if (m.storm.state === "active") {
    ctx.textAlign = "center";
    ctx.fillStyle = C.amber;
    ctx.font = `800 ${Math.round(Math.max(20, w * 0.022))}px ${FONT}`;
    ctx.fillText(`STORM! STAY IN THE SHELTER · ${Math.ceil(m.storm.t)}`, w / 2, y + 110);
  }
}

function bar(ctx: Ctx, x: number, y: number, w: number, label: string, k: number, color: string): void {
  ctx.fillStyle = C.white;
  ctx.font = `700 12px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillText(label, x, y + 12);
  ctx.fillStyle = "#22324A";
  ctx.fillRect(x + 40, y + 3, w - 40, 10);
  ctx.fillStyle = color;
  ctx.fillRect(x + 40, y + 3, (w - 40) * Math.max(0, Math.min(1, k)), 10);
}

function card(ctx: Ctx, w: number, h: number, cw: number, ch: number): [number, number] {
  const x = (w - cw) / 2;
  const y = (h - ch) / 2;
  ctx.fillStyle = "rgba(4, 8, 18, 0.55)";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(9, 18, 40, 0.94)";
  ctx.beginPath();
  ctx.roundRect(x, y, cw, ch, 16);
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  return [x, y];
}

function drawBrief(ctx: Ctx, w: number, h: number, m: EvaMission): void {
  const cw = Math.min(520, w - 32);
  const [, y] = card(ctx, w, h, cw, 300);
  ctx.textAlign = "center";
  ctx.fillStyle = "#8FA9D6";
  ctx.font = `700 13px ${FONT}`;
  ctx.fillText("EVA MISSION · LUNAR SOUTH POLE", w / 2, y + 40);
  ctx.fillStyle = C.white;
  ctx.font = `800 36px ${FONT}`;
  ctx.fillText("ROVER RESCUE", w / 2, y + 84);
  ctx.font = `17px ${FONT}`;
  const goals = ["1  Find 3 parts: wheel, battery, antenna", "2  Fix the scout rover", "3  Drive it home across the crater"];
  goals.forEach((g, i) => {
    ctx.fillStyle = i === 0 ? C.amber : C.white;
    ctx.fillText(g, w / 2, y + 130 + i * 30);
  });
  ctx.fillStyle = C.cyan;
  ctx.font = `14px ${FONT}`;
  ctx.fillText("Moon gravity 1.62 m/s² · No air, no sound, long shadows", w / 2, y + 236);
  ctx.fillStyle = Math.sin(m.time * 4) > 0 ? C.white : "#8FA9D6";
  ctx.font = `700 15px ${FONT}`;
  ctx.fillText("Press SPACE to start", w / 2, y + 272);
}

function drawEnd(ctx: Ctx, w: number, h: number, m: EvaMission): void {
  const sum = m.summary();
  const cw = Math.min(560, w - 32);
  const [, y] = card(ctx, w, h, cw, 340);
  ctx.textAlign = "center";
  ctx.fillStyle = "#8FA9D6";
  ctx.font = `700 13px ${FONT}`;
  ctx.fillText("EVA COMPLETE", w / 2, y + 40);
  ctx.fillStyle = C.white;
  ctx.font = `800 36px ${FONT}`;
  ctx.fillText("ROVER RESCUED", w / 2, y + 84);
  ctx.font = `17px ${FONT}`;
  const lines = [
    [`Your best jump: ${sum.heightM.toFixed(1)} m high`, C.cyan],
    [`In the air for ${sum.moonAir.toFixed(1)} s of real Moon time`, C.white],
    [`The same push on Earth: ${sum.earthHeightM.toFixed(2)} m, ${sum.earthAir.toFixed(1)} s`, C.amber],
    [`Facts found: ${sum.facts} of ${FACTS.length + 1}`, C.white],
  ] as const;
  lines.forEach(([text, color], i) => {
    ctx.fillStyle = color;
    ctx.fillText(text, w / 2, y + 132 + i * 30);
  });
  ctx.fillStyle = "#8FA9D6";
  ctx.font = `12px ${FONT}`;
  ctx.fillText(`Real Moon gravity; the game runs ${TIME_SCALE}× faster than Moon time. Real suits are heavy, so astronauts hop lower.`, w / 2, y + 270);
  ctx.fillStyle = Math.sin(m.time * 4) > 0 ? C.white : "#8FA9D6";
  ctx.font = `700 15px ${FONT}`;
  ctx.fillText("Press E to return to the base", w / 2, y + 310);
}
