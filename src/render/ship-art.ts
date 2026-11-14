import { shipDoors, shipProps, shipRooms, type ShipDoor } from "../content/ship";
import type { PropDef, Room } from "../content/world";

export interface ShipPaint {
  time: number;
  focusRoom: string;
  stationsLive: boolean;
}

export function drawShipInterior(ctx: CanvasRenderingContext2D, paint: ShipPaint): void {
  for (const room of shipRooms) drawShell(ctx, room, paint.focusRoom === room.id);
  for (const door of shipDoors) drawOpening(ctx, door);
  drawCockpit(ctx, paint);
  drawAirlock(ctx, paint.time);
  for (const prop of shipProps) drawShipProp(ctx, prop, paint);
}

function drawShell(ctx: CanvasRenderingContext2D, room: Room, focused: boolean): void {
  fillRound(ctx, room.x, room.y, room.w, room.h, 22, "#172433");
  fillRound(ctx, room.x + 12, room.y + 12, room.w - 24, room.h - 24, 16, "#243246");
  fillRound(ctx, room.x + 24, room.y + 24, room.w - 48, room.h - 48, 12, room.floor);
  ctx.save();
  ctx.beginPath();
  ctx.rect(room.x + 28, room.y + 36, room.w - 56, room.h - 72);
  ctx.clip();
  ctx.strokeStyle = "rgba(232, 239, 245, 0.045)";
  ctx.lineWidth = 1;
  for (let gx = room.x; gx < room.x + room.w; gx += 64) {
    ctx.beginPath();
    ctx.moveTo(gx, room.y);
    ctx.lineTo(gx, room.y + room.h);
    ctx.stroke();
  }
  for (let gy = room.y; gy < room.y + room.h; gy += 64) {
    ctx.beginPath();
    ctx.moveTo(room.x, gy);
    ctx.lineTo(room.x + room.w, gy);
    ctx.stroke();
  }
  ctx.restore();
  const glow = ctx.createRadialGradient(room.x + room.w / 2, room.y + room.h * 0.4, 20, room.x + room.w / 2, room.y + room.h * 0.4, room.w * 0.45);
  glow.addColorStop(0, room.id === "cockpit" ? "rgba(85, 213, 233, 0.08)" : "rgba(240, 168, 75, 0.05)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(room.x + 24, room.y + 24, room.w - 48, room.h - 48);
  if (focused) {
    ctx.beginPath();
    ctx.roundRect(room.x + 8, room.y + 8, room.w - 16, room.h - 16, 18);
    ctx.strokeStyle = "rgba(240, 168, 75, 0.55)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  const label = room.label;
  ctx.font = "700 13px Segoe UI, sans-serif";
  const width = Math.min(room.w - 80, ctx.measureText(label).width + 36);
  const x = room.x + 40;
  const y = room.y + room.h - 52;
  fillRound(ctx, x, y, width, 26, 8, "rgba(16, 27, 46, 0.82)");
  ctx.fillStyle = room.accent;
  ctx.fillRect(x, y, 3, 26);
  ctx.fillStyle = "#E8EFF5";
  ctx.textAlign = "center";
  ctx.fillText(label, x + width / 2, y + 18);
}

function drawOpening(ctx: CanvasRenderingContext2D, door: ShipDoor): void {
  ctx.fillStyle = "#314864";
  ctx.fillRect(door.x, door.y, door.w, door.h);
  ctx.fillStyle = "rgba(232, 239, 245, 0.45)";
  ctx.fillRect(door.x - 2, door.y - 4, 8, door.h + 8);
  ctx.fillRect(door.x + door.w - 6, door.y - 4, 8, door.h + 8);
  ctx.fillStyle = door.accent;
  ctx.fillRect(door.x + 12, door.y + door.h / 2 - 2, door.w - 24, 3);
  ctx.font = "700 12px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(door.sign, door.signAt.x, door.signAt.y);
}

function drawCockpit(ctx: CanvasRenderingContext2D, paint: ShipPaint): void {
  const room = shipRooms[0];
  const x = room.x + 70;
  const y = room.y + 36;
  const w = room.w - 140;
  const h = 118;
  fillRound(ctx, x, y, w, h, 18, "#071018");
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + 8, y + 8, w - 16, h - 16, 12);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, "#101B2E");
  sky.addColorStop(1, "#1C3E55");
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 26; i += 1) {
    const sx = x + 16 + ((i * 73 + paint.time * 14) % (w - 32));
    const sy = y + 16 + ((i * 41) % (h - 36));
    ctx.globalAlpha = 0.35 + (Math.sin(paint.time * 1.3 + i) + 1) * 0.2;
    ctx.fillStyle = i % 5 === 0 ? "#55D5E9" : "#E8EFF5";
    ctx.fillRect(sx, sy, i % 4 === 0 ? 2.2 : 1.4, i % 4 === 0 ? 2.2 : 1.4);
  }
  ctx.globalAlpha = 1;
  const moon = ctx.createRadialGradient(x + w * 0.72, y + 46, 4, x + w * 0.72, y + 46, 22);
  moon.addColorStop(0, "#F7FBFF");
  moon.addColorStop(1, "#8B97A6");
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(x + w * 0.72, y + 46, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.roundRect(x + 8, y + 8, w - 16, h - 16, 12);
  ctx.strokeStyle = paint.stationsLive ? "rgba(240, 168, 75, 0.9)" : "rgba(85, 213, 233, 0.7)";
  ctx.lineWidth = 3;
  ctx.stroke();
  const live = paint.stationsLive ? 1 : 0.45;
  for (let lamp = 0; lamp < 8; lamp += 1) {
    const lx = x + 28 + lamp * ((w - 56) / 7);
    const blink = 0.35 + Math.sin(paint.time * 3 + lamp) * 0.25;
    ctx.fillStyle = lamp % 2 === 0 ? `rgba(85, 213, 233, ${blink * live})` : `rgba(240, 168, 75, ${blink * live})`;
    ctx.beginPath();
    ctx.arc(lx, y + h - 8, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = `rgba(85, 213, 233, ${0.35 + live * 0.4})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(room.x + 250, 250);
  ctx.quadraticCurveTo(room.x + room.w / 2, 168, room.x + room.w - 250, 250);
  ctx.stroke();
  ctx.fillStyle = "rgba(232, 239, 245, 0.8)";
  ctx.font = "700 14px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SELENE", room.x + room.w / 2, 330);
}

function drawAirlock(ctx: CanvasRenderingContext2D, time: number): void {
  const room = shipRooms[2];
  const x = room.x + room.w / 2 - 36;
  const y = room.y + room.h - 46;
  fillRound(ctx, x, y, 72, 28, 8, "#101820");
  ctx.strokeStyle = "#55D5E9";
  ctx.lineWidth = 3;
  ctx.stroke();
  const blink = 0.4 + Math.sin(time * 4) * 0.35;
  ctx.fillStyle = `rgba(240, 168, 75, ${blink})`;
  ctx.beginPath();
  ctx.arc(x + 36, y + 10, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(240, 168, 75, 0.45)";
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(room.x + room.w / 2, room.y + 40);
  ctx.lineTo(room.x + room.w / 2, room.y + room.h - 70);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawShipProp(ctx: CanvasRenderingContext2D, prop: PropDef, paint: ShipPaint): void {
  if (prop.id === "window-ledge") return;
  if (prop.kind === "seat") {
    fillRound(ctx, prop.x, prop.y + 8, prop.w, prop.h, 10, "#1C3044");
    fillRound(ctx, prop.x + 8, prop.y, prop.w - 16, prop.h, 8, prop.id === "pilot-seat" ? "#3E5674" : "#314864");
    ctx.fillStyle = paint.stationsLive ? "#F0A84B" : "#55D5E9";
    ctx.fillRect(prop.x + 16, prop.y + 8, prop.w - 32, 3);
    return;
  }
  if (prop.kind !== "console") return;
  const live = paint.stationsLive ? 1 : 0.7;
  fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 10, "#101B2E");
  const screen = ctx.createLinearGradient(prop.x, prop.y, prop.x, prop.y + prop.h);
  screen.addColorStop(0, `rgba(85, 213, 233, ${0.45 * live})`);
  screen.addColorStop(1, "rgba(85, 213, 233, 0.05)");
  ctx.fillStyle = screen;
  ctx.fillRect(prop.x + 10, prop.y + 8, prop.w - 20, prop.h - 18);
  const bars = 6;
  for (let i = 0; i < bars; i += 1) {
    const height = 6 + (Math.sin(paint.time * (paint.stationsLive ? 4 : 2) + i + prop.x * 0.01) + 1) * (paint.stationsLive ? 8 : 5);
    ctx.fillStyle = i % 2 === 0 ? "#55D5E9" : "#F0A84B";
    ctx.globalAlpha = 0.85;
    ctx.fillRect(prop.x + 16 + i * 28, prop.y + prop.h - 16 - height, 10, height);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = paint.stationsLive ? "#F0A84B" : "#55D5E9";
  ctx.beginPath();
  ctx.arc(prop.x + prop.w - 14, prop.y + 12, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function fillRound(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}
