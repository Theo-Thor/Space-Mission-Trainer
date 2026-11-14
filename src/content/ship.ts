import type { Rect } from "../types";
import type { PropDef, Room } from "./world";

const WALL = 28;

export const SHIP_WORLD = { width: 1280, height: 980 };

export const shipRooms: Room[] = [
  { id: "cockpit", label: "COCKPIT", x: 140, y: 24, w: 1000, h: 520, floor: "#1B3144", accent: "#55D5E9" },
  { id: "access", label: "ACCESS", x: 490, y: 544, w: 300, h: 200, floor: "#243246", accent: "#7DCEC6" },
  { id: "airlock", label: "AIRLOCK", x: 340, y: 744, w: 600, h: 210, floor: "#1A2838", accent: "#F0A84B" },
];

export interface ShipDoor {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  sign: string;
  signAt: { x: number; y: number };
  accent: string;
}

export const shipDoors: ShipDoor[] = [
  { id: "ship-to-cockpit", x: 552, y: 516, w: 176, h: 56, sign: "COCKPIT", signAt: { x: 760, y: 640 }, accent: "#55D5E9" },
  { id: "ship-to-airlock", x: 552, y: 716, w: 176, h: 56, sign: "AIRLOCK", signAt: { x: 430, y: 820 }, accent: "#F0A84B" },
];

export const shipProps: PropDef[] = [
  { id: "window-ledge", kind: "bench", x: 200, y: 68, w: 880, h: 124, blocks: true },
  { id: "flight-console", kind: "console", x: 220, y: 196, w: 200, h: 52, blocks: true, prompt: "E — Check Flight Systems", radius: 86, ax: 320, ay: 292 },
  { id: "comms-console", kind: "console", x: 860, y: 196, w: 200, h: 52, blocks: true, prompt: "E — Verify Communications", radius: 86, ax: 960, ay: 292 },
  { id: "pilot-seat", kind: "seat", x: 460, y: 356, w: 84, h: 30, blocks: false, prompt: "E — Take Seat", radius: 86, ax: 502, ay: 448 },
  { id: "riley-seat", kind: "seat", x: 736, y: 356, w: 84, h: 30, blocks: false },
];

export const SHIP_SPAWN = { x: 680, y: 890 };
export const RILEY_SPAWN = { x: 600, y: 850 };
export const PILOT_SEAT = { x: 502, y: 372 };
export const RILEY_SEAT = { x: 778, y: 372 };
export const SHIP_LOOK = { x: 640, y: 280 };

export const RILEY_ENTER = [
  { x: 640, y: 760 },
  { x: 640, y: 690 },
  { x: 640, y: 640 },
];

export const RILEY_SEAT_PATH = [
  { x: 640, y: 560 },
  { x: 720, y: 460 },
  { x: 778, y: 372 },
];

function interiors(): Rect[] {
  return shipRooms.map((room) => ({
    x: room.x + WALL,
    y: room.y + WALL,
    w: room.w - WALL * 2,
    h: room.h - WALL * 2,
  }));
}

export function shipWalkable(): Rect[] {
  return [...interiors(), ...shipDoors.map((door) => ({ x: door.x, y: door.y, w: door.w, h: door.h }))];
}

export function shipObstacles(): Rect[] {
  return shipProps.filter((prop) => prop.blocks).map((prop) => ({ x: prop.x, y: prop.y, w: prop.w, h: prop.h }));
}

export function shipRoomAt(x: number, y: number): Room {
  for (let i = shipRooms.length - 1; i >= 0; i -= 1) {
    const room = shipRooms[i];
    if (x >= room.x && y >= room.y && x < room.x + room.w && y < room.y + room.h) return room;
  }
  return shipRooms[2];
}
