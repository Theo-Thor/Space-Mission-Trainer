import { shipDoors, shipRooms, type ShipDoor } from "../content/ship";
import type { PropDef, Room } from "../content/world";

export interface ShipPaint {
  time: number;
  focusRoom: string;
  stationsLive: boolean;
}

const surfaces = new Map<string, HTMLCanvasElement>();

export function drawShipScenery(ctx: CanvasRenderingContext2D, paint: ShipPaint): void {
  for (const room of shipRooms) {
    let surface = surfaces.get(room.id);
    if (!surface) {
      surface = bakeRoom(room);
      surfaces.set(room.id, surface);
    }
    ctx.drawImage(surface, room.x, room.y);
  }
  drawWindow(ctx, paint);
  drawDashboard(ctx, paint);
  for (const door of shipDoors) drawDoor(ctx, door);
  drawHatch(ctx);
}

export function drawShipFurnishing(ctx: CanvasRenderingContext2D, prop: PropDef, paint: ShipPaint): void {
  if (prop.kind === "seat") drawCouch(ctx, prop, paint.stationsLive);
}

function bakeRoom(room: Room): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = room.w;
  canvas.height = room.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = "#101c2a";
  ctx.beginPath();
  ctx.roundRect(0, 0, room.w, room.h, 16);
  ctx.fill();
  if (room.id === "cockpit") bakeCockpit(ctx, room);
  if (room.id === "access") bakeAccess(ctx, room);
  if (room.id === "airlock") bakeAirlock(ctx, room);
  return canvas;
}

function bakeCockpit(ctx: CanvasRenderingContext2D, room: Room): void {
  ctx.fillStyle = "#102433";
  ctx.fillRect(28, 28, room.w - 56, 148);
  const plates = [
    [28, 176, room.w - 56, 116, "#1a3a4e"],
    [28, 292, room.w - 56, 108, "#173648"],
    [28, 400, room.w - 56, room.h - 428, "#143244"],
  ] as const;
  for (const [x, y, w, h, color] of plates) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }
  ctx.strokeStyle = "rgba(8, 16, 26, 0.35)";
  ctx.lineWidth = 2;
  for (const y of [176, 292, 400]) {
    ctx.beginPath();
    ctx.moveTo(28, y);
    ctx.lineTo(room.w - 28, y);
    ctx.stroke();
  }
}

function bakeAccess(ctx: CanvasRenderingContext2D, room: Room): void {
  ctx.fillStyle = "#1a3344";
  ctx.fillRect(28, 28, room.w - 56, room.h - 56);
  ctx.strokeStyle = "#6d8798";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(40, 40);
  ctx.lineTo(40, room.h - 40);
  ctx.moveTo(room.w - 40, 40);
  ctx.lineTo(room.w - 40, room.h - 40);
  ctx.stroke();
}

function bakeAirlock(ctx: CanvasRenderingContext2D, room: Room): void {
  ctx.fillStyle = "#162c3c";
  ctx.fillRect(28, 28, room.w - 56, room.h - 56);
  ctx.strokeStyle = "rgba(240, 168, 75, 0.4)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 12]);
  ctx.beginPath();
  ctx.moveTo(room.w / 2, room.h * 0.42);
  ctx.lineTo(room.w / 2, room.h - 70);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawWindow(ctx: CanvasRenderingContext2D, paint: ShipPaint): void {
  const room = shipRooms[0];
  const x = room.x + 78;
  const y = room.y + 40;
  const w = room.w - 156;
  const h = 108;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + 8, y + 8, w - 16, h - 16, 10);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, "#07111c");
  sky.addColorStop(1, "#1a455c");
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 24; i += 1) {
    const sx = x + 18 + ((i * 73 + paint.time * 12) % (w - 36));
    const sy = y + 16 + ((i * 41) % (h - 32));
    ctx.globalAlpha = 0.3 + (Math.sin(paint.time * 1.2 + i) + 1) * 0.18;
    ctx.fillStyle = i % 6 === 0 ? "#55D5E9" : "#E8EFF5";
    ctx.fillRect(sx, sy, 1.6, 1.6);
  }
  ctx.globalAlpha = 1;
  const moon = ctx.createRadialGradient(x + w * 0.72, y + 42, 3, x + w * 0.72, y + 42, 20);
  moon.addColorStop(0, "#F7FBFF");
  moon.addColorStop(1, "#8B97A6");
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(x + w * 0.72, y + 42, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 5;
  ctx.strokeStyle = paint.stationsLive ? "#e0b06a" : "#c5d2de";
  ctx.beginPath();
  ctx.roundRect(x + 6, y + 6, w - 12, h - 12, 12);
  ctx.stroke();
}

function drawDashboard(ctx: CanvasRenderingContext2D, paint: ShipPaint): void {
  const x = 210;
  const y = 188;
  const w = 870;
  const h = 64;
  ctx.fillStyle = "rgba(4, 12, 20, 0.28)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h - 2, w * 0.46, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  fillRound(ctx, x, y, w, h, 8, "#152838");
  fillRound(ctx, x + 8, y + 8, w - 16, 28, 4, "#0d1c28");
  screen(ctx, 248, y + 14, 150, 18, paint);
  screen(ctx, 888, y + 14, 150, 18, paint);
  ctx.fillStyle = paint.stationsLive ? "#F0A84B" : "#55D5E9";
  ctx.beginPath();
  ctx.arc(x + w / 2, y + 46, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function screen(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, paint: ShipPaint): void {
  ctx.fillStyle = paint.stationsLive ? "rgba(240, 168, 75, 0.35)" : "rgba(85, 213, 233, 0.28)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(232, 239, 245, 0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function drawCouch(ctx: CanvasRenderingContext2D, prop: PropDef, live: boolean): void {
  ctx.fillStyle = "rgba(4, 12, 20, 0.25)";
  ctx.beginPath();
  ctx.ellipse(prop.x + prop.w / 2, prop.y + prop.h, prop.w * 0.42, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  fillRound(ctx, prop.x + 10, prop.y - 12, prop.w - 20, 16, 4, "#1a2c3c");
  fillRound(ctx, prop.x, prop.y + 4, prop.w, prop.h - 2, 6, prop.id === "pilot-seat" ? "#2c4a62" : "#243e52");
  ctx.fillStyle = live ? "#F0A84B" : "#7dcec6";
  ctx.fillRect(prop.x + 16, prop.y + 10, prop.w - 32, 3);
}

function drawDoor(ctx: CanvasRenderingContext2D, door: ShipDoor): void {
  const mid = door.y + door.h / 2;
  const north = door.id === "ship-to-cockpit" ? "#143244" : "#1a3344";
  const south = door.id === "ship-to-cockpit" ? "#1a3344" : "#162c3c";
  ctx.fillStyle = north;
  ctx.fillRect(door.x, door.y, door.w, door.h / 2);
  ctx.fillStyle = south;
  ctx.fillRect(door.x, mid, door.w, door.h / 2);
  ctx.fillStyle = "#8ea3b4";
  ctx.fillRect(door.x + 8, mid - 1, door.w - 16, 2);
  ctx.fillStyle = door.accent;
  ctx.font = "700 12px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(door.sign, door.signAt.x, door.signAt.y);
}

function drawHatch(ctx: CanvasRenderingContext2D): void {
  const room = shipRooms[2];
  const x = room.x + room.w / 2;
  const y = room.y + room.h - 24;
  ctx.fillStyle = "#0e1c28";
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c5d2de";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = "rgba(240, 168, 75, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.stroke();
}

function fillRound(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}
