import type { Dir, Look, Rect } from "../types";

export const WALL = 28;

export interface Room {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  floor: string;
  accent: string;
}

export const rooms: Room[] = [
  { id: "reception", label: "RECEPTION", x: 694, y: 1204, w: 760, h: 480, floor: "#314864", accent: "#E8EFF5" },
  { id: "lobby", label: "CENTRAL LOBBY", x: 524, y: 484, w: 1100, h: 720, floor: "#24384F", accent: "#55D5E9" },
  { id: "briefing", label: "MISSION BRIEFING", x: 694, y: 24, w: 760, h: 460, floor: "#2C4260", accent: "#D5DEE8" },
  { id: "comms", label: "COMMUNICATIONS", x: 24, y: 564, w: 500, h: 560, floor: "#1E3C4C", accent: "#55D5E9" },
  { id: "suit", label: "SUIT PREPARATION", x: 1624, y: 564, w: 520, h: 560, floor: "#3A4658", accent: "#F0A84B" },
  { id: "boarding", label: "DEPARTURE", x: 2144, y: 484, w: 620, h: 720, floor: "#1B2C3C", accent: "#F0A84B" },
];

export interface Door {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  axis: "h" | "v";
  accent: string;
  sign: string;
  signAt: { x: number; y: number };
}

export const doors: Door[] = [
  { id: "to-briefing", x: 986, y: 456, w: 176, h: 56, axis: "h", accent: "#D5DEE8", sign: "BRIEFING", signAt: { x: 1188, y: 600 } },
  { id: "to-reception", x: 986, y: 1176, w: 176, h: 56, axis: "h", accent: "#E8EFF5", sign: "RECEPTION", signAt: { x: 1188, y: 1104 } },
  { id: "to-comms", x: 496, y: 756, w: 56, h: 176, axis: "v", accent: "#55D5E9", sign: "COMMUNICATIONS", signAt: { x: 880, y: 810 } },
  { id: "to-suit", x: 1596, y: 756, w: 56, h: 176, axis: "v", accent: "#F0A84B", sign: "SUIT BAY", signAt: { x: 1390, y: 730 } },
  { id: "to-departure", x: 2116, y: 756, w: 56, h: 176, axis: "v", accent: "#F0A84B", sign: "DEPARTURE", signAt: { x: 2040, y: 730 } },
];

export const WORLD = { width: 2800, height: 1720 };

export interface ActorDef {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: Dir;
  look: Look;
  prompt: string;
  interactive: boolean;
  radius: number;
  label: string;
}

export const actorDefs: ActorDef[] = [
  { id: "val", name: "Val Ortiz", x: 860, y: 1520, facing: "down", look: "val", prompt: "E — Talk to Val Ortiz", interactive: true, radius: 78, label: "Val Ortiz" },
  { id: "chen", name: "Dr. Maya Chen", x: 960, y: 230, facing: "down", look: "chen", prompt: "E — Talk to Dr. Chen", interactive: true, radius: 78, label: "Dr. Chen" },
  { id: "patel", name: "Dr. Samir Patel", x: 1260, y: 280, facing: "left", look: "patel", prompt: "E — Talk to Dr. Patel", interactive: true, radius: 80, label: "Dr. Patel" },
  { id: "leo", name: "Leo Voss", x: 240, y: 860, facing: "down", look: "leo", prompt: "E — Talk to Leo Voss", interactive: true, radius: 78, label: "Leo Voss" },
  { id: "nia", name: "Nia Brooks", x: 1920, y: 690, facing: "down", look: "nia", prompt: "E — Talk to Nia Brooks", interactive: true, radius: 78, label: "Nia Brooks" },
  { id: "riley", name: "Riley Morgan", x: 2460, y: 844, facing: "left", look: "riley", prompt: "E — Talk to Riley Morgan", interactive: true, radius: 74, label: "Riley Morgan" },
  { id: "crew-a", name: "Crew", x: 1240, y: 1560, facing: "left", look: "crew", prompt: "", interactive: false, radius: 0, label: "" },
  { id: "crew-b", name: "Crew", x: 900, y: 1100, facing: "right", look: "crew2", prompt: "", interactive: false, radius: 0, label: "" },
];

export interface PropDef {
  id: string;
  kind: "desk" | "console" | "table" | "bench" | "locker" | "moon" | "storage" | "hatch" | "platform" | "seat" | "plant" | "board" | "arch";
  x: number;
  y: number;
  w: number;
  h: number;
  blocks: boolean;
  prompt?: string;
  radius?: number;
  ax?: number;
  ay?: number;
  text?: string;
}

export const props: PropDef[] = [
  { id: "desk", kind: "desk", x: 750, y: 1340, w: 200, h: 68, blocks: true },
  { id: "seat-r1", kind: "seat", x: 760, y: 1592, w: 64, h: 22, blocks: true },
  { id: "seat-r2", kind: "seat", x: 840, y: 1592, w: 64, h: 22, blocks: true },
  { id: "seat-r3", kind: "seat", x: 1288, y: 1592, w: 64, h: 22, blocks: true },
  { id: "seat-r4", kind: "seat", x: 1368, y: 1592, w: 56, h: 22, blocks: true },
  { id: "plant-r1", kind: "plant", x: 748, y: 1248, w: 34, h: 40, blocks: true },
  { id: "plant-r2", kind: "plant", x: 1348, y: 1248, w: 34, h: 40, blocks: true },

  { id: "plant-nw", kind: "plant", x: 600, y: 560, w: 36, h: 42, blocks: true },
  { id: "board-crew", kind: "board", x: 600, y: 980, w: 210, h: 56, blocks: true, text: "CREW BOARD" },
  { id: "seat-nw", kind: "seat", x: 660, y: 640, w: 160, h: 22, blocks: true },
  { id: "plant-ne", kind: "plant", x: 1500, y: 560, w: 36, h: 42, blocks: true },
  { id: "board-window", kind: "board", x: 1280, y: 548, w: 200, h: 56, blocks: true, text: "DEPARTURE WINDOW" },
  { id: "seat-ne", kind: "seat", x: 1280, y: 640, w: 170, h: 22, blocks: true },
  { id: "plant-sw", kind: "plant", x: 600, y: 1088, w: 36, h: 42, blocks: true },
  { id: "seat-sw", kind: "seat", x: 660, y: 1048, w: 170, h: 22, blocks: true },
  { id: "plant-se", kind: "plant", x: 1500, y: 1088, w: 36, h: 42, blocks: true },
  { id: "seat-se", kind: "seat", x: 1280, y: 1048, w: 170, h: 22, blocks: true },

  { id: "moon", kind: "moon", x: 760, y: 78, w: 140, h: 140, blocks: true, prompt: "E — Inspect Display", radius: 90, ax: 830, ay: 250 },
  { id: "table", kind: "table", x: 1100, y: 86, w: 180, h: 60, blocks: true },
  { id: "patel-desk", kind: "console", x: 1188, y: 352, w: 170, h: 50, blocks: true },

  { id: "console-a", kind: "console", x: 80, y: 640, w: 180, h: 54, blocks: true, prompt: "E — Check Console", radius: 74, ax: 170, ay: 730 },
  { id: "console-b", kind: "console", x: 300, y: 640, w: 120, h: 54, blocks: true },
  { id: "radio", kind: "bench", x: 120, y: 990, w: 190, h: 54, blocks: true, prompt: "E — Collect Radio", radius: 78, ax: 215, ay: 950 },

  { id: "locker", kind: "locker", x: 1688, y: 616, w: 72, h: 110, blocks: true },
  { id: "locker-b", kind: "locker", x: 1772, y: 616, w: 72, h: 110, blocks: true },
  { id: "storage", kind: "storage", x: 1960, y: 620, w: 110, h: 86, blocks: true, prompt: "E — Inspect Storage", radius: 74, ax: 2015, ay: 740 },
  { id: "suit", kind: "platform", x: 1780, y: 990, w: 210, h: 50, blocks: false, prompt: "E — Equip Spacesuit", radius: 110, ax: 1885, ay: 960 },

  { id: "bench", kind: "bench", x: 2280, y: 1040, w: 170, h: 44, blocks: true },
  { id: "scanner", kind: "arch", x: 2260, y: 756, w: 150, h: 176, blocks: false },
  { id: "hatch", kind: "hatch", x: 2688, y: 748, w: 46, h: 176, blocks: false, prompt: "E — Board Spacecraft", radius: 78, ax: 2608, ay: 844 },
];

export const RILEY_PATH = [
  { x: 2480, y: 844 },
  { x: 2500, y: 720 },
];

export const BOARD_TARGET = {
  player: { x: 2640, y: 844 },
  riley: { x: 2708, y: 844 },
};

export const PLAYER_SPAWN = { x: 1074, y: 1560 };

export const INTRO_FOCUS = { x: 1074, y: 844 };

export interface Guide {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export const guides: Guide[] = [
  { x1: 1074, y1: 590, x2: 1074, y2: 1100, color: "rgba(232, 239, 245, 0.38)" },
  { x1: 700, y1: 844, x2: 1460, y2: 844, color: "rgba(85, 213, 233, 0.42)" },
  { x1: 2240, y1: 844, x2: 2600, y2: 844, color: "rgba(240, 168, 75, 0.6)" },
];

export function interiors(): Rect[] {
  return rooms.map((room) => ({
    x: room.x + WALL,
    y: room.y + WALL,
    w: room.w - WALL * 2,
    h: room.h - WALL * 2,
  }));
}

export function doorways(): Rect[] {
  return doors.map((door) => ({ x: door.x, y: door.y, w: door.w, h: door.h }));
}

export function walkable(): Rect[] {
  return [...interiors(), ...doorways()];
}

export function obstacles(): Rect[] {
  return props.filter((prop) => prop.blocks).map((prop) => ({ x: prop.x, y: prop.y, w: prop.w, h: prop.h }));
}

export function roomAt(x: number, y: number): Room {
  for (let i = rooms.length - 1; i >= 0; i -= 1) {
    const room = rooms[i];
    if (x >= room.x && y >= room.y && x < room.x + room.w && y < room.y + room.h) return room;
  }
  return rooms[0];
}

export function roomById(id: string): Room {
  const found = rooms.find((room) => room.id === id);
  if (!found) throw new Error(`Missing room ${id}`);
  return found;
}

export function propAnchor(prop: PropDef): { x: number; y: number } {
  return { x: prop.ax ?? prop.x + prop.w / 2, y: prop.ay ?? prop.y + prop.h / 2 };
}
