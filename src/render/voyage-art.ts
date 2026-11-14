// Earth-to-Moon sequence (≈33 s). Flat, illustrated shapes in the facility palette,
// now with camera moves, parallax layers, a window view for Earthrise and a pull-back reveal.
// Scenes are drawn in a 1280 × 720 virtual stage scaled to cover the screen.
// The HUD (phase, mission clock, readouts, fact card) is drawn in screen space so it is never cropped.

import { BEATS, CUTS, FACTS, VOYAGE_DURATION, descentReadout, formatClock, missionSeconds, phaseAt } from "../content/voyage";

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
type Ctx = CanvasRenderingContext2D;

export function drawVoyage(ctx: Ctx, viewW: number, viewH: number, time: number): void {
  const t = clamp(time, 0, VOYAGE_DURATION);
  ctx.fillStyle = C.deep;
  ctx.fillRect(0, 0, viewW, viewH);

  const scale = Math.max(viewW / W, viewH / H);
  ctx.save();
  ctx.translate((viewW - W * scale) / 2, (viewH - H * scale) / 2);
  ctx.scale(scale, scale);
  if (t < BEATS.depart) drawLaunch(ctx, t);
  else if (t < BEATS.transfer) drawDepart(ctx, t, span(t, BEATS.depart, BEATS.transfer));
  else if (t < BEATS.earthrise) drawTransfer(ctx, t, span(t, BEATS.transfer, BEATS.earthrise));
  else if (t < BEATS.orbit) drawEarthrise(ctx, t, span(t, BEATS.earthrise, BEATS.orbit));
  else if (t < BEATS.landing) drawOrbit(ctx, t, span(t, BEATS.orbit, BEATS.landing));
  else drawLanding(ctx, t);
  ctx.restore();

  drawWipe(ctx, viewW, viewH, t);
  drawLetterbox(ctx, viewW, viewH);
  drawHud(ctx, viewW, viewH, t);
}

// ---------------------------------------------------------------- shot 1–3: countdown, liftoff, climb

function drawLaunch(ctx: Ctx, t: number): void {
  const since = Math.max(0, t - BEATS.liftoff);
  const climb = 120 * since * since; // world units above the pad
  const cam = Math.max(0, climb - 240); // camera follows once the rocket clears the lower third
  const rocketBase = 600 - climb + cam;
  const sky = clamp(cam / 2600, 0, 1);

  // Sky darkens as the rocket climbs out of the atmosphere.
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, mixHex("#3A6A96", "#03060C", sky));
  gradient.addColorStop(0.7, mixHex("#86B2D2", "#0B1426", sky));
  gradient.addColorStop(1, mixHex("#D8C9A8", "#1E3B62", sky));
  ctx.fillStyle = gradient;
  ctx.fillRect(-W, -H, W * 3, H * 3);
  drawStarfield(ctx, t, clamp((sky - 0.45) / 0.4, 0, 1));

  // Earth's curved limb appears at the bottom once the sky is nearly black.
  const limb = clamp((sky - 0.55) / 0.35, 0, 1);
  if (limb > 0) {
    ctx.save();
    ctx.globalAlpha = limb;
    const ly = H + 1500 - limb * 260;
    const atmo = ctx.createRadialGradient(W / 2, ly, 1500, W / 2, ly, 1600);
    atmo.addColorStop(0, "rgba(120, 200, 255, 0.85)");
    atmo.addColorStop(1, "rgba(120, 200, 255, 0)");
    ctx.fillStyle = atmo;
    ctx.beginPath();
    ctx.arc(W / 2, ly, 1600, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.ocean;
    ctx.beginPath();
    ctx.arc(W / 2, ly, 1500, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 9; i += 1) {
      ctx.beginPath();
      ctx.ellipse(120 + i * 140, ly - 1500 + 30 + (i % 3) * 14, 70, 9, 0.05 * (i % 2 ? 1 : -1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.save();
  if (since > 0 && since < 2.4) {
    const shake = (2.4 - since) * 3.2;
    ctx.translate(Math.sin(t * 61) * shake, Math.cos(t * 47) * shake);
  }

  // Far layer: sea horizon and distant hills (slow parallax).
  const far = 600 + cam * 0.3;
  if (far < H + 300) {
    ctx.fillStyle = mixHex("#5E86A6", "#1A2B40", sky);
    ctx.fillRect(-W, far - 70, W * 3, 80);
    ctx.fillStyle = mixHex("#4C6F8C", "#14233A", sky);
    ridge(ctx, far - 40, [0, 22, 8, 30, 14, 4, 26, 10, 18, 2, 24, 6]);
  }
  // Mid layer: assembly building and water tower.
  const mid = 600 + cam * 0.6;
  if (mid < H + 400) {
    ctx.fillStyle = mixHex("#2E4660", "#14213A", sky);
    ctx.fillRect(140, mid - 190, 150, 190);
    ctx.fillStyle = mixHex("#40607E", "#1A2B48", sky);
    ctx.fillRect(140, mid - 190, 150, 12);
    ctx.fillStyle = "rgba(85, 213, 233, 0.35)";
    ctx.fillRect(170, mid - 150, 90, 6);
    ctx.fillStyle = mixHex("#2E4660", "#14213A", sky);
    ctx.fillRect(1000, mid - 120, 8, 120);
    ctx.fillRect(1030, mid - 120, 8, 120);
    ctx.beginPath();
    ctx.ellipse(1019, mid - 128, 34, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0E1724";
    ctx.fillRect(-W, mid - 2, W * 3, 400);
  }
  // Clouds the rocket climbs through.
  drawClouds(ctx, cam, t);

  // Near layer: pad, tower, smoke.
  const ground = 600 + cam;
  if (ground < H + 500) {
    ctx.fillStyle = "#1A2A3D";
    ctx.fillRect(-W, ground, W * 3, H + 500);
    ctx.fillStyle = "#4A5A6E";
    ctx.fillRect(520, ground - 8, 240, 18);
    ctx.fillStyle = "#2B3A4E";
    ctx.fillRect(560, ground + 10, 160, 30);
    drawTower(ctx, 548, ground, t, since > 0);
  }

  drawLauncher(ctx, 640, rocketBase, t, since, cam);
  if (ground < H + 500) drawSmoke(ctx, since, ground);
  ctx.restore();

  if (t < BEATS.liftoff + 0.8) {
    const label = t < 1 ? "3" : t < 2 ? "2" : t < BEATS.liftoff ? "1" : "LIFTOFF";
    const local = t < BEATS.liftoff ? t % 1 : (t - BEATS.liftoff) / 0.8;
    ctx.save();
    ctx.globalAlpha = 1 - local * 0.7;
    ctx.fillStyle = label === "LIFTOFF" ? C.amber : C.white;
    ctx.font = `700 ${label === "LIFTOFF" ? 72 : 150 - local * 30}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, W / 2 + 260, 260);
    ctx.restore();
  }
}

function drawClouds(ctx: Ctx, cam: number, t: number): void {
  // A cloud deck 900 world units above the pad, passing at 90% of camera speed.
  const base = 600 - 900 + cam * 0.9;
  if (base < -200 || base > H + 200) return;
  ctx.save();
  for (let i = 0; i < 14; i += 1) {
    const x = ((i * 173 + t * 12) % (W + 400)) - 200;
    const y = base + ((i * 37) % 60) - 30;
    const r = 50 + (i % 4) * 22;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = i % 3 === 0 ? "#DCE6F0" : "#F2F6FA";
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.8, r * 0.5, 0, 0, Math.PI * 2);
    ctx.ellipse(x + r * 0.6, y - r * 0.2, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- shot 4: burn toward the Moon

function drawDepart(ctx: Ctx, t: number, u: number): void {
  ctx.fillStyle = C.deep;
  ctx.fillRect(-W, -H, W * 3, H * 3);
  drawStarfield(ctx, t, 1, u * 30);

  // Camera slowly pulls away: Earth shrinks.
  const e = easeOut(u);
  const radius = lerp(820, 300, e);
  drawEarth(ctx, lerp(520, 300, e), H + radius * 0.45 - e * 120, radius, t, true);

  // Sun glint on Earth's limb.
  const glint = ctx.createRadialGradient(1180, 140, 0, 1180, 140, 260);
  glint.addColorStop(0, "rgba(255, 244, 220, 0.55)");
  glint.addColorStop(0.15, "rgba(255, 220, 160, 0.18)");
  glint.addColorStop(1, "rgba(255, 220, 160, 0)");
  ctx.fillStyle = glint;
  ctx.fillRect(0, 0, W, H);

  const x = lerp(620, 940, easeInOut(u));
  const y = lerp(380, 250, easeInOut(u));
  const angle = 1.15;

  // The spent core stage drops behind the craft before the injection burn.
  if (u < 0.45) {
    const back = 26 + u * 260;
    ctx.save();
    ctx.globalAlpha = 1 - u / 0.45;
    ctx.translate(x - Math.sin(angle) * back, y + Math.cos(angle) * back);
    ctx.rotate(angle + u * 0.8);
    ctx.scale(0.9, 0.9);
    drawCoreStage(ctx, 0, 0);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(1.6, 1.6);
  const burn = u > 0.12 && u < 0.7 ? Math.sin(((u - 0.12) / 0.58) * Math.PI) : 0;
  drawCraft(ctx, 0, 0, t, { flame: burn, legs: 0 });
  ctx.restore();
}

// ---------------------------------------------------------------- shot 5: route map

function drawTransfer(ctx: Ctx, t: number, u: number): void {
  ctx.fillStyle = "#060B15";
  ctx.fillRect(-W, -H, W * 3, H * 3);
  drawStarfield(ctx, t, 0.6);

  // Faint navigation grid.
  ctx.save();
  ctx.strokeStyle = "rgba(85, 213, 233, 0.07)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  const earth = { x: 230, y: 380, r: 74 };
  const moon = { x: 1070, y: 250, r: 40 };
  const p0 = { x: 304, y: 350 };
  const p1 = { x: 660, y: 40 };
  const p2 = { x: 1030, y: 262 };

  // Moon's orbit arc around Earth (not to scale).
  ctx.save();
  ctx.strokeStyle = "rgba(201, 211, 222, 0.12)";
  ctx.setLineDash([3, 9]);
  ctx.beginPath();
  ctx.arc(earth.x, earth.y, Math.hypot(moon.x - earth.x, moon.y - earth.y), -0.55, 0.15);
  ctx.stroke();
  ctx.restore();

  drawEarth(ctx, earth.x, earth.y, earth.r, t, false);
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
  ctx.shadowColor = C.cyan;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let i = 0; i <= 50; i += 1) {
    const point = quad(p0, p1, p2, (s * i) / 50);
    if (i === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
  ctx.restore();

  const here = quad(p0, p1, p2, s);
  const ahead = quad(p0, p1, p2, Math.min(1, s + 0.01));

  // Radio pulses travel from Earth to the craft (Mission Control keeps in touch).
  for (let k = 0; k < 3; k += 1) {
    const phase = ((t * 0.7 + k / 3) % 1 + 1) % 1;
    const px = lerp(earth.x, here.x, phase);
    const py = lerp(earth.y, here.y, phase);
    ctx.save();
    ctx.globalAlpha = 0.6 * (1 - phase);
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 6 + phase * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const glow = ctx.createRadialGradient(here.x, here.y, 0, here.x, here.y, 30);
  glow.addColorStop(0, "rgba(85, 213, 233, 0.6)");
  glow.addColorStop(1, "rgba(85, 213, 233, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(here.x - 30, here.y - 30, 60, 60);
  ctx.save();
  ctx.translate(here.x, here.y);
  ctx.rotate(Math.atan2(ahead.y - here.y, ahead.x - here.x) + Math.PI / 2);
  ctx.scale(0.45, 0.45);
  drawCraft(ctx, 0, 40, t, { flame: 0, legs: 0 });
  ctx.restore();

  label(ctx, "EARTH", earth.x, earth.y + earth.r + 30, C.light, 14, "center", 700);
  label(ctx, "MOON", moon.x, moon.y + moon.r + 26, C.light, 14, "center", 700);

  // Trip progress: compressed mission time and distance (illustrative).
  const bx = 560;
  const by = 640;
  const bw = 440;
  ctx.fillStyle = "rgba(232, 239, 245, 0.14)";
  fillRound(ctx, bx, by, bw, 6, 3);
  ctx.fillStyle = C.cyan;
  fillRound(ctx, bx, by, Math.max(6, bw * s), 6, 3);
  for (let d = 1; d < 3; d += 1) {
    ctx.fillStyle = "rgba(232, 239, 245, 0.4)";
    ctx.fillRect(bx + (bw * d) / 3 - 1, by - 4, 2, 14);
  }
  label(ctx, "LAUNCH", bx, by - 12, C.gray, 12, "left");
  label(ctx, "ARRIVAL", bx + bw, by - 12, C.gray, 12, "right");
  label(ctx, `DAY ${Math.min(3, Math.floor(s * 3) + 1)} OF 3`, bx + bw / 2, by - 12, C.white, 14, "center", 700);
  label(ctx, `${Math.round(s * 384400).toLocaleString("en-US")} km from Earth`, bx + bw / 2, by + 26, C.light, 13, "center");
  label(ctx, "Illustration — distances and sizes not to scale", W - 40, H - 30, C.gray, 12, "right");
}

// ---------------------------------------------------------------- shot 6: Earthrise through the window

function drawEarthrise(ctx: Ctx, t: number, u: number): void {
  ctx.fillStyle = "#03050A";
  ctx.fillRect(-W, -H, W * 3, H * 3);
  // The view drifts gently, as if the craft is slowly turning.
  const drift = u * 40;
  drawStarfield(ctx, t, 1, drift);

  // Earth rises from behind the lunar horizon. Light comes from the left, as in the 1968 photo.
  const horizonY = 520;
  const ex = 760 - u * 30;
  const ey = lerp(horizonY + 60, horizonY - 170, easeOut(u));
  drawEarth(ctx, ex, ey, 78, t, false, true);

  // Lunar horizon: a huge curve seen from orbit, grey regolith with craters.
  ctx.save();
  const R = 2600;
  const cy = horizonY + R;
  ctx.beginPath();
  ctx.arc(W / 2 - drift, cy, R, 0, Math.PI * 2);
  const ground = ctx.createLinearGradient(0, horizonY - 10, 0, H);
  ground.addColorStop(0, "#A3A9B2");
  ground.addColorStop(0.25, "#7C828C");
  ground.addColorStop(1, "#3A3F48");
  ctx.fillStyle = ground;
  ctx.fill();
  ctx.clip();
  for (let i = 0; i < 26; i += 1) {
    const x = ((i * 197) % 1500) - 110 - drift * 1.5;
    const y = horizonY + 20 + ((i * 61) % 190);
    const rx = 14 + (i % 5) * 9 + (y - horizonY) * 0.12;
    ctx.fillStyle = "rgba(40, 45, 54, 0.45)";
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(220, 226, 232, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x - 2, y - 1, rx, rx * 0.28, 0, Math.PI * 1.05, Math.PI * 1.75);
    ctx.stroke();
  }
  ctx.restore();

  drawWindowFrame(ctx, t);
  label(ctx, "VIEW FROM THE SELENE WINDOW", W / 2, 96, "rgba(201, 211, 222, 0.75)", 13, "center", 700);
}

/** Capsule window: dark frame, rounded opening, bolts and a faint reflection. */
function drawWindowFrame(ctx: Ctx, t: number): void {
  const x = 150;
  const y = 70;
  const w = W - 300;
  const h = H - 140;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-W, -H, W * 3, H * 3);
  roundPath(ctx, x, y, w, h, 90);
  ctx.fillStyle = "#141C29";
  ctx.fill("evenodd");
  ctx.strokeStyle = "#2F3D52";
  ctx.lineWidth = 14;
  strokeRound(ctx, x, y, w, h, 90);
  ctx.strokeStyle = "#55667E";
  ctx.lineWidth = 3;
  strokeRound(ctx, x - 9, y - 9, w + 18, h + 18, 98);
  ctx.fillStyle = "#8C9AAD";
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    const bx = W / 2 + Math.cos(a) * (w / 2 + 26);
    const by = H / 2 + Math.sin(a) * (h / 2 + 26);
    ctx.beginPath();
    ctx.arc(bx, by, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Reflection streak on the glass.
  ctx.beginPath();
  roundPath(ctx, x, y, w, h, 90);
  ctx.clip();
  const sweep = ((t * 0.08) % 1) * (w + 400) - 200;
  const glass = ctx.createLinearGradient(x + sweep, y, x + sweep + 200, y + h);
  glass.addColorStop(0, "rgba(255, 255, 255, 0)");
  glass.addColorStop(0.5, "rgba(200, 230, 255, 0.06)");
  glass.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glass;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // Small cabin indicator lights on the frame.
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = Math.sin(t * 3 + i) > 0.2 ? [C.cyan, C.amber, "#7BD88F"][i] : "#24303F";
    ctx.beginPath();
    ctx.arc(W - 120 + i * 18, H - 40, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- shot 7: south pole orbit

function drawOrbit(ctx: Ctx, t: number, u: number): void {
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

// ---------------------------------------------------------------- shot 8: descent, touchdown, pull-back

function drawLanding(ctx: Ctx, t: number): void {
  const descent = clamp((t - BEATS.landing) / (BEATS.touchdown - BEATS.landing), 0, 1);
  const landed = t >= BEATS.touchdown;
  const groundY = 572;
  // After touchdown the camera pulls back to reveal the whole base.
  const pull = easeInOut(clamp((t - BEATS.pullback) / (VOYAGE_DURATION - BEATS.pullback - 0.3), 0, 1));
  const zoom = lerp(1, 0.58, pull);

  ctx.save();
  ctx.translate(640, lerp(groundY, 470, pull));
  ctx.scale(zoom, zoom);
  ctx.translate(-640, -groundY);

  ctx.fillStyle = C.deep;
  ctx.fillRect(-W * 2, -H * 2, W * 5, H * 5);
  drawStarfield(ctx, t, 1, 0, true);

  // Low Sun on the left horizon: near the pole it never climbs high, so shadows are long.
  const sun = ctx.createRadialGradient(-260, 520, 0, -260, 520, 760);
  sun.addColorStop(0, "rgba(255, 236, 200, 0.55)");
  sun.addColorStop(0.25, "rgba(240, 168, 75, 0.16)");
  sun.addColorStop(1, "rgba(240, 168, 75, 0)");
  ctx.fillStyle = sun;
  ctx.fillRect(-W * 2, -H * 2, W * 5, H * 5);

  // Earth hangs low over the horizon as seen from the lunar south pole.
  drawEarth(ctx, 780, 405, 26, t, false);

  ctx.fillStyle = "#262D39";
  ridge(ctx, 470, [0, 30, 12, 46, 20, 8, 38, 16, 26, 4, 34, 14, 42, 10, 22, 6, 30, 12], 3);
  ctx.fillStyle = "#353D4A";
  ridge(ctx, 520, [10, 0, 24, 8, 30, 14, 2, 20, 6, 16, 4, 22, 10, 28, 8, 18, 2, 12], 3);

  const groundGrad = ctx.createLinearGradient(0, groundY - 20, 0, H + 200);
  groundGrad.addColorStop(0, "#7C828C");
  groundGrad.addColorStop(1, "#3F444D");
  ctx.fillStyle = groundGrad;
  ctx.beginPath();
  ctx.moveTo(-W * 2, groundY + 10);
  ctx.quadraticCurveTo(300, groundY - 14, 640, groundY);
  ctx.quadraticCurveTo(980, groundY + 10, W * 3, groundY - 4);
  ctx.lineTo(W * 3, H * 3);
  ctx.lineTo(-W * 2, H * 3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(40, 45, 54, 0.6)";
  for (let i = 0; i < 70; i += 1) {
    const x = ((i * 211) % 3400) - 1100;
    const y = groundY + 18 + ((i * 53) % 300);
    ctx.beginPath();
    ctx.ellipse(x, y, 10 + (i % 4) * 7, 3 + (i % 3), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBaseWest(ctx, groundY, t);
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

  const craftX = 640 - (1 - descent) * (1 - descent) * 260;
  const craftY = lerp(-120, groundY - 2, easeOut(descent));
  const altitude = groundY - craftY;
  // Settling bounce: the legs compress briefly on contact.
  const settle = landed ? Math.max(0, Math.sin((t - BEATS.touchdown) * 12) * Math.exp(-(t - BEATS.touchdown) * 5)) * 3 : 0;

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
  ctx.translate(craftX, craftY + settle);
  ctx.scale(1.7, 1.7);
  const flame = landed ? 0 : 0.55 + (altitude < 160 ? 0.4 : 0);
  drawCraft(ctx, 0, 0, t, { flame, legs: clamp((t - BEATS.legs) / 0.7, 0, 1) });
  ctx.restore();

  ctx.restore();

  if (pull > 0.2) {
    ctx.save();
    ctx.globalAlpha = clamp((pull - 0.2) / 0.4, 0, 1);
    label(ctx, "SELENE BASE", W / 2, 150, C.white, 34, "center", 700);
    label(ctx, "LUNAR SOUTH POLE · 2048", W / 2, 182, C.cyan, 15, "center", 700);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- pieces

interface CraftOptions {
  flame: number;
  legs: number;
}

/** The Selene craft (capsule over a landing stage). Origin is the engine exit, pointing up. */
function drawCraft(ctx: Ctx, x: number, y: number, t: number, opts: CraftOptions): void {
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
  ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
  ctx.fillRect(4, -60, 11, 48);
  ctx.fillStyle = C.cyan;
  ctx.fillRect(-15, -42, 30, 5);
  ctx.fillStyle = C.amber;
  ctx.fillRect(-15, -20, 30, 3);
  // Thruster quads.
  ctx.fillStyle = "#9AA6B4";
  ctx.fillRect(-18, -36, 3, 8);
  ctx.fillRect(15, -36, 3, 8);

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

function drawCoreStage(ctx: Ctx, x: number, top: number): void {
  ctx.fillStyle = "#D98B3A";
  fillRound(ctx, x - 16, top, 32, 160, 4);
  ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
  ctx.fillRect(x + 4, top, 12, 160);
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.fillRect(x - 16, top + 30, 32, 3);
  ctx.fillRect(x - 16, top + 110, 32, 3);
  ctx.fillStyle = C.steel;
  ctx.fillRect(x - 12, top + 160, 24, 10);
}

function drawLauncher(ctx: Ctx, x: number, base: number, t: number, since: number, cam: number): void {
  const coreTop = base - 170;
  const sep = Math.max(0, t - BEATS.separation);
  const firing = since > 0;
  // Gravity turn: the stack leans slowly as it climbs.
  const tilt = clamp(since / 6, 0, 1) * 0.28;

  ctx.save();
  ctx.translate(x, base);
  ctx.rotate(tilt);
  ctx.translate(-x, -base);

  if (firing) {
    // Exhaust trail behind the rocket once it is airborne.
    if (cam > 0) {
      const trail = ctx.createLinearGradient(0, base, 0, base + 600);
      trail.addColorStop(0, "rgba(240, 200, 140, 0.45)");
      trail.addColorStop(1, "rgba(240, 200, 140, 0)");
      ctx.fillStyle = trail;
      ctx.beginPath();
      ctx.moveTo(x - 10, base);
      ctx.lineTo(x + 10, base);
      ctx.lineTo(x + 60, base + 600);
      ctx.lineTo(x - 60, base + 600);
      ctx.closePath();
      ctx.fill();
    }
    drawFlame(ctx, x, base, 14, 80 + Math.sin(t * 37) * 8 + Math.min(since, 1) * 50, 1);
    if (sep === 0) {
      drawFlame(ctx, x - 25, base + 4, 9, 70 + Math.sin(t * 41) * 6, 1);
      drawFlame(ctx, x + 25, base + 4, 9, 70 + Math.cos(t * 43) * 6, 1);
    }
  }

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(x + side * (25 + sep * 80), base + 4 + sep * sep * 180);
    ctx.rotate(side * sep * 0.7);
    ctx.globalAlpha = clamp(1 - sep / 1.8, 0, 1);
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
    ctx.fillStyle = C.amber;
    ctx.fillRect(-7, -20, 14, 3);
    ctx.restore();
  }

  drawCoreStage(ctx, x, coreTop);
  drawCraft(ctx, x, coreTop, t, { flame: 0, legs: 0 });
  ctx.restore();

  // Separation flash.
  if (sep > 0 && sep < 0.35) {
    ctx.save();
    ctx.globalAlpha = 1 - sep / 0.35;
    const flash = ctx.createRadialGradient(x, base, 0, x, base, 90);
    flash.addColorStop(0, "rgba(255, 245, 220, 0.9)");
    flash.addColorStop(1, "rgba(255, 245, 220, 0)");
    ctx.fillStyle = flash;
    ctx.fillRect(x - 90, base - 90, 180, 180);
    ctx.restore();
  }
}

function drawFlame(ctx: Ctx, x: number, y: number, halfWidth: number, length: number, power: number): void {
  ctx.save();
  ctx.globalAlpha = clamp(power, 0, 1);
  const glow = ctx.createRadialGradient(x, y + length * 0.3, 0, x, y + length * 0.3, length * 0.9);
  glow.addColorStop(0, "rgba(255, 200, 120, 0.35)");
  glow.addColorStop(1, "rgba(255, 200, 120, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - length, y - length * 0.6, length * 2, length * 1.8);
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

function drawTower(ctx: Ctx, x: number, ground: number, t: number, armOpen: boolean): void {
  const top = ground - 260;
  ctx.fillStyle = "#3D4F66";
  ctx.fillRect(x - 16, top, 32, 260);
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
  // Two access arms swing away at liftoff.
  ctx.fillStyle = "#4A5D76";
  for (const [dy, len] of [[66, 60], [150, 48]] as const) {
    ctx.save();
    ctx.translate(x + 16, top + dy);
    ctx.rotate(armOpen ? -0.75 : 0);
    ctx.fillRect(0, -4, len, 8);
    ctx.restore();
  }
  // Lightning mast.
  ctx.fillStyle = "#3D4F66";
  ctx.fillRect(x - 2, top - 40, 4, 40);
  ctx.fillStyle = Math.sin(t * 5) > 0 ? C.amber : "#6B4A22";
  ctx.beginPath();
  ctx.arc(x, top - 44, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawSmoke(ctx: Ctx, since: number, ground: number): void {
  if (since <= 0) return;
  ctx.save();
  // Exhaust and water-deluge steam billow out sideways from the flame trench, then rise and thin out.
  for (let i = 0; i < 48; i += 1) {
    const age = since - (i % 24) * 0.045;
    if (age <= 0) continue;
    const side = i % 2 === 0 ? -1 : 1;
    const jitter = ((i * 37) % 11) / 11;
    const reach = age * (90 + jitter * 70) + (i % 5) * 10;
    const rise = age * (10 + jitter * 22) + (i >= 24 ? 30 + age * 20 : 0);
    const radius = 16 + age * (34 + jitter * 26);
    ctx.globalAlpha = clamp(0.75 * (1 - age / 5.5), 0, 0.75);
    ctx.fillStyle = ["#AEB9C6", "#C9D3DE", "#E4EAF0", "#9AA6B4"][i % 4];
    ctx.beginPath();
    ctx.arc(640 + side * reach, ground - 10 - rise, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bright core where the flame hits the trench.
  const core = ctx.createRadialGradient(640, ground - 6, 0, 640, ground - 6, 120);
  core.addColorStop(0, `rgba(255, 220, 160, ${clamp(0.6 - since * 0.08, 0, 0.6)})`);
  core.addColorStop(1, "rgba(255, 220, 160, 0)");
  ctx.globalAlpha = 1;
  ctx.fillStyle = core;
  ctx.fillRect(520, ground - 126, 240, 240);
  ctx.restore();
}

function drawEarth(ctx: Ctx, x: number, y: number, r: number, t: number, cityLights: boolean, sideLit = false): void {
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
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  for (const [ax, ay, rx, ry, rot] of [
    [-0.45, 0.1, 0.34, 0.06, -0.2],
    [0.05, -0.6, 0.3, 0.05, 0.15],
    [0.2, 0.3, 0.36, 0.05, -0.1],
    [-0.2, -0.15, 0.25, 0.04, 0.3],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(x + ax * r, y + ay * r, rx * r, ry * r, rot, 0, Math.PI * 2);
    ctx.fill();
  }
  // Night side: from the right normally; for Earthrise only the left part is lit.
  ctx.fillStyle = "rgba(5, 8, 15, 0.55)";
  ctx.beginPath();
  if (sideLit) ctx.arc(x + r * 0.35, y + r * 0.15, r * 1.02, 0, Math.PI * 2);
  else ctx.arc(x + r * 0.55, y + r * 0.2, r * 1.05, 0, Math.PI * 2);
  ctx.fill();
  if (cityLights) {
    ctx.fillStyle = "rgba(255, 210, 130, 0.75)";
    for (let i = 0; i < 40; i += 1) {
      const a = 0.2 + (i * 0.37) % 1.3;
      const d = 0.35 + ((i * 53) % 60) / 100;
      ctx.fillRect(x + Math.cos(a) * d * r, y - Math.sin(a) * d * r * 0.4 + r * 0.05, 2.5, 2.5);
    }
  }
  ctx.restore();
}

function drawMoonDisc(ctx: Ctx, x: number, y: number, r: number, detailed: boolean): void {
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
    for (let i = 0; i < 26; i += 1) {
      const a = i * 2.4;
      const d = ((i * 37) % 92) / 100;
      const cr = 4 + (i % 5) * 4;
      const px = x + Math.cos(a) * d * r;
      const py = y + Math.sin(a) * d * r;
      ctx.strokeStyle = "rgba(90, 96, 106, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, cr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(240, 244, 248, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, cr, Math.PI * 0.6, Math.PI * 1.4);
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

function drawOrbitCraft(ctx: Ctx, p: { x: number; y: number }, angle: number, t: number): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle + Math.PI);
  ctx.scale(0.55, 0.55);
  drawCraft(ctx, 0, 40, t, { flame: 0, legs: 0 });
  ctx.restore();
}

function drawBase(ctx: Ctx, ground: number, t: number): void {
  // Long shadows to the right of each structure.
  ctx.fillStyle = "rgba(30, 35, 43, 0.55)";
  ctx.beginPath();
  ctx.moveTo(800, ground);
  ctx.lineTo(1460, ground + 18);
  ctx.lineTo(1460, ground + 4);
  ctx.lineTo(1100, ground - 2);
  ctx.closePath();
  ctx.fill();

  // Vertical solar arrays: at the pole the Sun stays near the horizon.
  for (const sx of [1196, 1330, 1460]) solarMast(ctx, sx, ground);

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
  for (const [x, r] of [[860, 66], [1150, 38]] as const) dome(ctx, x, ground, r);

  label(ctx, "HABITAT", 1015, ground - 118, C.cyan, 13, "center", 700);
}

/** Extra structures west of the pad, only seen once the camera pulls back. */
function drawBaseWest(ctx: Ctx, ground: number, t: number): void {
  // Rover garage and a parked rover with tracks leading to the pad.
  ctx.fillStyle = "#AEB8C4";
  fillRound(ctx, 250, ground - 64, 150, 64, 10);
  ctx.fillStyle = "#2A3240";
  fillRound(ctx, 290, ground - 46, 70, 46, 6);
  ctx.fillStyle = C.amber;
  ctx.fillRect(250, ground - 12, 150, 4);
  ctx.fillStyle = "#C9D3DE";
  fillRound(ctx, 432, ground - 22, 44, 14, 4);
  ctx.fillStyle = C.amber;
  ctx.fillRect(432, ground - 12, 44, 3);
  ctx.fillStyle = "#2A3240";
  for (const x of [440, 468]) {
    ctx.beginPath();
    ctx.arc(x, ground - 4, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Ice processing towers.
  for (const [x, h] of [[40, 120], [90, 90]] as const) {
    ctx.fillStyle = "#C9D3DE";
    fillRound(ctx, x, ground - h, 36, h, 8);
    ctx.fillStyle = "#9FE3F0";
    fillRound(ctx, x + 8, ground - h + 16, 20, h * 0.4, 4);
  }
  // Comms tower with a blinking beacon.
  ctx.strokeStyle = "#8C9AAD";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-120, ground);
  ctx.lineTo(-100, ground - 230);
  ctx.lineTo(-80, ground);
  ctx.moveTo(-112, ground - 120);
  ctx.lineTo(-88, ground - 120);
  ctx.stroke();
  ctx.fillStyle = Math.sin(t * 4) > 0 ? "#FF6B5A" : "#5A2A24";
  ctx.beginPath();
  ctx.arc(-100, ground - 236, 5, 0, Math.PI * 2);
  ctx.fill();
  dome(ctx, -260, ground, 54);
  solarMast(ctx, -400, ground);
  label(ctx, "GARAGE", 325, ground - 80, C.cyan, 13, "center", 700);
}

function solarMast(ctx: Ctx, x: number, ground: number): void {
  ctx.fillStyle = "#59616D";
  ctx.fillRect(x, ground - 210, 6, 210);
  ctx.fillStyle = "#24507E";
  fillRound(ctx, x - 26, ground - 206, 58, 120, 3);
  ctx.strokeStyle = "rgba(85, 213, 233, 0.45)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x - 26, ground - 206 + i * 20);
    ctx.lineTo(x + 32, ground - 206 + i * 20);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x + 3, ground - 206);
  ctx.lineTo(x + 3, ground - 86);
  ctx.stroke();
}

function dome(ctx: Ctx, x: number, ground: number, r: number): void {
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

function drawDust(ctx: Ctx, t: number, x: number, ground: number, altitude: number): void {
  // No air on the Moon: dust flies out in low, straight sprays and drops, it does not billow.
  if (altitude > 170) return;
  const after = Math.max(0, t - BEATS.touchdown);
  if (after > 1.8) return;
  const strength = clamp((170 - altitude) / 170, 0, 1) * clamp(1 - after / 1.8, 0, 1);
  ctx.save();
  ctx.fillStyle = "#AEB4BD";
  for (let i = 0; i < 70; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const phase = ((t * 1.8 + i * 0.137) % 1 + 1) % 1;
    const reach = 40 + phase * (200 + (i % 7) * 28);
    const lift = Math.sin(phase * Math.PI) * (6 + (i % 5) * 3);
    ctx.globalAlpha = strength * (1 - phase) * 0.8;
    ctx.fillRect(x + side * reach, ground - lift, 3, 2);
  }
  ctx.restore();
}

function drawStarfield(ctx: Ctx, t: number, alpha: number, drift = 0, wide = false): void {
  if (alpha <= 0) return;
  ctx.save();
  const count = wide ? 420 : 160;
  const spanW = wide ? W * 3 : W;
  const spanH = wide ? H * 2 : H;
  const ox = wide ? -W : 0;
  const oy = wide ? -H : 0;
  for (let i = 0; i < count; i += 1) {
    const x = ox + ((((i * 9301 + 49297) % 233280) / 233280) * spanW - drift * (0.3 + (i % 3) * 0.2) + spanW) % spanW;
    const y = oy + (((i * 4507 + 1213) % 9973) / 9973) * spanH;
    ctx.globalAlpha = alpha * (0.35 + (Math.sin(t * 1.3 + i) + 1) * 0.25);
    ctx.fillStyle = i % 7 === 0 ? C.cyan : C.white;
    const size = i % 9 === 0 ? 2.2 : 1.3;
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
}

function ridge(ctx: Ctx, base: number, heights: number[], stretch = 1): void {
  ctx.beginPath();
  const left = -W * stretch * 0.5 - 100;
  const width = W * stretch + 200;
  ctx.moveTo(left - W, base + 60);
  const step = width / (heights.length - 1);
  heights.forEach((h, i) => ctx.lineTo(left + i * step, base - h));
  ctx.lineTo(left + width + W, base + 60);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------- transitions and frame

/** A bright scan line sweeps across at each cut while the picture dips briefly. */
function drawWipe(ctx: Ctx, viewW: number, viewH: number, t: number): void {
  for (const at of CUTS) {
    const u = (t - (at - 0.3)) / 0.6;
    if (u < 0 || u > 1) continue;
    const dark = 1 - Math.abs(u - 0.5) * 2;
    ctx.fillStyle = `rgba(5, 8, 15, ${dark * 0.85})`;
    ctx.fillRect(0, 0, viewW, viewH);
    const x = u * (viewW + 200) - 100;
    const band = ctx.createLinearGradient(x - 80, 0, x + 80, 0);
    band.addColorStop(0, "rgba(85, 213, 233, 0)");
    band.addColorStop(0.5, `rgba(85, 213, 233, ${0.35 * dark + 0.1})`);
    band.addColorStop(1, "rgba(85, 213, 233, 0)");
    ctx.fillStyle = band;
    ctx.fillRect(x - 80, 0, 160, viewH);
  }
}

function drawLetterbox(ctx: Ctx, viewW: number, viewH: number): void {
  const bar = Math.round(viewH * 0.035);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, viewW, bar);
  ctx.fillRect(0, viewH - bar, viewW, bar);
}

// ---------------------------------------------------------------- HUD (screen space)

function drawHud(ctx: Ctx, viewW: number, viewH: number, t: number): void {
  const k = clamp(viewW / 1100, 0.78, 1.15);
  const pad = 20 * k + viewH * 0.035;

  // Phase + mission clock.
  const pw = 320 * k;
  const ph = 98 * k;
  ctx.fillStyle = C.panel;
  fillRound(ctx, pad, pad, pw, ph, 8 * k);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  strokeRound(ctx, pad, pad, pw, ph, 8 * k);
  label(ctx, "PROJECT SELENE · 2048 · FICTIONAL MISSION", pad + 16 * k, pad + 24 * k, C.gray, 11 * k, "left", 600);
  label(ctx, phaseAt(t), pad + 16 * k, pad + 52 * k, C.cyan, 19 * k, "left", 700);
  label(ctx, formatClock(missionSeconds(t)), pad + 16 * k, pad + 80 * k, C.white, 15 * k, "left", 600);
  label(ctx, "MISSION CLOCK · ILLUSTRATIVE", pad + pw - 14 * k, pad + 80 * k, C.gray, 9 * k, "right", 600);

  // Descent readout (top right).
  const readout = descentReadout(t);
  if (readout) {
    const rw = 230 * k;
    const rh = 112 * k;
    const rx = viewW - pad - rw;
    ctx.fillStyle = C.panel;
    fillRound(ctx, rx, pad, rw, rh, 8 * k);
    ctx.strokeStyle = C.line;
    strokeRound(ctx, rx, pad, rw, rh, 8 * k);
    label(ctx, "ALTITUDE", rx + 16 * k, pad + 24 * k, C.gray, 11 * k, "left", 700);
    label(ctx, `${readout.altitude.toLocaleString("en-US")} m`, rx + rw - 16 * k, pad + 26 * k, C.white, 20 * k, "right", 700);
    label(ctx, "DESCENT RATE", rx + 16 * k, pad + 58 * k, C.gray, 11 * k, "left", 700);
    label(ctx, `${readout.speed.toFixed(1)} m/s`, rx + rw - 16 * k, pad + 60 * k, readout.speed < 3 ? "#7BD88F" : C.amber, 20 * k, "right", 700);
    const bar = clamp(readout.altitude / 2000, 0, 1);
    ctx.fillStyle = "rgba(232, 239, 245, 0.14)";
    fillRound(ctx, rx + 16 * k, pad + 76 * k, rw - 32 * k, 5 * k, 2);
    ctx.fillStyle = C.cyan;
    fillRound(ctx, rx + 16 * k, pad + 76 * k, Math.max(4, (rw - 32 * k) * bar), 5 * k, 2);
    label(ctx, "ILLUSTRATIVE NUMBERS", rx + 16 * k, pad + 100 * k, C.gray, 9 * k, "left", 600);
  }

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
  ctx.translate(0, (1 - alpha) * 12 * k);
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

function span(t: number, a: number, b: number): number {
  return clamp((t - a) / (b - a), 0, 1);
}

function label(ctx: Ctx, text: string, x: number, y: number, color: string, size: number, align: CanvasTextAlign, weight = 400): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, y);
}

function wrap(ctx: Ctx, text: string, width: number): string[] {
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

function roundPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRound(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  roundPath(ctx, x, y, w, h, r);
  ctx.fill();
}

function strokeRound(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
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
