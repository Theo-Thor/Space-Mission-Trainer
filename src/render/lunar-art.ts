// Original lunar-base furniture, drawn in code to match the facility kit:
// dark outline, ivory shell, navy panels, orange trim, cyan glow.
type Ctx = CanvasRenderingContext2D;
export interface LP { kind: string; x: number; y: number; w: number; h: number; text?: string }

const K = {
  out: "#16202E", ivory: "#E6EAEE", light: "#CBD3DC", mid: "#9AA7B5", steel: "#6D7B8B", slate: "#46566A",
  navy: "#2D4062", navy2: "#223250", orange: "#F0A84B", cyan: "#55D5E9", glass: "rgba(120,220,240,0.35)",
  green: "#7BD88F", leaf: "#4FA865", leaf2: "#2F7A4A", dark: "#101826", white: "#F4F7FA", red: "#E0624F", violet: "#B779E8",
};

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number): void { c.beginPath(); c.roundRect(x, y, w, h, r); }
function blk(c: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, lw = 3): void {
  rr(c, x, y, w, h, r); c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.strokeStyle = K.out; c.stroke();
}
function vgrad(c: Ctx, y: number, h: number, a: string, b: string): CanvasGradient {
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, a); g.addColorStop(1, b); return g;
}
function hgrad(c: Ctx, x: number, w: number, a: string, b: string, m?: string): CanvasGradient {
  const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, a); if (m) g.addColorStop(0.45, m); g.addColorStop(1, b); return g;
}
function shadow(c: Ctx, p: LP, k = 0.5): void {
  c.fillStyle = "rgba(4,14,23,0.32)"; c.beginPath(); c.ellipse(p.x + p.w / 2 + 3, p.y + p.h - 3, p.w * k, Math.min(12, p.h * 0.14), 0, 0, Math.PI * 2); c.fill();
}
function led(c: Ctx, x: number, y: number, col: string, r = 2.6): void {
  c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = "rgba(255,255,255,0.7)"; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2); c.fill();
}
function line(c: Ctx, pts: number[], col: string, w: number): void {
  c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.stroke();
}
function hazard(c: Ctx, x: number, y: number, w: number, h: number): void {
  c.save(); rr(c, x, y, w, h, 2); c.clip(); c.fillStyle = K.orange; c.fillRect(x, y, w, h); c.fillStyle = K.dark;
  for (let i = -h; i < w + h; i += 12) { c.beginPath(); c.moveTo(x + i, y + h); c.lineTo(x + i + 6, y + h); c.lineTo(x + i + 6 + h, y); c.lineTo(x + i + h, y); c.fill(); }
  c.restore(); rr(c, x, y, w, h, 2); c.lineWidth = 2; c.strokeStyle = K.out; c.stroke();
}
function screen(c: Ctx, x: number, y: number, w: number, h: number, kind: "wave" | "bars" | "earth" | "cross" | "list" = "wave"): void {
  blk(c, x, y, w, h, 4, K.dark, 2.5); c.save(); rr(c, x + 2, y + 2, w - 4, h - 4, 3); c.clip();
  c.fillStyle = "#0E3342"; c.fillRect(x, y, w, h);
  c.strokeStyle = K.cyan; c.fillStyle = K.cyan; c.lineWidth = 1.6;
  if (kind === "wave") { c.beginPath(); for (let i = 0; i <= w; i += 3) c.lineTo(x + i, y + h / 2 + Math.sin(i * 0.35) * h * 0.22 * Math.sin(i * 0.07 + 1)); c.stroke(); }
  if (kind === "bars") for (let i = 0; i < 6; i++) { const bh = h * (0.25 + ((i * 37) % 10) / 16); c.fillRect(x + 6 + i * (w - 12) / 6, y + h - bh - 4, (w - 12) / 6 - 3, bh); }
  if (kind === "list") for (let i = 0; i < 3; i++) { c.fillRect(x + 6, y + 6 + i * (h - 8) / 3, w * 0.5, 3); c.fillRect(x + 6, y + 11 + i * (h - 8) / 3, w * 0.7, 2); }
  if (kind === "cross") { c.fillStyle = K.green; c.fillRect(x + w / 2 - 3, y + 5, 6, h - 10); c.fillRect(x + 5, y + h / 2 - 3, w - 10, 6); }
  if (kind === "earth") { c.fillStyle = "#2B7FD0"; c.beginPath(); c.arc(x + w * 0.3, y + h / 2, h * 0.34, 0, 7); c.fill(); c.fillStyle = K.leaf; c.beginPath(); c.arc(x + w * 0.27, y + h * 0.45, h * 0.12, 0, 7); c.fill(); c.fillStyle = K.cyan; for (let i = 0; i < 4; i++) c.fillRect(x + w * 0.6, y + 6 + i * (h - 10) / 4, w * 0.3 * (0.4 + ((i * 5) % 7) / 10), 3); }
  c.restore();
}
function bench(c: Ctx, p: LP, top = K.ivory, front = K.navy): void {
  shadow(c, p);
  blk(c, p.x, p.y + p.h * 0.42, p.w, p.h * 0.58, 8, vgrad(c, p.y + p.h * 0.4, p.h * 0.6, front, K.navy2));
  blk(c, p.x - 2, p.y + p.h * 0.18, p.w + 4, p.h * 0.34, 8, vgrad(c, p.y, p.h * 0.5, "#F6F8FA", top));
  c.fillStyle = K.orange; c.fillRect(p.x + 10, p.y + p.h * 0.74, p.w - 20, 3);
}
function pot(c: Ctx, x: number, y: number, s = 1): void {
  blk(c, x - 7 * s, y - 6 * s, 14 * s, 12 * s, 3, K.light, 2);
  c.fillStyle = K.leaf; c.strokeStyle = K.out; c.lineWidth = 1.6;
  for (const a of [-0.7, 0, 0.7]) { c.beginPath(); c.ellipse(x + a * 7 * s, y - 12 * s, 4 * s, 9 * s, a * 0.6, 0, 7); c.fill(); c.stroke(); }
}

type Painter = (c: Ctx, p: LP, t: number) => void;
const ART: Record<string, Painter> = {
  // ---------- SCIENCE LAB ----------
  microscope(c, p) {
    bench(c, p);
    blk(c, p.x + 26, p.y + 20, 34, 8, 3, K.slate, 2); blk(c, p.x + 38, p.y - 14, 10, 38, 3, K.mid, 2);
    blk(c, p.x + 36, p.y - 20, 26, 9, 4, K.navy, 2); blk(c, p.x + 20, p.y + 6, 12, 7, 2, K.steel, 2);
    blk(c, p.x + 96, p.y + 16, 34, 12, 4, K.light, 2); c.fillStyle = K.glass; c.beginPath(); c.ellipse(p.x + 113, p.y + 21, 12, 4, 0, 0, 7); c.fill();
    screen(c, p.x + 140, p.y - 12, 46, 32, "bars");
    led(c, p.x + 168, p.y + 28, K.green);
  },
  centrifuge(c, p) {
    shadow(c, p, 0.46);
    blk(c, p.x + 4, p.y + p.h * 0.45, p.w - 8, p.h * 0.55, 9, vgrad(c, p.y + 40, 40, K.navy, K.navy2));
    blk(c, p.x, p.y + 8, p.w, p.h * 0.62, 22, vgrad(c, p.y, 50, "#F6F8FA", K.light));
    c.strokeStyle = K.out; c.lineWidth = 2.5; c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 36, 30, 18, 0, 0, 7); c.stroke();
    c.fillStyle = K.dark; c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 36, 22, 12, 0, 0, 7); c.fill();
    c.strokeStyle = K.cyan; c.lineWidth = 3; c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 36, 22, 12, 0, 0.2, 5.2); c.stroke();
    led(c, p.x + 20, p.y + p.h - 18, K.orange); led(c, p.x + 34, p.y + p.h - 18, K.green);
  },
  freezer(c, p) {
    shadow(c, p);
    blk(c, p.x, p.y, p.w, p.h, 10, hgrad(c, p.x, p.w, K.light, "#AEBAC6", K.ivory));
    blk(c, p.x + 10, p.y + 22, p.w - 20, p.h - 40, 6, "#B8EAF4");
    c.fillStyle = "rgba(255,255,255,0.55)"; for (let i = 0; i < 5; i++) c.fillRect(p.x + 16 + i * 12, p.y + 28, 4, p.h - 54);
    blk(c, p.x + 16, p.y + 6, 36, 12, 3, K.dark, 2); c.fillStyle = K.cyan; c.font = "700 8px monospace"; c.fillText("-80C", p.x + 22, p.y + 15);
    blk(c, p.x + p.w - 20, p.y + 40, 6, 36, 2, K.slate, 2);
    hazard(c, p.x + 8, p.y + p.h - 12, p.w - 16, 7);
  },
  printer(c, p) {
    shadow(c, p);
    blk(c, p.x, p.y + p.h - 34, p.w, 34, 8, vgrad(c, p.y + p.h - 34, 34, K.navy, K.navy2));
    blk(c, p.x + 8, p.y + p.h - 62, p.w - 16, 32, 6, K.light);
    // printed regolith part (stacked layers)
    for (let i = 0; i < 5; i++) blk(c, p.x + 62 + i * 3, p.y + p.h - 78 + i * -0 - i * 8, 66 - i * 6, 10, 3, i % 2 ? "#8E8F96" : "#A3A4AB", 1.8);
    blk(c, p.x + 10, p.y + 4, 9, p.h - 40, 3, K.orange, 2.5); blk(c, p.x + p.w - 19, p.y + 4, 9, p.h - 40, 3, K.orange, 2.5);
    blk(c, p.x + 8, p.y + 2, p.w - 16, 12, 5, K.slate, 2.5);
    blk(c, p.x + 80, p.y + 8, 30, 22, 5, K.ivory, 2.5); c.fillStyle = K.orange; c.fillRect(p.x + 92, p.y + 30, 6, 12);
    led(c, p.x + p.w - 26, p.y + p.h - 18, K.cyan);
  },
  glovebox(c, p) {
    shadow(c, p);
    blk(c, p.x, p.y + p.h * 0.55, p.w, p.h * 0.45, 8, vgrad(c, p.y + 60, 50, K.navy, K.navy2));
    blk(c, p.x + 4, p.y + 4, p.w - 8, p.h * 0.6, 10, "rgba(160,232,246,0.38)");
    c.fillStyle = "rgba(255,255,255,0.35)"; c.beginPath(); c.moveTo(p.x + 20, p.y + 12); c.lineTo(p.x + 48, p.y + 12); c.lineTo(p.x + 30, p.y + 48); c.lineTo(p.x + 14, p.y + 48); c.fill();
    for (const gx of [0.28, 0.72]) { blk(c, p.x + p.w * gx - 15, p.y + p.h * 0.5, 30, 18, 9, K.dark, 2.5); c.fillStyle = K.orange; c.beginPath(); c.ellipse(p.x + p.w * gx, p.y + p.h * 0.5 + 9, 9, 5, 0, 0, 7); c.fill(); }
    c.fillStyle = "#8E8F96"; c.beginPath(); c.arc(p.x + p.w / 2, p.y + p.h * 0.3, 11, 0, 7); c.fill(); c.strokeStyle = K.out; c.lineWidth = 2; c.stroke();
  },
  samples(c, p) {
    shadow(c, p);
    blk(c, p.x, p.y + p.h - 26, p.w, 26, 6, K.navy); blk(c, p.x, p.y, p.w, p.h - 22, 6, K.light);
    const cols = ["#8E8F96", "#B39C84", "#6F7480", "#A49A8C", "#7D8793"];
    for (let i = 0; i < 7; i++) { const jx = p.x + 12 + i * ((p.w - 24) / 7);
      blk(c, jx, p.y + 12, 22, 30, 5, "rgba(190,235,245,0.55)", 2); c.fillStyle = cols[i % 5]; c.beginPath(); c.ellipse(jx + 11, p.y + 34, 7, 5, 0, 0, 7); c.fill();
      c.fillStyle = i % 2 ? K.orange : K.cyan; c.fillRect(jx + 4, p.y + 18, 14, 4); }
  },
  // ---------- ICE PROCESSING ----------
  icetank(c, p) {
    shadow(c, p);
    blk(c, p.x + 8, p.y + p.h - 18, p.w - 16, 18, 6, K.navy);
    blk(c, p.x, p.y + 18, p.w, p.h - 30, 14, hgrad(c, p.x, p.w, "#AEBAC6", "#8F9CAA", "#F2F5F8"));
    c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 20, p.w / 2, 18, 0, 0, 7); c.fillStyle = vgrad(c, p.y, 40, "#F8FAFB", K.light); c.fill(); c.lineWidth = 3; c.strokeStyle = K.out; c.stroke();
    blk(c, p.x + 20, p.y + 54, p.w - 40, 56, 10, "#BDEFFA", 2.5);
    c.fillStyle = "rgba(255,255,255,0.85)"; for (const [a, b, s] of [[34, 70, 12], [56, 90, 9], [70, 66, 10], [48, 78, 8]]) { c.beginPath(); c.moveTo(p.x + a, p.y + b); c.lineTo(p.x + a + s, p.y + b - 4); c.lineTo(p.x + a + s + 3, p.y + b + s); c.lineTo(p.x + a, p.y + b + s - 2); c.fill(); }
    blk(c, p.x + p.w - 8, p.y + 30, 14, 12, 3, K.orange, 2); line(c, [p.x + p.w + 2, p.y + 36, p.x + p.w + 14, p.y + 36, p.x + p.w + 14, p.y + p.h - 10], K.steel, 6);
    c.fillStyle = K.dark; c.beginPath(); c.arc(p.x + 24, p.y + 40, 9, 0, 7); c.fill(); c.fillStyle = K.cyan; c.fillRect(p.x + 23, p.y + 34, 2, 7);
    hazard(c, p.x + 12, p.y + p.h - 34, p.w - 24, 8);
  },
  melter(c, p, t) {
    shadow(c, p);
    blk(c, p.x, p.y + 44, p.w, p.h - 44, 12, vgrad(c, p.y + 40, 80, K.light, K.mid));
    blk(c, p.x + 20, p.y, p.w - 40, 52, 8, K.ivory); c.fillStyle = "#CFF3FB";
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(p.x + 36 + i * 24, p.y + 24); c.lineTo(p.x + 50 + i * 24, p.y + 12); c.lineTo(p.x + 60 + i * 24, p.y + 28); c.lineTo(p.x + 44 + i * 24, p.y + 36); c.fill(); c.strokeStyle = K.out; c.lineWidth = 1.5; c.stroke(); }
    blk(c, p.x + 16, p.y + 66, p.w - 32, 26, 6, K.dark, 2.5);
    const flick = 0.75 + 0.25 * Math.sin(t * 3); c.fillStyle = `rgba(240,168,75,${flick})`;
    for (let i = 0; i < 5; i++) c.fillRect(p.x + 24 + i * 24, p.y + 72, 14, 14);
    hazard(c, p.x + 10, p.y + p.h - 12, 44, 7); led(c, p.x + p.w - 20, p.y + 102, K.green); led(c, p.x + p.w - 34, p.y + 102, K.orange);
    line(c, [p.x + p.w, p.y + 80, p.x + p.w + 16, p.y + 80], K.steel, 7);
  },
  corerack(c, p) {
    shadow(c, p);
    blk(c, p.x, p.y + p.h - 20, p.w, 20, 5, K.navy); blk(c, p.x, p.y, p.w, p.h - 14, 6, K.slate);
    const n = Math.floor((p.w - 20) / 22);
    for (let i = 0; i < n; i++) { const tx = p.x + 12 + i * 22; blk(c, tx, p.y + 8, 16, p.h - 26, 8, i % 3 === 0 ? "#BDEFFA" : "#E9F6FA", 2);
      c.fillStyle = [K.orange, K.cyan, K.green][i % 3]; c.fillRect(tx + 3, p.y + 22 + (i % 2) * 6, 10, 5); }
  },
  pump(c, p) {
    shadow(c, p, 0.46);
    blk(c, p.x + 10, p.y + 34, p.w - 20, p.h - 34, 10, vgrad(c, p.y + 30, 50, K.navy, K.navy2));
    blk(c, p.x + 20, p.y + 14, 40, 34, 17, vgrad(c, p.y + 10, 40, "#F6F8FA", K.mid));
    c.fillStyle = K.dark; c.beginPath(); c.arc(p.x + 40, p.y + 31, 11, 0, 7); c.fill(); c.strokeStyle = K.cyan; c.lineWidth = 3; c.beginPath(); c.arc(p.x + 40, p.y + 31, 8, 3.6, 6); c.stroke();
    line(c, [p.x, p.y + 52, p.x + 12, p.y + 52], K.steel, 8); line(c, [p.x + p.w - 12, p.y + 52, p.x + p.w, p.y + 52], K.steel, 8);
    led(c, p.x + p.w - 24, p.y + p.h - 14, K.orange);
  },
  // ---------- COMMS ----------
  earthglobe(c, p, t) {
    shadow(c, p, 0.42);
    blk(c, p.x + 14, p.y + p.h - 28, p.w - 28, 28, 8, K.navy); c.fillStyle = K.cyan; c.fillRect(p.x + 24, p.y + p.h - 18, p.w - 48, 3);
    blk(c, p.x + p.w / 2 - 10, p.y + p.h - 46, 20, 20, 4, K.slate, 2);
    const cx = p.x + p.w / 2, cy = p.y + 46, r = 40;
    c.fillStyle = "rgba(85,213,233,0.18)"; c.beginPath(); c.arc(cx, cy, r + 10, 0, 7); c.fill();
    c.save(); c.beginPath(); c.arc(cx, cy, r, 0, 7); c.clip(); c.fillStyle = vgrad(c, cy - r, 2 * r, "#4AA3EE", "#1F5FB0"); c.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    c.fillStyle = K.leaf; const off = (t * 6) % 140;
    for (const [bx, by, bw, bh] of [[-30, -18, 26, 30], [10, -4, 22, 30], [-6, 22, 18, 12]]) { for (const o of [0, -140]) { c.beginPath(); c.ellipse(cx + bx + 12 + ((off + o + 70) % 140) - 70 + 0, cy + by + bh / 2, bw / 2, bh / 2, 0.3, 0, 7); c.fill(); } }
    c.fillStyle = "rgba(255,255,255,0.75)"; c.beginPath(); c.ellipse(cx - 10, cy - 22, 16, 5, -0.4, 0, 7); c.fill();
    c.fillStyle = "rgba(10,20,40,0.35)"; c.beginPath(); c.arc(cx + 22, cy + 8, r, 0, 7); c.fill(); c.restore();
    c.strokeStyle = K.out; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke();
    c.strokeStyle = K.orange; c.lineWidth = 3; c.beginPath(); c.ellipse(cx, cy, r + 10, 12, -0.35, 0, 7); c.stroke();
  },
  radiorack(c, p) {
    shadow(c, p);
    blk(c, p.x, p.y, p.w, p.h, 8, vgrad(c, p.y, p.h, K.slate, K.navy2));
    for (let i = 0; i < 5; i++) { const uy = p.y + 8 + i * ((p.h - 16) / 5); blk(c, p.x + 8, uy, p.w - 16, (p.h - 16) / 5 - 4, 3, i % 2 ? K.light : K.mid, 2);
      led(c, p.x + 18, uy + 10, [K.green, K.orange, K.cyan, K.green, K.red][i]); c.fillStyle = K.dark; for (let j = 0; j < 4; j++) c.fillRect(p.x + 32 + j * 14, uy + 6, 9, 9);
      c.fillStyle = K.cyan; c.fillRect(p.x + p.w - 28, uy + 8, 12, 3); }
    line(c, [p.x + p.w - 6, p.y + p.h - 12, p.x + p.w + 10, p.y + p.h - 12, p.x + p.w + 10, p.y + p.h - 2], K.orange, 4);
  },
  dishdesk(c, p, t) {
    bench(c, p);
    blk(c, p.x + 20, p.y + 22, 70, 14, 5, K.slate, 2);
    c.save(); c.translate(p.x + 56, p.y + 10); c.rotate(-0.5 + Math.sin(t * 0.8) * 0.15);
    c.fillStyle = vgrad(c, -34, 34, "#F6F8FA", K.mid); c.beginPath(); c.ellipse(0, -14, 36, 15, 0, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = K.out; c.stroke();
    c.fillStyle = K.dark; c.beginPath(); c.ellipse(0, -14, 22, 8, 0, 0, 7); c.fill(); line(c, [0, -14, 0, -30], K.orange, 3); led(c, 0, -32, K.red, 3); c.restore();
    screen(c, p.x + 118, p.y - 10, 62, 34, "wave");
  },
  wallscreen(c, p) {
    shadow(c, p);
    blk(c, p.x, p.y, p.w, p.h, 8, K.slate); screen(c, p.x + 8, p.y + 8, p.w - 16, p.h - 18, "earth");
    c.fillStyle = K.orange; c.fillRect(p.x + 14, p.y + p.h - 8, 28, 3); if (p.text) { c.fillStyle = K.cyan; c.font = "700 10px Segoe UI, sans-serif"; c.fillText(p.text, p.x + p.w * 0.55, p.y + p.h - 12); }
  },
  headset(c, p) {
    bench(c, p, K.light);
    c.strokeStyle = K.out; c.lineWidth = 7; c.beginPath(); c.arc(p.x + 40, p.y + 26, 15, Math.PI, 0); c.stroke(); c.strokeStyle = K.orange; c.lineWidth = 3.5; c.beginPath(); c.arc(p.x + 40, p.y + 26, 15, Math.PI, 0); c.stroke();
    blk(c, p.x + 22, p.y + 24, 9, 14, 3, K.navy, 2); blk(c, p.x + 49, p.y + 24, 9, 14, 3, K.navy, 2);
    blk(c, p.x + 90, p.y + 14, 40, 18, 4, K.dark, 2); c.fillStyle = K.cyan; c.fillRect(p.x + 96, p.y + 20, 28, 3);
    blk(c, p.x + 140, p.y + 20, 20, 12, 3, K.orange, 2);
  },
  // ---------- HABITAT ----------
  bunk(c, p) {
    shadow(c, p);
    blk(c, p.x, p.y + 52, p.w, p.h - 52, 8, vgrad(c, p.y + 50, 60, K.navy, K.navy2));
    blk(c, p.x + 4, p.y + 36, p.w - 8, 30, 8, "#E8EDF2"); blk(c, p.x + 4, p.y + 46, p.w - 8, 22, 6, "#3C7FA6");
    blk(c, p.x + 10, p.y + 34, 30, 16, 7, K.white, 2); c.fillStyle = K.orange; c.fillRect(p.x + 54, p.y + 50, 5, 18);
    blk(c, p.x + 3, p.y + 4, p.w - 6, 20, 7, K.slate); blk(c, p.x + 6, p.y + 8, p.w - 12, 20, 7, "#E8EDF2"); blk(c, p.x + 6, p.y + 16, p.w - 12, 14, 5, "#C97A52");
    blk(c, p.x + 10, p.y + 6, 28, 14, 6, K.white, 2);
    blk(c, p.x - 3, p.y, 8, p.h - 8, 3, K.light, 2.5); blk(c, p.x + p.w - 5, p.y, 8, p.h - 8, 3, K.light, 2.5);
    for (let i = 0; i < 3; i++) line(c, [p.x + p.w - 14, p.y + 30 + i * 14, p.x + p.w - 3, p.y + 30 + i * 14], K.mid, 3);
  },
  galley(c, p) {
    bench(c, { ...p, w: p.w - 70 }, K.light, K.slate);
    const x0 = p.x + 24;
    blk(c, x0, p.y + 18, 54, 18, 5, K.dark, 2); c.fillStyle = "#8FA0B2"; c.beginPath(); c.ellipse(x0 + 27, p.y + 27, 17, 5, 0, 0, 7); c.fill();
    blk(c, x0 + 78, p.y + 14, 50, 20, 4, K.dark, 2); for (const dx of [14, 36]) { c.fillStyle = K.orange; c.beginPath(); c.ellipse(x0 + 78 + dx, p.y + 24, 8, 4, 0, 0, 7); c.fill(); }
    blk(c, x0 + 84, p.y + 2, 26, 18, 5, K.light, 2); line(c, [x0 + 90, p.y - 4, x0 + 94, p.y - 10, x0 + 90, p.y - 14], "rgba(230,240,248,0.7)", 2.5);
    blk(c, x0 + 140, p.y + 20, 10, 12, 2, K.white, 2); blk(c, x0 + 156, p.y + 20, 10, 12, 2, K.orange, 2);
    // fridge
    const fx = p.x + p.w - 66; blk(c, fx, p.y - 24, 66, p.h + 24, 9, hgrad(c, fx, 66, K.light, K.mid, K.ivory)); c.fillStyle = K.dark; c.fillRect(fx + 6, p.y + 14, 54, 3); blk(c, fx + 50, p.y - 6, 6, 18, 2, K.slate, 2); blk(c, fx + 50, p.y + 24, 6, 26, 2, K.slate, 2);
    screen(c, fx + 10, p.y - 14, 24, 14, "bars");
  },
  couch(c, p) {
    shadow(c, p);
    blk(c, p.x, p.y + 8, p.w, p.h - 8, 22, vgrad(c, p.y, p.h, "#3E6C8F", "#2D4F6D"));
    blk(c, p.x + 10, p.y + 34, p.w - 20, p.h - 40, 14, "#4C84AA");
    c.strokeStyle = K.out; c.lineWidth = 2; for (const f of [0.34, 0.67]) { c.beginPath(); c.moveTo(p.x + p.w * f, p.y + 36); c.lineTo(p.x + p.w * f, p.y + p.h - 10); c.stroke(); }
    blk(c, p.x + 20, p.y + 12, 36, 24, 10, K.orange, 2); blk(c, p.x + p.w - 56, p.y + 12, 36, 24, 10, K.white, 2);
  },
  roundtable(c, p) {
    shadow(c, p, 0.5);
    blk(c, p.x + p.w / 2 - 10, p.y + 40, 20, p.h - 40, 4, K.slate, 2); blk(c, p.x + 16, p.y + p.h - 12, p.w - 32, 12, 6, K.navy);
    c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 34, p.w / 2, 30, 0, 0, 7); c.fillStyle = vgrad(c, p.y, 66, "#F6F8FA", K.light); c.fill(); c.lineWidth = 3; c.strokeStyle = K.out; c.stroke();
    c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 34, p.w / 2 - 10, 21, 0, 0, 7); c.strokeStyle = K.orange; c.lineWidth = 2; c.stroke();
    for (const dx of [-24, 6, 26]) { blk(c, p.x + p.w / 2 + dx - 6, p.y + 24, 11, 12, 3, K.white, 2); }
    pot(c, p.x + p.w / 2 - 2, p.y + 36, 0.7);
  },
  shelf(c, p) {
    shadow(c, p);
    blk(c, p.x, p.y, p.w, p.h, 7, K.navy); blk(c, p.x + 6, p.y + 6, p.w - 12, p.h - 24, 4, K.navy2, 2);
    // photo frame with earthrise
    blk(c, p.x + 14, p.y + 10, 40, 28, 3, K.light, 2); c.fillStyle = "#0B1A2C"; c.fillRect(p.x + 18, p.y + 14, 32, 20); c.fillStyle = "#2B7FD0"; c.beginPath(); c.arc(p.x + 38, p.y + 24, 7, 0, 7); c.fill(); c.fillStyle = "#8E8F96"; c.fillRect(p.x + 18, p.y + 30, 32, 4);
    blk(c, p.x + 66, p.y + 16, 14, 22, 2, K.orange, 2); blk(c, p.x + 82, p.y + 12, 12, 26, 2, K.cyan, 2); blk(c, p.x + 96, p.y + 18, 14, 20, 2, K.light, 2);
    c.fillStyle = "#8E8F96"; c.beginPath(); c.arc(p.x + 128, p.y + 30, 9, 0, 7); c.fill(); c.strokeStyle = K.out; c.lineWidth = 2; c.stroke();
    c.fillStyle = K.cyan; c.fillRect(p.x + 8, p.y + p.h - 12, p.w - 16, 3);
  },
  // ---------- GREENHOUSE ----------
  hydro(c, p, t) {
    shadow(c, p);
    blk(c, p.x, p.y + p.h - 30, p.w, 30, 7, vgrad(c, p.y + p.h - 30, 30, K.navy, K.navy2));
    const glow = 0.18 + 0.05 * Math.sin(t * 2); c.fillStyle = `rgba(183,121,232,${glow})`; rr(c, p.x - 6, p.y + 10, p.w + 12, p.h - 24, 10); c.fill();
    for (let row = 0; row < 2; row++) {
      const ty = p.y + 34 + row * 28; blk(c, p.x + 4, ty, p.w - 8, 14, 5, K.light, 2.5);
      for (let i = 0; i < 7; i++) { const lx = p.x + 18 + i * ((p.w - 36) / 6); c.fillStyle = row ? K.leaf2 : K.leaf; c.strokeStyle = K.out; c.lineWidth = 1.6;
        for (const a of [-0.6, 0, 0.6]) { c.beginPath(); c.ellipse(lx + a * 6, ty - 5, 3.5, 8, a * 0.7, 0, 7); c.fill(); c.stroke(); } }
    }
    blk(c, p.x + 2, p.y + 2, p.w - 4, 10, 5, K.slate, 2.5); c.fillStyle = K.violet; c.fillRect(p.x + 10, p.y + 6, p.w - 20, 3);
    blk(c, p.x + 2, p.y + 14, 6, p.h - 30, 2, K.light, 2); blk(c, p.x + p.w - 8, p.y + 14, 6, p.h - 30, 2, K.light, 2);
  },
  watertank(c, p, t) {
    shadow(c, p);
    blk(c, p.x + 6, p.y + p.h - 16, p.w - 12, 16, 5, K.navy);
    blk(c, p.x, p.y + 10, p.w, p.h - 22, 16, "rgba(190,235,245,0.4)");
    c.save(); rr(c, p.x + 2, p.y + 12, p.w - 4, p.h - 26, 14); c.clip(); c.fillStyle = "#3C9BD6"; c.fillRect(p.x, p.y + 44, p.w, p.h);
    c.fillStyle = "rgba(255,255,255,0.7)"; for (let i = 0; i < 6; i++) { const by = p.y + p.h - 28 - ((t * 20 + i * 24) % (p.h - 60)); c.beginPath(); c.arc(p.x + 20 + (i * 17) % (p.w - 40), by, 2.5 + (i % 3), 0, 7); c.fill(); } c.restore();
    c.strokeStyle = K.out; c.lineWidth = 3; rr(c, p.x, p.y + 10, p.w, p.h - 22, 16); c.stroke();
    blk(c, p.x + 10, p.y + 2, p.w - 20, 14, 5, K.light, 2.5); c.fillStyle = K.dark; c.fillRect(p.x + 12, p.y + 30, 6, 40); c.fillStyle = K.cyan; c.fillRect(p.x + 13, p.y + 46, 4, 24);
  },
  seedcab(c, p) {
    shadow(c, p);
    blk(c, p.x, p.y, p.w, p.h, 8, hgrad(c, p.x, p.w, K.light, K.mid, K.ivory));
    for (let r = 0; r < 4; r++) { const dy = p.y + 8 + r * ((p.h - 14) / 4); blk(c, p.x + 8, dy, p.w - 16, (p.h - 14) / 4 - 4, 3, r % 2 ? K.navy : K.slate, 2);
      blk(c, p.x + p.w / 2 - 9, dy + 4, 18, 7, 2, K.light, 1.5); c.fillStyle = [K.green, K.orange, K.cyan, K.violet][r]; c.beginPath(); c.arc(p.x + 18, dy + 8, 3, 0, 7); c.fill(); }
  },
  composter(c, p) {
    shadow(c, p, 0.5);
    blk(c, p.x + 4, p.y + 20, p.w - 8, p.h - 20, 10, vgrad(c, p.y + 20, 50, "#6B5A46", "#4A3E30"));
    blk(c, p.x, p.y + 8, p.w, 20, 8, K.slate);
    c.fillStyle = K.leaf; c.strokeStyle = K.out; c.lineWidth = 1.8; c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 46, 12, 7, -0.5, 0, 7); c.fill(); c.stroke();
    hazard(c, p.x + 10, p.y + p.h - 12, p.w - 20, 6);
  },
  // ---------- POWER ----------
  reactor(c, p, t) {
    shadow(c, p, 0.5);
    blk(c, p.x + 6, p.y + p.h - 30, p.w - 12, 30, 10, K.navy); hazard(c, p.x + 16, p.y + p.h - 20, p.w - 32, 10);
    blk(c, p.x + 30, p.y + 26, p.w - 60, p.h - 52, 12, hgrad(c, p.x + 30, p.w - 60, K.mid, "#8794A2", K.ivory));
    for (let i = 0; i < 5; i++) { const fy = p.y + 34 + i * 20; blk(c, p.x + 2, fy, 36, 11, 3, K.orange, 2); blk(c, p.x + p.w - 38, fy, 36, 11, 3, K.orange, 2); }
    const g = 0.6 + 0.3 * Math.sin(t * 2.4); c.fillStyle = `rgba(123,216,143,${g})`; c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 64, 20, 28, 0, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = K.out; c.stroke();
    c.fillStyle = "rgba(255,255,255,0.6)"; c.beginPath(); c.ellipse(p.x + p.w / 2 - 6, p.y + 52, 5, 10, 0, 0, 7); c.fill();
    blk(c, p.x + 40, p.y + 4, p.w - 80, 30, 14, K.light); c.fillStyle = K.red; c.beginPath(); c.arc(p.x + p.w / 2, p.y + 18, 7, 0, 7); c.fill();
    c.fillStyle = K.dark; c.fillRect(p.x + p.w / 2 - 1.5, p.y + 11, 3, 14);
    screen(c, p.x + 42, p.y + p.h - 62, 48, 24, "bars");
  },
  battery(c, p) {
    shadow(c, p);
    blk(c, p.x, p.y + p.h - 18, p.w, 18, 5, K.navy);
    const n = 6;
    for (let i = 0; i < n; i++) { const bx = p.x + 6 + i * ((p.w - 12) / n); blk(c, bx, p.y + 8, (p.w - 12) / n - 4, p.h - 24, 6, vgrad(c, p.y, p.h, K.light, K.mid), 2.5);
      c.fillStyle = K.dark; c.fillRect(bx + 4, p.y + 14, (p.w - 12) / n - 12, 30); for (let j = 0; j < 4; j++) { c.fillStyle = j < (i % 4) + 1 ? K.green : "#264B38"; c.fillRect(bx + 6, p.y + 38 - j * 7, (p.w - 12) / n - 16, 4); }
      blk(c, bx + 6, p.y + 2, 10, 8, 2, K.orange, 1.8); }
    line(c, [p.x + 14, p.y + 4, p.x + 30, p.y - 4, p.x + p.w - 30, p.y - 4, p.x + p.w - 14, p.y + 4], K.orange, 3.5);
  },
  inverter(c, p, t) {
    shadow(c, p);
    blk(c, p.x, p.y, p.w, p.h, 9, hgrad(c, p.x, p.w, K.slate, K.navy2, K.mid));
    blk(c, p.x + 10, p.y + 12, p.w - 20, 34, 5, K.dark, 2.5); c.strokeStyle = K.cyan; c.lineWidth = 2; c.beginPath();
    for (let i = 0; i < p.w - 24; i += 3) c.lineTo(p.x + 12 + i, p.y + 29 + Math.sin(i * 0.25 + t * 3) * 9); c.stroke();
    for (let i = 0; i < 3; i++) { c.fillStyle = K.light; c.beginPath(); c.arc(p.x + 24 + i * 28, p.y + 70, 10, 0, 7); c.fill(); c.lineWidth = 2.5; c.strokeStyle = K.out; c.stroke(); line(c, [p.x + 24 + i * 28, p.y + 70, p.x + 24 + i * 28 + 5, p.y + 64], K.orange, 3); }
    c.fillStyle = K.orange; c.beginPath(); c.moveTo(p.x + 48, p.y + 92); c.lineTo(p.x + 38, p.y + 108); c.lineTo(p.x + 47, p.y + 108); c.lineTo(p.x + 44, p.y + 122); c.lineTo(p.x + 62, p.y + 102); c.lineTo(p.x + 52, p.y + 102); c.lineTo(p.x + 58, p.y + 92); c.fill();
  },
  reel(c, p) {
    shadow(c, p, 0.5);
    c.fillStyle = K.orange; c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + p.h - 14, p.w / 2, 14, 0, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = K.out; c.stroke();
    blk(c, p.x + 4, p.y + 16, p.w - 8, p.h - 32, 8, K.light); for (let i = 0; i < 4; i++) { c.strokeStyle = K.dark; c.lineWidth = 3; c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 24 + i * 7, 22, 6, 0, 0, Math.PI); c.stroke(); }
    c.fillStyle = K.orange; c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 18, p.w / 2, 14, 0, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = K.out; c.stroke(); c.fillStyle = K.dark; c.beginPath(); c.arc(p.x + p.w / 2, p.y + 18, 5, 0, 7); c.fill();
  },
  powerdesk(c, p) {
    bench(c, p);
    screen(c, p.x + 12, p.y - 14, 54, 34, "bars"); screen(c, p.x + 72, p.y - 14, 54, 34, "wave");
    for (let i = 0; i < 4; i++) led(c, p.x + 20 + i * 18, p.y + p.h * 0.7, [K.green, K.green, K.orange, K.green][i]);
    blk(c, p.x + 130, p.y + 18, 20, 14, 3, K.orange, 2);
  },
  // ---------- MEDICAL ----------
  medbed(c, p) {
    shadow(c, p);
    blk(c, p.x + 14, p.y + p.h - 26, p.w - 28, 26, 7, K.slate); blk(c, p.x + 6, p.y + p.h - 34, 16, 12, 4, K.dark, 2); blk(c, p.x + p.w - 22, p.y + p.h - 34, 16, 12, 4, K.dark, 2);
    blk(c, p.x, p.y + 28, p.w, p.h - 50, 12, vgrad(c, p.y + 28, 50, "#F6F8FA", "#CFE0EA"));
    blk(c, p.x + 8, p.y + 34, 38, 24, 10, K.white, 2); blk(c, p.x + 56, p.y + 42, p.w - 62, 34, 8, "#7CC2D8"); c.strokeStyle = K.out; c.lineWidth = 2; c.strokeRect(p.x + 60, p.y + 46, p.w - 70, 4);
    blk(c, p.x + p.w - 16, p.y, 12, 70, 4, K.slate, 2.5); screen(c, p.x + p.w - 38, p.y - 2, 40, 28, "wave");
    c.fillStyle = K.red; c.fillRect(p.x + p.w / 2 - 3, p.y + 60, 6, 12); c.fillRect(p.x + p.w / 2 - 9, p.y + 63, 18, 6);
  },
  medcab(c, p) {
    shadow(c, p);
    blk(c, p.x, p.y, p.w, p.h, 9, hgrad(c, p.x, p.w, K.ivory, K.mid, "#F6F8FA"));
    blk(c, p.x + 10, p.y + 24, p.w - 20, p.h - 36, 5, "rgba(170,230,244,0.5)", 2.5);
    for (let r = 0; r < 3; r++) { const sy = p.y + 28 + r * 28; c.strokeStyle = K.out; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x + 12, sy + 20); c.lineTo(p.x + p.w - 12, sy + 20); c.stroke();
      for (let j = 0; j < 4; j++) blk(c, p.x + 16 + j * 20, sy + 4 + (j % 2) * 3, 12, 16 - (j % 2) * 3, 3, [K.cyan, K.orange, K.green, K.light][(j + r) % 4], 1.8); }
    c.fillStyle = K.red; c.fillRect(p.x + p.w / 2 - 3, p.y + 6, 6, 14); c.fillRect(p.x + p.w / 2 - 8, p.y + 10, 16, 6);
  },
  ivstand(c, p) {
    c.fillStyle = "rgba(4,14,23,0.3)"; c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + p.h - 3, 16, 6, 0, 0, 7); c.fill();
    line(c, [p.x + p.w / 2, p.y + p.h - 6, p.x + p.w / 2, p.y + 6], K.out, 7); line(c, [p.x + p.w / 2, p.y + p.h - 6, p.x + p.w / 2, p.y + 6], K.light, 3.5);
    line(c, [p.x + 4, p.y + p.h - 4, p.x + p.w - 4, p.y + p.h - 4], K.out, 6); blk(c, p.x + p.w / 2 - 9, p.y + 4, 18, 30, 8, "rgba(190,235,245,0.75)", 2.5); c.fillStyle = K.cyan; c.fillRect(p.x + p.w / 2 - 6, p.y + 18, 12, 12);
  },
  scanner(c, p, t) {
    shadow(c, p);
    blk(c, p.x + 20, p.y + p.h - 40, p.w - 40, 34, 8, K.slate); blk(c, p.x + 30, p.y + p.h - 52, p.w - 60, 22, 9, "#E8EDF2");
    c.lineWidth = 16; c.strokeStyle = K.out; c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 52, 48, 44, 0, 0, 7); c.stroke();
    c.lineWidth = 10; c.strokeStyle = vgrad(c, p.y, 100, "#F6F8FA", K.mid); c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 52, 48, 44, 0, 0, 7); c.stroke();
    c.lineWidth = 3; c.strokeStyle = K.cyan; c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 52, 38, 34, 0, 0.6 + t, 2.4 + t); c.stroke();
    led(c, p.x + p.w / 2 + 52, p.y + 22, K.green);
  },
  // ---------- ROVER GARAGE ----------
  toolwall(c, p) {
    shadow(c, p);
    blk(c, p.x, p.y, p.w, p.h, 6, K.slate); c.fillStyle = "rgba(20,30,46,0.6)";
    for (let i = 0; i < 20; i++) for (let j = 0; j < 3; j++) c.fillRect(p.x + 8 + i * 12, p.y + 8 + j * 12, 2.5, 2.5);
    blk(c, p.x + 16, p.y + 10, 5, 30, 2, K.orange, 2); blk(c, p.x + 30, p.y + 12, 22, 7, 2, K.light, 2); line(c, [p.x + 70, p.y + 10, p.x + 70, p.y + 36], K.light, 4); c.fillStyle = K.light; c.beginPath(); c.arc(p.x + 70, p.y + 12, 6, 0, 7); c.fill(); c.stroke();
    blk(c, p.x + 92, p.y + 12, 8, 26, 2, K.cyan, 2); blk(c, p.x + 112, p.y + 18, 28, 12, 3, K.orange, 2); line(c, [p.x + 156, p.y + 10, p.x + 176, p.y + 38], K.mid, 5); blk(c, p.x + 188, p.y + 10, 14, 28, 3, K.navy, 2); blk(c, p.x + 212, p.y + 14, 22, 20, 3, K.light, 2);
  },
  workbench(c, p) {
    bench(c, p, K.light, K.navy);
    blk(c, p.x + 16, p.y + 14, 22, 18, 3, K.steel, 2.5); blk(c, p.x + 12, p.y + 10, 8, 10, 2, K.orange, 2);
    blk(c, p.x + 60, p.y + 20, 30, 12, 3, K.orange, 2); blk(c, p.x + 100, p.y + 22, 40, 8, 2, K.light, 2);
    line(c, [p.x + 176, p.y + 26, p.x + 184, p.y + 4, p.x + 168, p.y - 6], K.mid, 4); blk(c, p.x + 156, p.y - 12, 26, 12, 5, K.orange, 2.5);
    for (let i = 0; i < 3; i++) { blk(c, p.x + 20 + i * 54, p.y + p.h * 0.6, 44, 20, 3, K.navy2, 2); c.fillStyle = K.light; c.fillRect(p.x + 36 + i * 54, p.y + p.h * 0.6 + 7, 12, 4); }
  },
  tires(c, p) {
    shadow(c, p);
    for (let i = 0; i < 3; i++) { const ty = p.y + p.h - 28 - i * 22; for (const tx of [p.x + 4, p.x + p.w / 2 + 2]) { if (i === 2 && tx > p.x + 10) continue;
      c.fillStyle = "#151D28"; c.beginPath(); c.ellipse(tx + p.w / 4 - 4, ty + 12, p.w / 4 - 2, 17, 0, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = K.out; c.stroke();
      c.fillStyle = K.steel; c.beginPath(); c.ellipse(tx + p.w / 4 - 4, ty + 10, p.w / 4 - 16, 10, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = K.mid; c.beginPath(); c.ellipse(tx + p.w / 4 - 4, ty + 9, 6, 4, 0, 0, 7); c.fill(); } }
  },
  charger(c, p, t) {
    shadow(c, p);
    blk(c, p.x, p.y + 34, p.w, p.h - 34, 10, vgrad(c, p.y + 30, 70, K.slate, K.navy2)); blk(c, p.x + 10, p.y, p.w - 20, 46, 8, K.ivory);
    const g = 0.65 + 0.3 * Math.sin(t * 3); c.fillStyle = `rgba(123,216,143,${g})`; c.beginPath(); c.moveTo(p.x + p.w / 2 + 4, p.y + 8); c.lineTo(p.x + p.w / 2 - 12, p.y + 28); c.lineTo(p.x + p.w / 2 - 2, p.y + 28); c.lineTo(p.x + p.w / 2 - 6, p.y + 42); c.lineTo(p.x + p.w / 2 + 14, p.y + 22); c.lineTo(p.x + p.w / 2 + 3, p.y + 22); c.fill();
    hazard(c, p.x + 10, p.y + p.h - 14, p.w - 20, 8); line(c, [p.x + p.w - 6, p.y + 60, p.x + p.w + 14, p.y + 66, p.x + p.w + 6, p.y + p.h - 4], K.orange, 4.5);
  },
  crates(c, p) {
    shadow(c, p);
    for (const [dx, dy, w, h] of [[0, 34, 62, 56], [64, 40, 66, 50], [14, 0, 58, 42]] as const) { blk(c, p.x + dx, p.y + dy, w, h, 6, vgrad(c, p.y + dy, h, K.light, K.mid)); hazard(c, p.x + dx + 6, p.y + dy + h - 14, w - 12, 7); blk(c, p.x + dx + w / 2 - 8, p.y + dy + 8, 16, 8, 2, K.navy, 1.8); }
  },
  // ---------- AIRLOCK ----------
  o2rack(c, p) {
    shadow(c, p);
    blk(c, p.x, p.y + p.h - 18, p.w, 18, 5, K.navy); blk(c, p.x, p.y, p.w, p.h - 12, 6, K.slate);
    const n = 4; for (let i = 0; i < n; i++) { const tx = p.x + 8 + i * ((p.w - 16) / n); blk(c, tx, p.y + 18, (p.w - 16) / n - 4, p.h - 40, 10, hgrad(c, tx, 20, "#E8F4FA", "#9EC4D8", "#FFFFFF"), 2.5);
      blk(c, tx + 3, p.y + 8, 14, 14, 4, K.cyan, 2); c.fillStyle = K.dark; c.beginPath(); c.arc(tx + 10, p.y + 40, 5, 0, 7); c.fill(); c.fillStyle = K.green; c.fillRect(tx + 9, p.y + 36, 2, 5); }
    c.fillStyle = K.cyan; c.font = "700 11px Segoe UI, sans-serif"; c.fillText("O₂", p.x + 8, p.y + p.h - 4);
  },
  helmets(c, p) {
    shadow(c, p);
    blk(c, p.x, p.y + p.h - 22, p.w, 22, 5, K.navy); blk(c, p.x, p.y + p.h - 28, p.w, 8, 3, K.light, 2);
    for (let i = 0; i < 3; i++) { const hx = p.x + 8 + i * ((p.w - 16) / 3); c.fillStyle = "#F2F5F8"; c.beginPath(); c.arc(hx + 20, p.y + 30, 20, Math.PI, 0); c.lineTo(hx + 40, p.y + 40); c.lineTo(hx, p.y + 40); c.fill(); c.lineWidth = 3; c.strokeStyle = K.out; c.stroke();
      c.fillStyle = "#17394A"; c.beginPath(); c.ellipse(hx + 20, p.y + 32, 13, 9, 0, 0, 7); c.fill(); c.fillStyle = K.cyan; c.globalAlpha = 0.4; c.beginPath(); c.ellipse(hx + 15, p.y + 28, 5, 3, -0.4, 0, 7); c.fill(); c.globalAlpha = 1; c.fillStyle = K.orange; c.fillRect(hx + 16, p.y + 12, 8, 4); }
  },
  dustshower(c, p, t) {
    shadow(c, p);
    blk(c, p.x, p.y + 10, p.w, p.h - 10, 10, vgrad(c, p.y, p.h, "#F2F5F8", K.mid)); blk(c, p.x + 8, p.y + 28, p.w - 16, p.h - 50, 6, "rgba(160,232,246,0.45)");
    blk(c, p.x + 8, p.y, p.w - 16, 16, 6, K.slate); for (let i = 0; i < 4; i++) { c.fillStyle = K.dark; c.beginPath(); c.arc(p.x + 20 + i * 16, p.y + 8, 3, 0, 7); c.fill(); }
    c.fillStyle = "rgba(255,255,255,0.65)"; for (let i = 0; i < 8; i++) { const dy = (t * 40 + i * 14) % 56; c.fillRect(p.x + 14 + (i * 9) % (p.w - 28), p.y + 24 + dy, 2, 6); }
    hazard(c, p.x + 8, p.y + p.h - 14, p.w - 16, 8); blk(c, p.x + p.w - 14, p.y + 40, 8, 30, 3, K.orange, 2);
  },
  evabench(c, p) {
    shadow(c, p);
    blk(c, p.x, p.y + 22, p.w, p.h - 22, 8, K.navy); blk(c, p.x - 2, p.y + 4, p.w + 4, 24, 8, vgrad(c, p.y, 30, "#F6F8FA", K.light));
    hazard(c, p.x + 10, p.y + p.h - 12, 60, 6);
    for (let i = 0; i < 2; i++) { const bx = p.x + 90 + i * 40; blk(c, bx, p.y - 6, 26, 24, 8, K.light, 2.5); blk(c, bx - 2, p.y + 12, 30, 10, 4, K.dark, 2.5); c.fillStyle = K.orange; c.fillRect(bx + 4, p.y + 4, 18, 4); }
  },
  // ---------- HALLWAY ----------
  extinguisher(c, p) {
    blk(c, p.x + 4, p.y + 12, p.w - 8, p.h - 12, 7, K.red); blk(c, p.x + 8, p.y + 2, p.w - 16, 14, 4, K.dark, 2); line(c, [p.x + p.w - 6, p.y + 8, p.x + p.w + 6, p.y + 22], K.dark, 3);
    c.fillStyle = K.white; c.fillRect(p.x + 8, p.y + 28, p.w - 16, 8);
  },
  firstaid(c, p) {
    blk(c, p.x, p.y, p.w, p.h, 6, K.white); c.fillStyle = K.red; c.fillRect(p.x + p.w / 2 - 3, p.y + 6, 6, p.h - 12); c.fillRect(p.x + 6, p.y + p.h / 2 - 3, p.w - 12, 6);
  },
  rover(c, p) {
    shadow(c, p);
    for (const wx of [0.14, 0.5, 0.86]) { blk(c, p.x + p.w * wx - 17, p.y + p.h - 34, 34, 34, 12, "#101820"); blk(c, p.x + p.w * wx - 9, p.y + p.h - 26, 18, 18, 8, "#566c7c", 2); }
    blk(c, p.x + 6, p.y + 24, p.w - 12, p.h - 52, 14, "#E8EFF5"); blk(c, p.x + 6, p.y + p.h - 46, p.w - 12, 10, 4, K.orange, 2);
    blk(c, p.x + 24, p.y + 4, p.w * 0.46, 40, 12, "#D5DEE8"); blk(c, p.x + 34, p.y + 10, p.w * 0.46 - 20, 24, 8, "#163040", 2);
    c.fillStyle = "rgba(85,213,233,0.5)"; c.fillRect(p.x + 40, p.y + 14, p.w * 0.46 - 32, 4);
    blk(c, p.x + p.w * 0.62, p.y + 14, p.w * 0.3, 34, 8, "#3E4C5E"); line(c, [p.x + p.w - 22, p.y + 14, p.x + p.w - 22, p.y - 22], K.mid, 3); led(c, p.x + p.w - 22, p.y - 24, K.orange, 4);
  },
};

const NAT: Record<string, [number, number]> = {
  microscope: [200, 80], centrifuge: [100, 90], freezer: [90, 130], printer: [190, 140], glovebox: [210, 110], samples: [220, 70],
  icetank: [110, 160], melter: [170, 120], corerack: [250, 70], pump: [90, 80], earthglobe: [110, 130], radiorack: [110, 140],
  dishdesk: [200, 90], wallscreen: [240, 70], headset: [180, 72], bunk: [150, 120], galley: [250, 84], couch: [210, 80],
  roundtable: [110, 90], shelf: [150, 60], hydro: [210, 96], watertank: [96, 150], seedcab: [100, 120], composter: [74, 74],
  reactor: [170, 190], battery: [190, 100], inverter: [110, 130], reel: [66, 66], powerdesk: [160, 70], medbed: [160, 110],
  medcab: [110, 130], ivstand: [40, 110], scanner: [150, 130], toolwall: [250, 50], workbench: [210, 86], tires: [120, 90],
  charger: [110, 100], crates: [130, 90], o2rack: [110, 130], helmets: [150, 66], dustshower: [90, 130], evabench: [190, 50],
  extinguisher: [28, 52], firstaid: [44, 40], rover: [210, 95],
};
export const LUNAR_KINDS = new Set(Object.keys(ART));
export function drawLunarProp(c: Ctx, p: LP, time: number): boolean {
  const f = ART[p.kind]; if (!f) return false;
  const [nw, nh] = NAT[p.kind]; const s = p.w / nw;
  c.save(); c.translate(p.x, p.y); c.scale(s, s); f(c, { ...p, x: 0, y: 0, w: nw, h: nh }, time); c.restore(); return true;
}

// ---------- floor decals (never block walking) ----------
export interface Decal { kind: string; x: number; y: number; w: number; h: number; color?: string }
export function drawDecal(c: Ctx, d: Decal): void {
  c.save();
  if (d.kind === "rug") {
    const col = d.color ?? "#2F5F7A"; rr(c, d.x, d.y, d.w, d.h, 26); c.fillStyle = col; c.fill(); c.lineWidth = 4; c.strokeStyle = "rgba(240,168,75,0.85)"; c.stroke();
    rr(c, d.x + 16, d.y + 16, d.w - 32, d.h - 32, 18); c.strokeStyle = "rgba(230,240,248,0.35)"; c.lineWidth = 2; c.stroke();
    c.fillStyle = "rgba(230,240,248,0.16)"; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(d.x + d.w / 2, d.y + d.h / 2, 12 + i * 10, 0, 7); c.lineWidth = 2; c.strokeStyle = "rgba(230,240,248,0.14)"; c.stroke(); }
  } else if (d.kind === "hazard") { hazard(c, d.x, d.y, d.w, d.h); }
  else if (d.kind === "grate") {
    c.fillStyle = "rgba(10,18,28,0.22)"; rr(c, d.x, d.y, d.w, d.h, 6); c.fill(); c.strokeStyle = "rgba(150,170,190,0.4)"; c.lineWidth = 2;
    for (let x = d.x + 10; x < d.x + d.w; x += 14) { c.beginPath(); c.moveTo(x, d.y + 4); c.lineTo(x, d.y + d.h - 4); c.stroke(); }
  } else if (d.kind === "ring") {
    c.strokeStyle = d.color ?? "rgba(240,168,75,0.7)"; c.lineWidth = 5; c.setLineDash([22, 14]); c.beginPath(); c.ellipse(d.x + d.w / 2, d.y + d.h / 2, d.w / 2, d.h / 2, 0, 0, 7); c.stroke(); c.setLineDash([]);
  } else if (d.kind === "pipe") {
    const col = d.color ?? K.steel; c.lineCap = "round"; c.strokeStyle = K.out; c.lineWidth = 15; c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x + d.w, d.y + d.h); c.stroke();
    c.strokeStyle = col; c.lineWidth = 9; c.stroke(); c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineWidth = 3; c.beginPath(); c.moveTo(d.x, d.y - 2); c.lineTo(d.x + d.w, d.y + d.h - 2); c.stroke();
    c.fillStyle = K.orange; for (let i = 1; i < 4; i++) c.fillRect(d.x + d.w * i / 4 - 3 + (d.h ? 0 : 0), d.y + d.h * i / 4 - 8, 6, 16);
  } else if (d.kind === "cable") {
    c.lineCap = "round"; c.lineJoin = "round"; const pts = [d.x, d.y, d.x + d.w * 0.5, d.y, d.x + d.w * 0.5, d.y + d.h, d.x + d.w, d.y + d.h];
    line(c, pts, K.out, 9); line(c, pts, d.color ?? K.orange, 5);
  } else if (d.kind === "glow") {
    const g = c.createRadialGradient(d.x + d.w / 2, d.y + d.h / 2, 4, d.x + d.w / 2, d.y + d.h / 2, Math.max(d.w, d.h) / 2); g.addColorStop(0, d.color ?? "rgba(183,121,232,0.4)"); g.addColorStop(1, "rgba(183,121,232,0)");
    c.fillStyle = g; c.fillRect(d.x, d.y, d.w, d.h);
  } else if (d.kind === "cross") {
    c.fillStyle = "rgba(224,98,79,0.55)"; c.fillRect(d.x + d.w / 2 - 14, d.y, 28, d.h); c.fillRect(d.x, d.y + d.h / 2 - 14, d.w, 28);
  } else if (d.kind === "arrows") {
    c.fillStyle = "rgba(85,213,233,0.45)"; for (let i = 0; i < 4; i++) { const y = d.y + i * (d.h / 4); c.beginPath(); c.moveTo(d.x + d.w / 2, y); c.lineTo(d.x + d.w / 2 + 16, y + 18); c.lineTo(d.x + d.w / 2 + 6, y + 18); c.lineTo(d.x + d.w / 2 + 6, y + 30); c.lineTo(d.x + d.w / 2 - 6, y + 30); c.lineTo(d.x + d.w / 2 - 6, y + 18); c.lineTo(d.x + d.w / 2 - 16, y + 18); c.fill(); }
  } else if (d.kind === "stripe") {
    c.fillStyle = d.color ?? "rgba(85,213,233,0.35)"; c.fillRect(d.x, d.y, d.w, d.h);
  }
  c.restore();
}
