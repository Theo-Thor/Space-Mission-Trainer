import type { Dir, Look } from "../types";
import { doors, guides, props, rooms, type Door, type PropDef, type Room } from "../content/world";

export interface PaintActor {
  id: string;
  x: number;
  y: number;
  facing: Dir;
  look: Look;
  label: string;
  walking: boolean;
  walkPhase: number;
  bob: number;
  suitBlend: number;
  radioLight: boolean;
}

export interface Paint {
  time: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
  actors: PaintActor[];
  player: PaintActor;
  highlight: { x: number; y: number } | null;
  focusRoom: string;
  radioTaken: boolean;
  suitReady: boolean;
  hatchOpen: boolean;
  viewW: number;
  viewH: number;
}

interface Palette {
  cloth: string;
  accent: string;
  dark: string;
  skin: string;
  hair: string;
  badge: string;
  visor: string | null;
  pack: boolean;
}

const LOOKS: Record<Exclude<Look, "player">, Palette> = {
  val: { cloth: "#2E5A98", accent: "#E8EFF5", dark: "#1A2740", skin: "#E2B89A", hair: "#3A2A24", badge: "#F0A84B", visor: null, pack: false },
  chen: { cloth: "#3C5168", accent: "#55D5E9", dark: "#243244", skin: "#D7A888", hair: "#241816", badge: "#55D5E9", visor: null, pack: false },
  patel: { cloth: "#2F5552", accent: "#7DCEC6", dark: "#1C3332", skin: "#C68860", hair: "#1A120E", badge: "#7DCEC6", visor: null, pack: false },
  leo: { cloth: "#1B2430", accent: "#55D5E9", dark: "#101820", skin: "#E0B08A", hair: "#4A3428", badge: "#55D5E9", visor: null, pack: false },
  nia: { cloth: "#D5DEE6", accent: "#F0A84B", dark: "#5C6B78", skin: "#8D5A3C", hair: "#1C140F", badge: "#F0A84B", visor: null, pack: false },
  riley: { cloth: "#F3F7FB", accent: "#55D5E9", dark: "#3E4C5E", skin: "#E2B89A", hair: "#2A211C", badge: "#55D5E9", visor: "#163040", pack: true },
  crew: { cloth: "#3E5674", accent: "#F0A84B", dark: "#243246", skin: "#E2B89A", hair: "#2C241C", badge: "#E8EFF5", visor: null, pack: false },
  crew2: { cloth: "#3A4A44", accent: "#4FA6A2", dark: "#24302C", skin: "#C99572", hair: "#1A140F", badge: "#4FA6A2", visor: null, pack: false },
};

const UNIFORM: Palette = {
  cloth: "#24344C",
  accent: "#F0A84B",
  dark: "#1A2433",
  skin: "#E2B89A",
  hair: "#2A211C",
  badge: "#F0A84B",
  visor: null,
  pack: false,
};

const SUIT: Palette = {
  cloth: "#EEF3F8",
  accent: "#F0A84B",
  dark: "#3E4C5E",
  skin: "#E2B89A",
  hair: "#2A211C",
  badge: "#F0A84B",
  visor: "#1A2433",
  pack: true,
};

export function drawStars(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  ctx.fillStyle = "#101B2E";
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 70; i += 1) {
    const x = ((i * 97) % 1000) / 1000 * width;
    const y = ((i * 57) % 1000) / 1000 * height;
    const twinkle = 0.25 + (Math.sin(time * 1.4 + i) + 1) * 0.25;
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = i % 5 === 0 ? "#55D5E9" : "#E8EFF5";
    ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1.4, i % 4 === 0 ? 2 : 1.4);
  }
  ctx.globalAlpha = 1;
}

export function drawWorld(ctx: CanvasRenderingContext2D, paint: Paint): void {
  ctx.fillStyle = "#0C1522";
  ctx.fillRect(0, 0, paint.viewW, paint.viewH);
  ctx.save();
  ctx.translate(-paint.cameraX * paint.zoom, -paint.cameraY * paint.zoom);
  ctx.scale(paint.zoom, paint.zoom);

  for (const room of rooms) drawRoom(ctx, room, paint);
  for (const door of doors) drawDoor(ctx, door);
  drawGuides(ctx, paint.time);
  for (const room of rooms) drawRoomDetails(ctx, room, paint.time);

  if (paint.highlight) {
    const pulse = 0.35 + Math.sin(paint.time * 4) * 0.15;
    ctx.strokeStyle = `rgba(240, 168, 75, ${0.45 + pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(paint.highlight.x, paint.highlight.y + 4, 26, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const layers: { z: number; draw: () => void }[] = [];
  for (const prop of props) {
    layers.push({ z: prop.y + prop.h, draw: () => drawProp(ctx, prop, paint) });
  }
  for (const actor of [...paint.actors, paint.player]) {
    layers.push({ z: actor.y, draw: () => drawActor(ctx, actor, paint.time) });
  }
  layers.sort((a, b) => a.z - b.z);
  for (const layer of layers) layer.draw();

  ctx.restore();
  ctx.fillStyle = "rgba(16, 27, 46, 0.18)";
  ctx.fillRect(0, 0, paint.viewW, 18);
  ctx.fillRect(0, paint.viewH - 18, paint.viewW, 18);
}

function drawRoom(ctx: CanvasRenderingContext2D, room: Room, paint: Paint): void {
  fillRound(ctx, room.x, room.y, room.w, room.h, 22, "#172433");
  fillRound(ctx, room.x + 12, room.y + 12, room.w - 24, room.h - 24, 16, "#243246");
  fillRound(ctx, room.x + 24, room.y + 24, room.w - 48, room.h - 48, 12, room.floor);
  drawFloor(ctx, room);
  const cx = room.x + room.w * 0.5;
  const cy = room.y + room.h * 0.42;
  const glow = ctx.createRadialGradient(cx, cy, 30, cx, cy, room.w * 0.48);
  glow.addColorStop(0, roomGlow(room.id));
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(room.x + 24, room.y + 24, room.w - 48, room.h - 48);
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = room.accent;
  ctx.fillRect(room.x + 40, room.y + 68, 42, 4);
  ctx.globalAlpha = 1;
  if (room.id === paint.focusRoom) {
    ctx.beginPath();
    ctx.roundRect(room.x + 8, room.y + 8, room.w - 16, room.h - 16, 18);
    ctx.strokeStyle = "rgba(240, 168, 75, 0.5)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  drawPlaque(ctx, room);
}

function drawFloor(ctx: CanvasRenderingContext2D, room: Room): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(room.x + 28, room.y + 70, room.w - 56, room.h - 100);
  ctx.clip();
  ctx.strokeStyle = "rgba(232, 239, 245, 0.045)";
  ctx.lineWidth = 1;
  for (let gx = room.x + 28; gx < room.x + room.w; gx += 64) {
    ctx.beginPath();
    ctx.moveTo(gx, room.y);
    ctx.lineTo(gx, room.y + room.h);
    ctx.stroke();
  }
  for (let gy = room.y + 70; gy < room.y + room.h; gy += 64) {
    ctx.beginPath();
    ctx.moveTo(room.x, gy);
    ctx.lineTo(room.x + room.w, gy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlaque(ctx: CanvasRenderingContext2D, room: Room): void {
  const label = room.label;
  ctx.font = "700 13px Segoe UI, sans-serif";
  const width = Math.min(room.w - 80, ctx.measureText(label).width + 36);
  const x = room.x + 40;
  const y = room.y + 36;
  fillRound(ctx, x, y, width, 26, 13, "rgba(16, 27, 46, 0.82)");
  ctx.fillStyle = "#E8EFF5";
  ctx.textAlign = "center";
  ctx.fillText(label, x + width / 2, y + 18);
}

function drawDoor(ctx: CanvasRenderingContext2D, door: Door): void {
  ctx.fillStyle = "#3E5674";
  ctx.fillRect(door.x, door.y, door.w, door.h);
  ctx.fillStyle = door.accent;
  if (door.axis === "h") {
    ctx.fillRect(door.x + 10, door.y + door.h / 2 - 2, door.w - 20, 4);
    ctx.fillStyle = "rgba(232, 239, 245, 0.4)";
    ctx.fillRect(door.x - 2, door.y - 4, 10, door.h + 8);
    ctx.fillRect(door.x + door.w - 8, door.y - 4, 10, door.h + 8);
  } else {
    ctx.fillRect(door.x + door.w / 2 - 2, door.y + 10, 4, door.h - 20);
    ctx.fillStyle = "rgba(232, 239, 245, 0.4)";
    ctx.fillRect(door.x - 4, door.y - 2, door.w + 8, 10);
    ctx.fillRect(door.x - 4, door.y + door.h - 8, door.w + 8, 10);
  }
  ctx.font = "700 12px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = door.accent;
  ctx.fillText(door.sign, door.signAt.x, door.signAt.y);
  ctx.beginPath();
  ctx.arc(door.signAt.x, door.signAt.y + 12, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawGuides(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 14]);
  ctx.lineDashOffset = -time * 28;
  for (const guide of guides) {
    ctx.strokeStyle = guide.color;
    ctx.beginPath();
    ctx.moveTo(guide.x1, guide.y1);
    ctx.lineTo(guide.x2, guide.y2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function drawRoomDetails(ctx: CanvasRenderingContext2D, room: Room, time: number): void {
  if (room.id === "reception") drawReception(ctx, room);
  if (room.id === "lobby") drawLobby(ctx, room, time);
  if (room.id === "comms") drawCommsBay(ctx, room, time);
  if (room.id === "suit") drawSuitBay(ctx);
  if (room.id === "boarding") drawDeparture(ctx, room, time);
}

function drawReception(ctx: CanvasRenderingContext2D, room: Room): void {
  const doorX = room.x + room.w / 2 - 64;
  const doorY = room.y + room.h - 34;
  fillRound(ctx, doorX, doorY, 128, 16, 4, "#101820");
  ctx.fillStyle = "#55D5E9";
  ctx.fillRect(doorX + 62, doorY, 4, 16);
  const markX = room.x + 130;
  const markY = room.y + 96;
  ctx.strokeStyle = "rgba(85, 213, 233, 0.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(markX, markY, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(markX - 7, markY, 16, 0.4, Math.PI * 1.5);
  ctx.stroke();
  ctx.fillStyle = "#E8EFF5";
  ctx.font = "700 14px Segoe UI, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("PROJECT SELENE", markX + 24, markY + 5);
}

function drawLobby(ctx: CanvasRenderingContext2D, room: Room, time: number): void {
  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2;
  ctx.strokeStyle = "rgba(85, 213, 233, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 84, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 52, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(232, 239, 245, 0.8)";
  ctx.font = "700 14px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SELENE", cx, cy + 5);

  const bob = Math.sin(time * 1.5) * 5;
  const hx = cx;
  const hy = cy - 78 + bob;
  const glow = ctx.createRadialGradient(hx, hy, 4, hx, hy, 36);
  glow.addColorStop(0, "rgba(85, 213, 233, 0.28)");
  glow.addColorStop(1, "rgba(85, 213, 233, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(hx, hy, 36, 0, Math.PI * 2);
  ctx.fill();
  const disc = ctx.createRadialGradient(hx - 6, hy - 6, 2, hx, hy, 16);
  disc.addColorStop(0, "#F7FBFF");
  disc.addColorStop(1, "#8B97A6");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(hx, hy, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(time * 0.7);
  ctx.strokeStyle = `rgba(85, 213, 233, ${0.45 + Math.sin(time * 2) * 0.25})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCommsBay(ctx: CanvasRenderingContext2D, room: Room, time: number): void {
  fillRound(ctx, room.x + 48, room.y + 92, 16, 150, 6, "#163044");
  const blink = 0.35 + Math.sin(time * 3) * 0.4;
  ctx.fillStyle = `rgba(85, 213, 233, ${blink})`;
  ctx.beginPath();
  ctx.arc(room.x + 56, room.y + 88, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(85, 213, 233, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(room.x + 56, room.y + 88);
  ctx.lineTo(room.x + 90, room.y + 70);
  ctx.stroke();
}

function drawSuitBay(ctx: CanvasRenderingContext2D): void {
  const pad = props.find((prop) => prop.id === "suit");
  if (!pad) return;
  const cx = pad.x + pad.w / 2;
  const cy = pad.y - 20;
  const bay = ctx.createRadialGradient(cx, cy, 8, cx, cy, 110);
  bay.addColorStop(0, "rgba(240, 168, 75, 0.2)");
  bay.addColorStop(1, "rgba(240, 168, 75, 0)");
  ctx.fillStyle = bay;
  ctx.beginPath();
  ctx.arc(cx, cy, 110, 0, Math.PI * 2);
  ctx.fill();
}

function drawDeparture(ctx: CanvasRenderingContext2D, room: Room, time: number): void {
  ctx.fillStyle = "rgba(5, 10, 18, 0.18)";
  ctx.fillRect(room.x + 28, room.y + 28, room.w - 56, room.h - 56);
  for (let lamp = 0; lamp < 4; lamp += 1) {
    const x = room.x + 120 + lamp * 120;
    ctx.fillStyle = "rgba(85, 213, 233, 0.16)";
    ctx.beginPath();
    ctx.ellipse(x, room.y + 78, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    const pool = ctx.createRadialGradient(x, room.y + 100, 4, x, room.y + 280, 80);
    pool.addColorStop(0, "rgba(85, 213, 233, 0.07)");
    pool.addColorStop(1, "rgba(85, 213, 233, 0)");
    ctx.fillStyle = pool;
    ctx.fillRect(x - 70, room.y + 90, 140, 220);
  }
  const blink = 0.35 + Math.sin(time * 4) * 0.35;
  ctx.strokeStyle = `rgba(240, 168, 75, ${0.35 + blink})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.strokeRect(room.x + room.w - 130, room.y + room.h / 2 + 80, 70, 18);
  ctx.setLineDash([]);
}

function roomGlow(id: string): string {
  if (id === "lobby") return "rgba(85, 213, 233, 0.07)";
  if (id === "briefing") return "rgba(232, 239, 245, 0.09)";
  if (id === "comms") return "rgba(85, 213, 233, 0.08)";
  if (id === "suit") return "rgba(240, 168, 75, 0.07)";
  if (id === "boarding") return "rgba(85, 213, 233, 0.04)";
  return "rgba(232, 239, 245, 0.05)";
}

function drawProp(ctx: CanvasRenderingContext2D, prop: PropDef, paint: Paint): void {
  if (prop.kind === "seat") {
    fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 8, "#1C3044");
    fillRound(ctx, prop.x + 5, prop.y + 4, prop.w - 10, prop.h - 8, 6, "#3E5674");
    return;
  }
  if (prop.kind === "plant") {
    fillRound(ctx, prop.x + 8, prop.y + prop.h - 16, prop.w - 16, 14, 4, "#31445C");
    ctx.fillStyle = "#2F6F62";
    ctx.beginPath();
    ctx.arc(prop.x + prop.w / 2, prop.y + 14, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4FA08A";
    ctx.beginPath();
    ctx.arc(prop.x + prop.w / 2 - 7, prop.y + 18, 7, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (prop.kind === "board") {
    fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 8, "#101B2E");
    ctx.strokeStyle = "rgba(85, 213, 233, 0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(prop.x + 6, prop.y + 8, prop.w - 12, prop.h - 16);
    const scan = (paint.time * 36) % Math.max(8, prop.h - 24);
    ctx.fillStyle = "rgba(85, 213, 233, 0.4)";
    ctx.fillRect(prop.x + 10, prop.y + 10 + scan, prop.w - 20, 3);
    ctx.fillStyle = "#E8EFF5";
    ctx.font = "700 12px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(prop.text ?? "SELENE", prop.x + prop.w / 2, prop.y + prop.h / 2 + 4);
    return;
  }
  if (prop.kind === "arch") {
    ctx.fillStyle = "#243246";
    ctx.fillRect(prop.x, prop.y, 10, prop.h);
    ctx.fillRect(prop.x + prop.w - 10, prop.y, 10, prop.h);
    ctx.fillRect(prop.x, prop.y, prop.w, 10);
    const blink = 0.4 + Math.sin(paint.time * 4) * 0.4;
    ctx.fillStyle = `rgba(240, 168, 75, ${blink})`;
    ctx.fillRect(prop.x + 2, prop.y + prop.h - 16, 6, 6);
    ctx.fillRect(prop.x + prop.w - 8, prop.y + prop.h - 16, 6, 6);
    return;
  }
  if (prop.kind === "moon") {
    const cx = prop.x + prop.w / 2;
    const cy = prop.y + prop.h / 2;
    const glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 90);
    glow.addColorStop(0, "rgba(232, 239, 245, 0.2)");
    glow.addColorStop(1, "rgba(232, 239, 245, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 90, 0, Math.PI * 2);
    ctx.fill();
    const disc = ctx.createRadialGradient(cx - 16, cy - 18, 10, cx, cy, 58);
    disc.addColorStop(0, "#F7FBFF");
    disc.addColorStop(0.6, "#C5CED8");
    disc.addColorStop(1, "#7E8C9C");
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(cx, cy, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(70, 84, 99, 0.35)";
    ctx.beginPath();
    ctx.arc(cx - 16, cy - 8, 12, 0, Math.PI * 2);
    ctx.arc(cx + 18, cy + 10, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#E8EFF5";
    ctx.font = "700 12px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SOUTH POLE OBJECTIVE", cx, prop.y + prop.h + 18);
    return;
  }

  if (prop.kind === "hatch") {
    const glow = ctx.createRadialGradient(prop.x, prop.y + prop.h / 2, 8, prop.x, prop.y + prop.h / 2, 90);
    glow.addColorStop(0, paint.hatchOpen ? "rgba(240, 168, 75, 0.28)" : "rgba(85, 213, 233, 0.16)");
    glow.addColorStop(1, "rgba(85, 213, 233, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(prop.x - 90, prop.y - 10, 100, prop.h + 20);
    fillRound(ctx, prop.x - 16, prop.y - 12, prop.w + 24, prop.h + 24, 12, "#101820");
    fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 8, paint.hatchOpen ? "#163646" : "#15202C");
    ctx.strokeStyle = paint.hatchOpen ? "#F0A84B" : "#55D5E9";
    ctx.lineWidth = 4;
    ctx.stroke();
    if (paint.hatchOpen) {
      ctx.fillStyle = "rgba(85, 213, 233, 0.25)";
      ctx.fillRect(prop.x - 36, prop.y + 20, 36, prop.h - 40);
    }
    const blink = 0.4 + Math.sin(paint.time * 5) * 0.4;
    ctx.fillStyle = `rgba(240, 168, 75, ${blink})`;
    ctx.beginPath();
    ctx.arc(prop.x + prop.w / 2, prop.y + 16, 4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const body = prop.kind === "locker" ? "#3E4C5E" : prop.kind === "bench" ? "#1C3040" : "#31445C";
  fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 10, body);
  if (prop.kind === "console" || prop.kind === "desk" || prop.kind === "table") {
    fillRound(ctx, prop.x + 8, prop.y + 8, prop.w - 16, prop.h - 18, 6, "#101B2E");
    const screen = ctx.createLinearGradient(prop.x, prop.y, prop.x, prop.y + prop.h);
    screen.addColorStop(0, "rgba(85, 213, 233, 0.55)");
    screen.addColorStop(1, "rgba(85, 213, 233, 0.05)");
    ctx.fillStyle = screen;
    ctx.fillRect(prop.x + 16, prop.y + 14, prop.w - 32, 8);
    const bars = Math.max(3, Math.floor((prop.w - 36) / 18));
    for (let i = 0; i < bars; i += 1) {
      const h = 6 + (Math.sin(paint.time * 3 + i + prop.x * 0.01) + 1) * 6;
      ctx.fillStyle = i % 2 === 0 ? "#55D5E9" : "#7DCEC6";
      ctx.globalAlpha = 0.85;
      ctx.fillRect(prop.x + 16 + i * 16, prop.y + prop.h - 26 - h, 8, h);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#F0A84B";
    ctx.beginPath();
    ctx.arc(prop.x + prop.w - 16, prop.y + 16, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (prop.kind === "bench") {
    fillRound(ctx, prop.x + 14, prop.y + 10, prop.w - 28, prop.h - 22, 6, "#102433");
    if (!paint.radioTaken) {
      const pulse = 0.45 + Math.sin(paint.time * 4) * 0.35;
      fillRound(ctx, prop.x + prop.w / 2 - 22, prop.y - 22, 44, 24, 8, "#17344A");
      ctx.fillStyle = `rgba(85, 213, 233, ${0.45 + pulse * 0.4})`;
      ctx.fillRect(prop.x + prop.w / 2 - 12, prop.y - 16, 24, 10);
      ctx.beginPath();
      ctx.arc(prop.x + prop.w / 2 + 14, prop.y - 18, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (prop.kind === "locker") {
    ctx.strokeStyle = "rgba(232, 239, 245, 0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(prop.x + 18, prop.y + 16, prop.w - 36, prop.h - 32);
    ctx.fillStyle = paint.suitReady ? "#243246" : "#E8EFF5";
    fillRound(ctx, prop.x + 28, prop.y + 28, 40, 78, 12, paint.suitReady ? "#243246" : "#E8EFF5");
    if (!paint.suitReady) {
      ctx.fillStyle = "#1A2433";
      ctx.beginPath();
      ctx.ellipse(prop.x + 48, prop.y + 48, 10, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (prop.kind === "platform") {
    const cx = prop.x + prop.w / 2;
    const cy = prop.y - 36;
    ctx.fillStyle = "rgba(240, 168, 75, 0.16)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, 62, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(240, 168, 75, 0.9)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 28, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 10, "#31445C");
    ctx.fillStyle = "#55D5E9";
    ctx.fillRect(prop.x + 16, prop.y + 18, prop.w - 32, 4);
  }

  if (prop.kind === "storage") {
    ctx.fillStyle = "rgba(240, 168, 75, 0.85)";
    ctx.fillRect(prop.x + 14, prop.y + 24, prop.w - 28, 4);
    ctx.fillRect(prop.x + 14, prop.y + 48, prop.w - 28, 4);
  }
}

function drawActor(ctx: CanvasRenderingContext2D, actor: PaintActor, time: number): void {
  const palette = actor.look === "player" ? mixPalette(UNIFORM, SUIT, actor.suitBlend) : LOOKS[actor.look];
  const suited = actor.look === "riley" || (actor.look === "player" && actor.suitBlend > 0.55);
  const bob = Math.sin(time * 2.1 + actor.bob) * 1.3;
  const stride = actor.walking ? Math.sin(actor.walkPhase) : 0;
  ctx.save();
  ctx.translate(actor.x, actor.y + bob);
  ctx.fillStyle = "rgba(6, 10, 18, 0.4)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  if (actor.facing === "left") ctx.scale(-1, 1);
  const side = actor.facing === "left" || actor.facing === "right";
  const back = actor.facing === "up";

  ctx.fillStyle = palette.dark;
  if (side) {
    fillRound(ctx, -4, -18, 8, 16, 3, palette.dark);
    fillRound(ctx, 3 + stride * 4, -16, 8, 16, 3, palette.dark);
  } else {
    fillRound(ctx, -9 + stride * 3, -18, 7, 16, 3, palette.dark);
    fillRound(ctx, 2 - stride * 3, -18, 7, 16, 3, palette.dark);
  }

  if (palette.pack && (back || suited)) {
    fillRound(ctx, back ? -8 : 6, -44, 14, 20, 4, palette.dark);
    ctx.fillStyle = palette.accent;
    ctx.fillRect((back ? -8 : 6) + 4, -36, 6, 3);
  }

  fillRound(ctx, -14, -46, 28, 30, 9, palette.cloth);
  fillRound(ctx, -14, -46, 7, 18, 4, palette.accent);
  fillRound(ctx, -18, -42 + (side ? 0 : stride * 4), 7, 16, 3, palette.cloth);
  fillRound(ctx, 11, -42 - (side ? 0 : stride * 4), 7, 16, 3, palette.cloth);

  ctx.fillStyle = suited ? palette.cloth : palette.skin;
  ctx.beginPath();
  ctx.arc(side ? 1 : 0, -58, suited ? 14 : 12, 0, Math.PI * 2);
  ctx.fill();

  if (suited && palette.visor) {
    ctx.fillStyle = palette.visor;
    ctx.beginPath();
    ctx.ellipse(side ? 4 : 0, -57, side ? 7 : 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(85, 213, 233, 0.45)";
    ctx.beginPath();
    ctx.arc(side ? 6 : 4, -59, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (!back) {
    ctx.fillStyle = palette.hair;
    ctx.beginPath();
    ctx.arc(0, -63, 11, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    ctx.fillStyle = "#1C2430";
    ctx.beginPath();
    if (side) ctx.arc(5, -57, 1.5, 0, Math.PI * 2);
    else {
      ctx.arc(-4, -57, 1.5, 0, Math.PI * 2);
      ctx.arc(4, -57, 1.5, 0, Math.PI * 2);
    }
    ctx.fill();
  } else {
    ctx.fillStyle = palette.hair;
    ctx.beginPath();
    ctx.arc(0, -58, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!suited) {
    fillRound(ctx, 2, -38, 8, 6, 2, palette.badge);
  }
  if (actor.radioLight) {
    ctx.fillStyle = "#55D5E9";
    ctx.beginPath();
    ctx.arc(15, -30, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (actor.label) {
    ctx.font = "700 12px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(16, 27, 46, 0.75)";
    ctx.strokeText(actor.label, actor.x, actor.y - 80);
    ctx.fillStyle = "#E8EFF5";
    ctx.fillText(actor.label, actor.x, actor.y - 80);
  }
}

function mixPalette(a: Palette, b: Palette, t: number): Palette {
  return {
    cloth: mixHex(a.cloth, b.cloth, t),
    accent: mixHex(a.accent, b.accent, t),
    dark: mixHex(a.dark, b.dark, t),
    skin: a.skin,
    hair: a.hair,
    badge: mixHex(a.badge, b.badge, t),
    visor: t > 0.55 ? b.visor : null,
    pack: t > 0.55,
  };
}

function mixHex(a: string, b: string, t: number): string {
  const pa = rgb(a);
  const pb = rgb(b);
  const c = pa.map((value, index) => Math.round(value + (pb[index] - value) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function rgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function fillRound(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}
