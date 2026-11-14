// Earth-to-Moon sequence. Flat, illustrated shapes in the facility palette.
// Scenes are drawn in a 1280 × 720 virtual stage scaled to cover the screen.
// The HUD (phase panel, fact card, countdown) is drawn in screen space so it is never cropped.

import { BEATS, FACTS, VOYAGE_DURATION, phaseAt } from "../content/voyage";

const W = 1280;
const H = 720;

const C = {
  navy: "#101B2E",
  deep: "#070C16",
  cyan: "#55D5E9",
  amber: "#F0A84B",
  white: "#E8EFF5",
  light: "#C9D3DE",
  gray: "#718398",
  steel: "#3A4A5E",
  panel: "rgba(12, 20, 34, 0.92)",
  line: "rgba(85, 213, 233, 0.55)",
  ocean: "#2F6FA8",
  land: "#4E9A6B",
  moon: "#BFC5CE",
  moonDark: "#8E95A1",
};

const FONT = '"Segoe UI", "Helvetica Neue", sans-serif';

export function drawVoyage(ctx: CanvasRenderingContext2D, viewW: number, viewH: number, time: number): void {
  const t = clamp(time, 0, VOYAGE_DURATION);
  ctx.fillStyle = C.deep;
  ctx.fillRect(0, 0, viewW, viewH);

  const scale = Math.max(viewW / W, viewH / H);
  ctx.save();
  ctx.translate((viewW - W * scale) / 2, (viewH - H * scale) / 2);
  ctx.scale(scale, scale);
  if (t < BEATS.depart) drawLaunch(ctx, t);
  else if (t < BEATS.transfer) drawDepart(ctx, t, (t - BEATS.depart) / (BEATS.transfer - BEATS.depart));
  else if (t < BEATS.orbit) drawTransfer(ctx, t, (t - BEATS.transfer) / (BEATS.orbit - BEATS.transfer));
  else if (t < BEATS.landing) drawOrbit(ctx, t, (t - BEATS.orbit) / (BEATS.landing - BEATS.orbit));
  else drawLanding(ctx, t);
  ctx.restore();

  const dip = cutDip(t);
  if (dip > 0) {
    ctx.fillStyle = `rgba(5, 8, 15, ${dip})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }
  drawHud(ctx, viewW, viewH, t);
}

// ---------------------------------------------------------------- scenes

function drawLaunch(ctx: CanvasRenderingContext2D, t: number): void {
  const since = Math.max(0, t - BEATS.liftoff);
  const climb = 145 * since * since;
  const shift = Math.max(0, climb - 280);
  const rocketBase = 600 - Math.min(climb, 280);
  const sky = clamp(climb / 1400, 0, 1);

  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, mixHex("#2C5378", C.deep, sky));
  gradient.addColorStop(1, mixHex("#7FA6C6", C.navy, sky));
  ctx.fillStyle = gradient;
  ctx.fillRect(-W, -H, W * 3, H * 3);
  drawStarfield(ctx, t, sky);

  ctx.save();
  if (since > 0 && since < 1.6) {
    const shake = (1.6 - since) * 2.2;
    ctx.translate(Math.sin(t * 61) * shake, Math.cos(t * 47) * shake);
  }

  // Ground, pad and tower scroll away once the rocket clears the frame's lower third.
  const ground = 600 + shift;
  if (ground < H + 400) {
    ctx.fillStyle = "#21344A";
    ctx.beginPath();
    ctx.moveTo(-W, ground);
    for (let x = -W; x <= W * 2; x += 160) ctx.lineTo(x + 80, ground - 26 - ((x / 160) % 3) * 10);
    ctx.lineTo(W * 2, ground);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1A2A3D";
    ctx.fillRect(-W, ground, W * 3, H + 400);
    ctx.fillStyle = "#4A5A6E";
    ctx.fillRect(530, ground - 6, 220, 16);
    drawTower(ctx, 548, ground, t, since > 0);
    drawSmoke(ctx, since, ground);
  }

  drawLauncher(ctx, 640, rocketBase, t, since);
  ctx.restore();

  if (t < BEATS.liftoff + 0.6) {
    const label = t < 0.5 ? "3" : t < 1.0 ? "2" : t < BEATS.liftoff ? "1" : "LIFTOFF";
    const local = t < BEATS.liftoff ? (t % 0.5) / 0.5 : (t - BEATS.liftoff) / 0.6;
    ctx.save();
    ctx.globalAlpha = 1 - local * 0.6;
    ctx.fillStyle = label === "LIFTOFF" ? C.amber : C.white;
    ctx.font = `700 ${label === "LIFTOFF" ? 64 : 120}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, W / 2 + 230, 250);
    ctx.restore();
  }
}

function drawDepart(ctx: CanvasRenderingContext2D, t: number, u: number): void {
  ctx.fillStyle = C.deep;
  ctx.fillRect(-W, -H, W * 3, H * 3);
  drawStarfield(ctx, t, 1);

  const e = easeOut(u);
  const radius = lerp(760, 300, e);
  drawEarth(ctx, lerp(520, 300, e), H + radius * 0.45 - e * 120, radius, t);

  const x = lerp(620, 940, easeInOut(u));
  const y = lerp(360, 250, easeInOut(u));
  const angle = 1.15;

  // The spent core stage drops behind the craft before the injection burn.
  if (u < 0.45) {
    const back = 26 + u * 240;
    ctx.save();
    ctx.globalAlpha = 1 - u / 0.45;
    ctx.translate(x - Math.sin(angle) * back, y + Math.cos(angle) * back);
    ctx.rotate(angle + u * 0.6);
    ctx.scale(0.9, 0.9);
    drawCoreStage(ctx, 0, 0);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(1.5, 1.5);
  const burn = u > 0.1 && u < 0.6 ? Math.sin(((u - 0.1) / 0.5) * Math.PI) : 0;
  drawCraft(ctx, 0, 0, t, { flame: burn, legs: 0 });
  ctx.restore();
}

function drawTransfer(ctx: CanvasRenderingContext2D, t: number, u: number): void {
  ctx.fillStyle = C.deep;
  ctx.fillRect(-W, -H, W * 3, H * 3);
  drawStarfield(ctx, t, 1);

  const earth = { x: 230, y: 350, r: 70 };
  const moon = { x: 1070, y: 250, r: 40 };
  const p0 = { x: 300, y: 320 };
  const p1 = { x: 660, y: 40 };
  const p2 = { x: 1030, y: 262 };

  drawEarth(ctx, earth.x, earth.y, earth.r, t);
  drawMoonDisc(ctx, moon.x, moon.y, moon.r, false);

  ctx.save();
  ctx.setLineDash([8, 10]);
  ctx.strokeStyle = "rgba(232, 239, 245, 0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
  ctx.stroke();
  ctx.restore();

  const s = easeInOut(u);
  ctx.save();
  ctx.strokeStyle = C.cyan;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 40; i += 1) {
    const point = quad(p0, p1, p2, (s * i) / 40);
    if (i === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
  ctx.restore();

  const here = quad(p0, p1, p2, s);
  const ahead = quad(p0, p1, p2, Math.min(1, s + 0.01));
  const glow = ctx.createRadialGradient(here.x, here.y, 0, here.x, here.y, 26);
  glow.addColorStop(0, "rgba(85, 213, 233, 0.55)");
  glow.addColorStop(1, "rgba(85, 213, 233, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(here.x - 26, here.y - 26, 52, 52);
  ctx.save();
  ctx.translate(here.x, here.y);
  ctx.rotate(Math.atan2(ahead.y - here.y, ahead.x - here.x) + Math.PI / 2);
  ctx.scale(0.45, 0.45);
  drawCraft(ctx, 0, 40, t, { flame: 0, legs: 0 });
  ctx.restore();

  label(ctx, "EARTH", earth.x, earth.y + earth.r + 28, C.light, 14, "center");
  label(ctx, "MOON", moon.x, moon.y + moon.r + 26, C.light, 14, "center");

  // Trip progress bar: compressed mission time.
  const bx = 560;
  const by = 640;
  const bw = 440;
  ctx.fillStyle = "rgba(232, 239, 245, 0.14)";
  fillRound(ctx, bx, by, bw, 6, 3);
  ctx.fillStyle = C.cyan;
  fillRound(ctx, bx, by, Math.max(6, bw * s), 6, 3);
  label(ctx, "LAUNCH", bx, by - 12, C.gray, 12, "left");
  label(ctx, "ARRIVAL", bx + bw, by - 12, C.gray, 12, "right");
  label(ctx, `≈ ${(s * 3).toFixed(1)} DAYS`, bx + bw / 2, by - 12, C.white, 14, "center", 700);
  label(ctx, "Illustration — distances and sizes not to scale", W - 40, H - 30, C.gray, 12, "right");
}

function drawOrbit(ctx: CanvasRenderingContext2D, t: number, u: number): void {
  ctx.fillStyle = C.deep;
  ctx.fillRect(-W, -H, W * 3, H * 3);
  drawStarfield(ctx, t, 1);

  const cx = 640;
  const cy = 360;
  const r = 270;
  const pole = { x: cx, y: cy + r * 0.86 };
  const zoom = easeIn(clamp((u - 0.62) / 0.38, 0, 1));

  const orbitAngle = -Math.PI * 0.15 + u * Math.PI * 1.55;
  const orbitPos = { x: cx + Math.cos(orbitAngle) * 360, y: cy + 40 + Math.sin(orbitAngle) * 110 };
  const behind = Math.sin(orbitAngle) < 0 && zoom === 0;

  ctx.save();
  ctx.translate(pole.x, pole.y);
  ctx.scale(1 + zoom * 5, 1 + zoom * 5);
  ctx.translate(-pole.x, -pole.y);

  ctx.save();
  ctx.strokeStyle = "rgba(85, 213, 233, 0.22)";
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 40, 360, 110, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (behind) drawOrbitCraft(ctx, orbitPos, orbitAngle, t);
  drawMoonDisc(ctx, cx, cy, r, true);

  // South pole marker and permanently shadowed crater floors.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "rgba(7, 12, 22, 0.85)";
  for (const [dx, dy, rx] of [[-44, -6, 22], [18, 8, 16], [58, -16, 12], [-8, -30, 10]] as const) {
    ctx.beginPath();
    ctx.ellipse(pole.x + dx, pole.y + dy, rx, rx * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  const pulse = 0.5 + Math.sin(t * 5) * 0.5;
  ctx.save();
  ctx.strokeStyle = C.amber;
  ctx.globalAlpha = 0.6 + pulse * 0.4;
  ctx.lineWidth = 2 / (1 + zoom * 5);
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.ellipse(pole.x, pole.y - 6, 96, 34, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  if (zoom === 0) {
    label(ctx, "SOUTH POLE", pole.x + 110, pole.y - 30, C.amber, 14, "left", 700);
    if (!behind) drawOrbitCraft(ctx, orbitPos, orbitAngle, t);
  } else {
    const p = { x: lerp(orbitPos.x, pole.x, zoom), y: lerp(orbitPos.y, pole.y - 40, zoom) };
    ctx.save();
    ctx.globalAlpha = 1 - zoom;
    drawOrbitCraft(ctx, p, orbitAngle, t);
    ctx.restore();
  }
}

function drawLanding(ctx: CanvasRenderingContext2D, t: number): void {
  const descent = clamp((t - BEATS.landing) / (BEATS.touchdown - BEATS.landing), 0, 1);
  const landed = t >= BEATS.touchdown;
  const groundY = 572;

  ctx.fillStyle = C.deep;
  ctx.fillRect(-W, -H, W * 3, H * 3);
  drawStarfield(ctx, t, 1);

  // Low Sun on the left horizon: near the pole it never climbs high, so shadows are long.
  const sun = ctx.createRadialGradient(-60, 520, 0, -60, 520, 520);
  sun.addColorStop(0, "rgba(255, 236, 200, 0.55)");
  sun.addColorStop(0.25, "rgba(240, 168, 75, 0.16)");
  sun.addColorStop(1, "rgba(240, 168, 75, 0)");
  ctx.fillStyle = sun;
  ctx.fillRect(-W, -H, W * 3, H * 3);

  // Earth hangs low over the horizon as seen from the lunar south pole.
  drawEarth(ctx, 780, 405, 26, t);

  ctx.fillStyle = "#262D39";
  ridge(ctx, 470, [0, 30, 12, 46, 20, 8, 38, 16, 26, 4]);
  ctx.fillStyle = "#353D4A";
  ridge(ctx, 520, [10, 0, 24, 8, 30, 14, 2, 20, 6, 16]);

  const groundGrad = ctx.createLinearGradient(0, groundY - 20, 0, H);
  groundGrad.addColorStop(0, "#7C828C");
  groundGrad.addColorStop(1, "#4A505A");
  ctx.fillStyle = groundGrad;
  ctx.beginPath();
  ctx.moveTo(-W, groundY + 6);
  ctx.quadraticCurveTo(300, groundY - 14, 640, groundY);
  ctx.quadraticCurveTo(980, groundY + 10, W * 2, groundY - 4);
  ctx.lineTo(W * 2, H * 2);
  ctx.lineTo(-W, H * 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(40, 45, 54, 0.6)";
  for (let i = 0; i < 26; i += 1) {
    const x = ((i * 211) % 1400) - 60;
    const y = groundY + 18 + ((i * 53) % 130);
    ctx.beginPath();
    ctx.ellipse(x, y, 10 + (i % 4) * 6, 3 + (i % 3), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBase(ctx, groundY, t);

  // Landing pad.
  ctx.fillStyle = "#5F6570";
  ctx.beginPath();
  ctx.ellipse(640, groundY + 4, 104, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(240, 168, 75, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(640, groundY + 4, 72, 9, 0, 0, Math.PI * 2);
  ctx.stroke();
  const blink = Math.sin(t * 6) > 0;
  for (const x of [540, 740]) {
    ctx.fillStyle = blink ? C.amber : "#7A5A30";
    ctx.beginPath();
    ctx.arc(x, groundY + 4, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const craftX = 640 - (1 - descent) * (1 - descent) * 240;
  const craftY = lerp(-90, groundY - 2, easeOut(descent));
  const altitude = groundY - craftY;

  // Shadow stretches right, away from the low Sun.
  ctx.save();
  ctx.globalAlpha = clamp(1 - altitude / 300, 0, 0.55);
  ctx.fillStyle = "#1E232B";
  ctx.beginPath();
  ctx.ellipse(craftX + 70, groundY + 6, 70, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawDust(ctx, t, craftX, groundY, altitude);

  ctx.save();
  ctx.translate(craftX, craftY);
  ctx.scale(1.7, 1.7);
  const flame = landed ? 0 : 0.55 + (altitude < 160 ? 0.4 : 0);
  drawCraft(ctx, 0, 0, t, { flame, legs: clamp((t - BEATS.legs) / 0.6, 0, 1) });
  ctx.restore();
}

// ---------------------------------------------------------------- pieces

interface CraftOptions {
  flame: number;
  legs: number;
}

/** The Selene craft (capsule over a landing stage). Origin is the engine exit, pointing up. */
function drawCraft(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, opts: CraftOptions): void {
  ctx.save();
  ctx.translate(x, y);

  if (opts.flame > 0) drawFlame(ctx, 0, 0, 9, (22 + 34 * opts.flame) * (0.9 + Math.sin(t * 40) * 0.1), opts.flame);

  const spread = opts.legs;
  ctx.strokeStyle = "#9AA6B4";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    const footX = side * lerp(16, 30, spread);
    const footY = lerp(-12, 2, spread);
    ctx.beginPath();
    ctx.moveTo(side * 12, -24);
    ctx.lineTo(footX, footY);
    ctx.stroke();
    ctx.fillStyle = "#9AA6B4";
    fillRound(ctx, footX - 5, footY - 1, 10, 3, 1.5);
  }

  ctx.fillStyle = C.steel;
  ctx.beginPath();
  ctx.moveTo(-8, -12);
  ctx.lineTo(8, -12);
  ctx.lineTo(11, 0);
  ctx.lineTo(-11, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = C.white;
  fillRound(ctx, -15, -60, 30, 48, 5);
  ctx.fillStyle = C.cyan;
  ctx.fillRect(-15, -42, 30, 5);
  ctx.fillStyle = C.amber;
  ctx.fillRect(-15, -20, 30, 3);

  ctx.fillStyle = C.light;
  ctx.beginPath();
  ctx.moveTo(-15, -60);
  ctx.lineTo(15, -60);
  ctx.lineTo(7, -86);
  ctx.lineTo(-7, -86);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.navy;
  fillRound(ctx, -5, -78, 10, 7, 2);
  ctx.fillStyle = C.cyan;
  ctx.globalAlpha = 0.7;
  fillRound(ctx, -4, -77, 8, 5, 2);
  ctx.restore();
}

function drawCoreStage(ctx: CanvasRenderingContext2D, x: number, top: number): void {
  ctx.fillStyle = "#D98B3A";
  fillRound(ctx, x - 16, top, 32, 160, 4);
  ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
  ctx.fillRect(x + 4, top, 12, 160);
  ctx.fillStyle = C.steel;
  ctx.fillRect(x - 12, top + 160, 24, 10);
}

function drawLauncher(ctx: CanvasRenderingContext2D, x: number, base: number, t: number, since: number): void {
  const coreTop = base - 170;
  const sep = Math.max(0, t - BEATS.separation);
  const firing = since > 0;

  if (firing) {
    drawFlame(ctx, x, base, 14, 70 + Math.sin(t * 37) * 8 + Math.min(since, 1) * 40, 1);
    if (sep === 0) {
      drawFlame(ctx, x - 25, base + 4, 9, 60 + Math.sin(t * 41) * 6, 1);
      drawFlame(ctx, x + 25, base + 4, 9, 60 + Math.cos(t * 43) * 6, 1);
    }
  }

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(x + side * (25 + sep * 70), base + 4 + sep * sep * 160);
    ctx.rotate(side * sep * 0.5);
    ctx.globalAlpha = clamp(1 - sep / 1.4, 0, 1);
    ctx.fillStyle = C.white;
    fillRound(ctx, -7, -124, 14, 124, 3);
    ctx.beginPath();
    ctx.moveTo(-7, -124);
    ctx.lineTo(7, -124);
    ctx.lineTo(0, -144);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.fillRect(1, -124, 6, 124);
    ctx.restore();
  }

  drawCoreStage(ctx, x, coreTop);
  drawCraft(ctx, x, coreTop, t, { flame: 0, legs: 0 });
}

function drawFlame(ctx: CanvasRenderingContext2D, x: number, y: number, halfWidth: number, length: number, power: number): void {
  ctx.save();
  ctx.globalAlpha = clamp(power, 0, 1);
  ctx.fillStyle = C.amber;
  ctx.beginPath();
  ctx.moveTo(x - halfWidth, y);
  ctx.quadraticCurveTo(x - halfWidth * 0.6, y + length * 0.6, x, y + length);
  ctx.quadraticCurveTo(x + halfWidth * 0.6, y + length * 0.6, x + halfWidth, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#FFF2D6";
  ctx.beginPath();
  ctx.moveTo(x - halfWidth * 0.5, y);
  ctx.quadraticCurveTo(x - halfWidth * 0.3, y + length * 0.35, x, y + length * 0.55);
  ctx.quadraticCurveTo(x + halfWidth * 0.3, y + length * 0.35, x + halfWidth * 0.5, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTower(ctx: CanvasRenderingContext2D, x: number, ground: number, t: number, armOpen: boolean): void {
  const top = ground - 250;
  ctx.fillStyle = "#3D4F66";
  ctx.fillRect(x - 16, top, 32, 250);
  ctx.strokeStyle = "#2A394C";
  ctx.lineWidth = 2;
  for (let y = top; y < ground; y += 24) {
    ctx.beginPath();
    ctx.moveTo(x - 16, y);
    ctx.lineTo(x + 16, y + 24);
    ctx.moveTo(x + 16, y);
    ctx.lineTo(x - 16, y + 24);
    ctx.stroke();
  }
  ctx.fillStyle = "#4A5D76";
  ctx.save();
  ctx.translate(x + 16, top + 66);
  ctx.rotate(armOpen ? -0.7 : 0);
  ctx.fillRect(0, -4, 60, 8);
  ctx.restore();
  ctx.fillStyle = Math.sin(t * 5) > 0 ? C.amber : "#6B4A22";
  ctx.beginPath();
  ctx.arc(x, top - 6, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawSmoke(ctx: CanvasRenderingContext2D, since: number, ground: number): void {
  if (since <= 0) return;
  ctx.save();
  for (let i = 0; i < 12; i += 1) {
    const age = since - i * 0.07;
    if (age <= 0) continue;
    const side = i % 2 === 0 ? -1 : 1;
    const radius = 18 + age * 55;
    ctx.globalAlpha = clamp(0.55 * (1 - age / 3), 0, 0.55);
    ctx.fillStyle = i % 3 === 0 ? "#B9C3CF" : C.light;
    ctx.beginPath();
    ctx.arc(640 + side * (age * 110 + i * 5), ground - 12 - age * 14, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEarth(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number): void {
  const halo = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 1.18);
  halo.addColorStop(0, "rgba(85, 213, 233, 0.4)");
  halo.addColorStop(1, "rgba(85, 213, 233, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = C.ocean;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  const spin = t * 0.04;
  ctx.fillStyle = C.land;
  for (const [ax, ay, rx, ry, rot] of [
    [-0.35, -0.3, 0.32, 0.2, 0.4],
    [0.25, -0.05, 0.22, 0.34, -0.3],
    [-0.1, 0.42, 0.28, 0.14, 0.1],
    [0.55, 0.45, 0.16, 0.1, 0.8],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(x + (ax + Math.sin(spin) * 0.05) * r, y + ay * r, rx * r, ry * r, rot, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
  for (const [ax, ay, rx, ry, rot] of [
    [-0.45, 0.1, 0.34, 0.06, -0.2],
    [0.05, -0.6, 0.3, 0.05, 0.15],
    [0.2, 0.3, 0.36, 0.05, -0.1],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(x + ax * r, y + ay * r, rx * r, ry * r, rot, 0, Math.PI * 2);
    ctx.fill();
  }
  // Night side.
  ctx.fillStyle = "rgba(5, 8, 15, 0.42)";
  ctx.beginPath();
  ctx.arc(x + r * 0.55, y + r * 0.2, r * 1.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMoonDisc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, detailed: boolean): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = C.moon;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.fillStyle = C.moonDark;
  const maria: [number, number, number][] = [[-0.3, -0.35, 0.22], [0.12, -0.15, 0.17], [-0.05, 0.2, 0.13], [0.35, 0.1, 0.1]];
  for (const [ax, ay, ar] of maria) {
    ctx.beginPath();
    ctx.ellipse(x + ax * r, y + ay * r, ar * r, ar * r * 0.8, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (detailed) {
    ctx.strokeStyle = "rgba(90, 96, 106, 0.5)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i += 1) {
      const a = i * 2.4;
      const d = ((i * 37) % 90) / 100;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d * r, y + Math.sin(a) * d * r, 4 + (i % 5) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // Sunlight from the left; the right limb falls into shadow.
  ctx.fillStyle = "rgba(5, 8, 15, 0.5)";
  ctx.beginPath();
  ctx.arc(x + r * 0.75, y, r * 1.02, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOrbitCraft(ctx: CanvasRenderingContext2D, p: { x: number; y: number }, angle: number, t: number): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle + Math.PI);
  ctx.scale(0.55, 0.55);
  drawCraft(ctx, 0, 40, t, { flame: 0, legs: 0 });
  ctx.restore();
}

function drawBase(ctx: CanvasRenderingContext2D, ground: number, t: number): void {
  // Long shadows to the right of each structure.
  ctx.fillStyle = "rgba(30, 35, 43, 0.55)";
  ctx.beginPath();
  ctx.moveTo(800, ground);
  ctx.lineTo(1260, ground + 16);
  ctx.lineTo(1260, ground + 4);
  ctx.lineTo(1100, ground - 2);
  ctx.closePath();
  ctx.fill();

  // Vertical solar array: at the pole the Sun stays near the horizon.
  ctx.fillStyle = "#59616D";
  ctx.fillRect(1196, ground - 210, 6, 210);
  ctx.fillStyle = "#24507E";
  fillRound(ctx, 1170, ground - 206, 58, 120, 3);
  ctx.strokeStyle = "rgba(85, 213, 233, 0.45)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i += 1) {
    ctx.beginPath();
    ctx.moveTo(1170, ground - 206 + i * 20);
    ctx.lineTo(1228, ground - 206 + i * 20);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(1199, ground - 206);
  ctx.lineTo(1199, ground - 86);
  ctx.stroke();

  // Habitat module with lit windows.
  ctx.fillStyle = C.light;
  fillRound(ctx, 920, ground - 58, 190, 58, 14);
  ctx.fillStyle = C.amber;
  ctx.fillRect(920, ground - 14, 190, 4);
  for (let i = 0; i < 6; i += 1) {
    ctx.fillStyle = i === 2 && Math.sin(t * 1.3) > 0.85 ? "#9FEAF5" : C.cyan;
    fillRound(ctx, 938 + i * 28, ground - 42, 14, 10, 3);
  }

  // Antenna dish aimed at Earth.
  ctx.strokeStyle = "#9AA6B4";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(1060, ground - 58);
  ctx.lineTo(1060, ground - 92);
  ctx.stroke();
  ctx.save();
  ctx.translate(1060, ground - 96);
  ctx.rotate(-0.5);
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 7, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Domes.
  for (const [x, r] of [[860, 66], [1150, 38]] as const) {
    ctx.fillStyle = "#D7DEE6";
    ctx.beginPath();
    ctx.arc(x, ground, r, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.beginPath();
    ctx.arc(x, ground, r, Math.PI * 1.5, Math.PI * 2);
    ctx.lineTo(x, ground);
    ctx.fill();
    ctx.strokeStyle = C.cyan;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, ground, r * 0.68, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }

  // Rover parked beside the pad.
  ctx.fillStyle = "#C9D3DE";
  fillRound(ctx, 452, ground - 22, 44, 14, 4);
  ctx.fillStyle = C.amber;
  ctx.fillRect(452, ground - 12, 44, 3);
  ctx.fillStyle = "#2A3240";
  for (const x of [460, 488]) {
    ctx.beginPath();
    ctx.arc(x, ground - 4, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  label(ctx, "SELENE BASE", 990, ground - 118, C.cyan, 13, "center", 700);
}

function drawDust(ctx: CanvasRenderingContext2D, t: number, x: number, ground: number, altitude: number): void {
  // No air on the Moon: dust flies out in low, straight sprays and drops, it does not billow.
  if (altitude > 150) return;
  const after = Math.max(0, t - BEATS.touchdown);
  if (after > 1.6) return;
  const strength = clamp((150 - altitude) / 150, 0, 1) * clamp(1 - after / 1.6, 0, 1);
  ctx.save();
  ctx.fillStyle = "#AEB4BD";
  for (let i = 0; i < 46; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const phase = ((t * 1.8 + i * 0.137) % 1 + 1) % 1;
    const reach = 40 + phase * (180 + (i % 7) * 26);
    const lift = Math.sin(phase * Math.PI) * (6 + (i % 5) * 3);
    ctx.globalAlpha = strength * (1 - phase) * 0.8;
    ctx.fillRect(x + side * reach, ground - lift, 3, 2);
  }
  ctx.restore();
}

function drawStarfield(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  for (let i = 0; i < 140; i += 1) {
    const x = ((i * 9301 + 49297) % 233280) / 233280 * W;
    const y = ((i * 4507 + 1213) % 9973) / 9973 * H;
    ctx.globalAlpha = alpha * (0.35 + (Math.sin(t * 1.3 + i) + 1) * 0.25);
    ctx.fillStyle = i % 7 === 0 ? C.cyan : C.white;
    const size = i % 9 === 0 ? 2.2 : 1.3;
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
}

function ridge(ctx: CanvasRenderingContext2D, base: number, heights: number[]): void {
  ctx.beginPath();
  ctx.moveTo(-W, base + 60);
  const step = (W + 200) / (heights.length - 1);
  heights.forEach((h, i) => ctx.lineTo(-100 + i * step, base - h));
  ctx.lineTo(W * 2, base + 60);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------- HUD (screen space)

function drawHud(ctx: CanvasRenderingContext2D, viewW: number, viewH: number, t: number): void {
  const k = clamp(viewW / 1100, 0.78, 1.15);
  const pad = 20 * k;

  const pw = 300 * k;
  const ph = 70 * k;
  ctx.fillStyle = C.panel;
  fillRound(ctx, pad, pad, pw, ph, 8 * k);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  strokeRound(ctx, pad, pad, pw, ph, 8 * k);
  label(ctx, "PROJECT SELENE · 2048 · FICTIONAL MISSION", pad + 16 * k, pad + 24 * k, C.gray, 11 * k, "left", 600);
  label(ctx, phaseAt(t), pad + 16 * k, pad + 52 * k, C.cyan, 19 * k, "left", 700);

  const fact = FACTS.find((item) => t >= item.from && t < item.to);
  if (!fact) return;
  const alpha = clamp(Math.min((t - fact.from) / 0.35, (fact.to - t) / 0.35), 0, 1);
  const fw = Math.min(430 * k, viewW - pad * 2);
  ctx.save();
  ctx.font = `400 ${14 * k}px ${FONT}`;
  const lines = wrap(ctx, fact.note, fw - 32 * k);
  const fh = (100 + lines.length * 19) * k;
  const fy = viewH - pad - fh;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = C.panel;
  fillRound(ctx, pad, fy, fw, fh, 8 * k);
  ctx.strokeStyle = C.line;
  strokeRound(ctx, pad, fy, fw, fh, 8 * k);
  ctx.fillStyle = C.amber;
  ctx.fillRect(pad, fy + 14 * k, 3, fh - 28 * k);
  label(ctx, fact.title, pad + 18 * k, fy + 26 * k, C.amber, 12 * k, "left", 700);
  label(ctx, fact.value, pad + 18 * k, fy + 60 * k, C.white, 30 * k, "left", 700);
  lines.forEach((text, i) => label(ctx, text, pad + 18 * k, fy + (86 + i * 19) * k, "#B7C5D4", 14 * k, "left"));
  label(ctx, `Source: ${fact.source}`, pad + 18 * k, fy + fh - 14 * k, C.gray, 11 * k, "left");
  ctx.restore();
}

// ---------------------------------------------------------------- helpers

function cutDip(t: number): number {
  let dip = 0;
  for (const at of [BEATS.depart, BEATS.transfer, BEATS.orbit, BEATS.landing]) {
    dip = Math.max(dip, 1 - Math.abs(t - at) / 0.28);
  }
  return clamp(dip, 0, 1);
}

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size: number,
  align: CanvasTextAlign,
  weight = 400,
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, y);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > width && current) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines;
}

function roundPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRound(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  roundPath(ctx, x, y, w, h, r);
  ctx.fill();
}

function strokeRound(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  roundPath(ctx, x, y, w, h, r);
  ctx.stroke();
}

function quad(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, s: number) {
  const m = 1 - s;
  return { x: m * m * a.x + 2 * m * s * b.x + s * s * c.x, y: m * m * a.y + 2 * m * s * b.y + s * s * c.y };
}

function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(", ")})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function easeIn(t: number): number {
  return t * t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
